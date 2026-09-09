import { createClient } from 'npm:@supabase/supabase-js@2';

const getEnv = (name: string) => {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
};

const redirectTo = (
  siteUrl: string,
  status: string,
  tranId: string
) => {
  const url = new URL('/payments', siteUrl);

  url.searchParams.set(
    'payment',
    status
  );

  if (tranId) {
    url.searchParams.set(
      'tran_id',
      tranId
    );
  }

  return Response.redirect(
    url.toString(),
    303
  );
};

async function readParams(req: Request) {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    return Object.fromEntries(
      url.searchParams.entries()
    );
  }

  const contentType =
    req.headers.get('content-type') || '';

  if (
    contentType.includes(
      'application/json'
    )
  ) {
    return await req.json();
  }

  const text =
    await req.text();

  return Object.fromEntries(
    new URLSearchParams(text).entries()
  );
}

Deno.serve(async (req) => {
  try {
    // --------------------------------------------------------
    // Environment variables
    // --------------------------------------------------------

    const supabaseUrl =
      getEnv('SUPABASE_URL');

    const serviceRoleKey =
      getEnv(
        'SUPABASE_SERVICE_ROLE_KEY'
      );

    const storeId =
      getEnv(
        'SSLCOMMERZ_STORE_ID'
      );

    const storePassword =
      getEnv(
        'SSLCOMMERZ_STORE_PASSWORD'
      );

    const siteUrl =
      getEnv('SITE_URL')
        .replace(/\/$/, '');

    // --------------------------------------------------------
    // Supabase admin client
    // --------------------------------------------------------

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    // --------------------------------------------------------
    // Read SSLCommerz callback data
    // --------------------------------------------------------

    const params =
      await readParams(req);

    const requestType =
      new URL(req.url)
        .searchParams
        .get('type') ||
      'success';

    const tranId =
      String(
        params.tran_id || ''
      );

    if (!tranId) {
      return new Response(
        'Missing transaction ID',
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // Find payment transaction
    // --------------------------------------------------------

    const {
      data: payment,
      error: paymentError,
    } =
      await supabaseAdmin
        .from(
          'payment_transactions'
        )
        .select('*')
        .eq(
          'transaction_id',
          tranId
        )
        .maybeSingle();

    if (paymentError) {
      throw paymentError;
    }

    if (!payment) {
      return new Response(
        'Transaction not found',
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // FAIL
    // --------------------------------------------------------

    if (
      requestType === 'fail'
    ) {
      await supabaseAdmin
        .from(
          'payment_transactions'
        )
        .update({
          status: 'failed',
          gateway_response:
            params,
        })
        .eq(
          'id',
          payment.id
        );

      return redirectTo(
        siteUrl,
        'failed',
        tranId
      );
    }

    // --------------------------------------------------------
    // CANCEL
    // --------------------------------------------------------

    if (
      requestType === 'cancel'
    ) {
      await supabaseAdmin
        .from(
          'payment_transactions'
        )
        .update({
          status: 'cancelled',
          gateway_response:
            params,
        })
        .eq(
          'id',
          payment.id
        );

      return redirectTo(
        siteUrl,
        'cancelled',
        tranId
      );
    }

    // --------------------------------------------------------
    // SSLCommerz validation ID
    // --------------------------------------------------------

    const valId =
      String(
        params.val_id || ''
      );

    if (!valId) {
      if (
        requestType === 'ipn'
      ) {
        return new Response(
          'Missing val_id',
          {
            status: 400,
          }
        );
      }

      return redirectTo(
        siteUrl,
        'failed',
        tranId
      );
    }

    // --------------------------------------------------------
    // SSLCommerz validation endpoint
    // --------------------------------------------------------

    const sandbox =
      (
        Deno.env.get(
          'SSLCOMMERZ_SANDBOX'
        ) || 'true'
      ).toLowerCase() === 'true';

    const validationBase =
      sandbox
        ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
        : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

    const validationUrl =
      new URL(
        validationBase
      );

    validationUrl.searchParams.set(
      'val_id',
      valId
    );

    validationUrl.searchParams.set(
      'store_id',
      storeId
    );

    validationUrl.searchParams.set(
      'store_passwd',
      storePassword
    );

    validationUrl.searchParams.set(
      'format',
      'json'
    );

    // --------------------------------------------------------
    // Validate transaction with SSLCommerz
    // --------------------------------------------------------

    const validationResponse =
      await fetch(
        validationUrl.toString()
      );

    if (
      !validationResponse.ok
    ) {
      if (
        requestType === 'ipn'
      ) {
        return new Response(
          'Gateway validation request failed',
          {
            status: 502,
          }
        );
      }

      return redirectTo(
        siteUrl,
        'failed',
        tranId
      );
    }

    const validation =
      await validationResponse.json();

    // --------------------------------------------------------
    // Validate all important payment data
    // --------------------------------------------------------

    const returnedAmount =
      Number(
        validation.amount
      );

    const expectedAmount =
      Number(
        payment.amount
      );

    const validStatus =
      validation.status ===
        'VALID' ||
      validation.status ===
        'VALIDATED';

    const validTransaction =
      validation.tran_id ===
      payment.transaction_id;

    const validAmount =
      Math.abs(
        returnedAmount -
          expectedAmount
      ) < 0.001;

    const validCurrency =
      String(
        validation.currency ||
          ''
      ).toUpperCase() ===
      'BDT';

    const safeRisk =
      String(
        validation.risk_level ??
          '0'
      ) === '0';

    // --------------------------------------------------------
    // Invalid payment
    // --------------------------------------------------------

    if (
      !validStatus ||
      !validTransaction ||
      !validAmount ||
      !validCurrency ||
      !safeRisk
    ) {
      await supabaseAdmin
        .from(
          'payment_transactions'
        )
        .update({
          status: 'pending',

          validation_id:
            valId,

          gateway_transaction_id:
            validation.bank_tran_id ||
            null,

          gateway_response:
            validation,
        })
        .eq(
          'id',
          payment.id
        );

      if (
        requestType === 'ipn'
      ) {
        return new Response(
          'Payment received but not verified',
          {
            status: 200,
          }
        );
      }

      return redirectTo(
        siteUrl,
        'failed',
        tranId
      );
    }

    // --------------------------------------------------------
    // VALID PAYMENT
    // --------------------------------------------------------

    await supabaseAdmin
      .from(
        'payment_transactions'
      )
      .update({
        status: 'paid',

        validation_id:
          valId,

        gateway_transaction_id:
          validation.bank_tran_id ||
          null,

        gateway_response:
          validation,

        paid_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        payment.id
      );

    // --------------------------------------------------------
    // IPN response
    // --------------------------------------------------------

    if (
      requestType === 'ipn'
    ) {
      return new Response(
        'OK',
        {
          status: 200,
        }
      );
    }

    // --------------------------------------------------------
    // Redirect member to payment page
    // --------------------------------------------------------

    return redirectTo(
      siteUrl,
      'success',
      tranId
    );

  } catch (error) {
    console.error(
      'SSLCommerz callback error:',
      error
    );

    return new Response(
      error instanceof Error
        ? error.message
        : 'Callback error',
      {
        status: 500,
      }
    );
  }
});