import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const getEnv = (name: string) => {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
};

Deno.serve(async (req) => {
  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------------------------------
    // Only POST is allowed
    // --------------------------------------------------------

    if (req.method !== 'POST') {
      return json(
        {
          message: 'Method not allowed',
        },
        405
      );
    }

    // --------------------------------------------------------
    // Environment variables
    // --------------------------------------------------------

    const supabaseUrl = getEnv('SUPABASE_URL');

    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') || '';

    const serviceRoleKey =
      getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!anonKey) {
      throw new Error(
        'SUPABASE_ANON_KEY is missing from Edge Function environment.'
      );
    }

    // --------------------------------------------------------
    // Authentication
    // --------------------------------------------------------

    const authHeader =
      req.headers.get('Authorization');

    if (!authHeader) {
      return json(
        {
          message: 'Authentication required',
        },
        401
      );
    }

    // User-scoped client
    const supabaseUser = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return json(
        {
          message: 'Invalid session',
        },
        401
      );
    }

    // --------------------------------------------------------
    // Admin/service-role client
    // --------------------------------------------------------

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // --------------------------------------------------------
    // Request body
    // --------------------------------------------------------

    const body = await req.json();

    const dueId =
      String(body?.due_id || '');

    const requestedAmount =
      Number(body?.amount);

    const paymentMethod =
      String(
        body?.payment_method ||
          'sslcommerz'
      ).toLowerCase();

    // --------------------------------------------------------
    // Validate input
    // --------------------------------------------------------

    if (
      !dueId ||
      !Number.isFinite(requestedAmount)
    ) {
      return json(
        {
          message:
            'due_id and amount are required',
        },
        400
      );
    }

    const amount =
      Number(
        requestedAmount.toFixed(2)
      );

    // Minimum payment
    if (amount < 10) {
      return json(
        {
          message:
            'Minimum payment is BDT 10.00.',
        },
        400
      );
    }

    // --------------------------------------------------------
    // Validate payment method
    // --------------------------------------------------------

    const allowedPaymentMethods = [
      'sslcommerz',
      'bkash',
      'nagad',
      'bank_transfer',
      'cash',
      'other',
    ];

    if (
      !allowedPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return json(
        {
          message:
            'Invalid payment method.',
        },
        400
      );
    }

    // --------------------------------------------------------
    // Get member profile
    // --------------------------------------------------------

    const {
      data: member,
      error: memberError,
    } =
      await supabaseAdmin
        .from('members')
        .select(
          'id,hostel_id,name,email,auth_id'
        )
        .eq('auth_id', user.id)
        .maybeSingle();

    if (memberError) {
      throw memberError;
    }

    if (!member) {
      return json(
        {
          message:
            'Member profile not found.',
        },
        403
      );
    }

    // --------------------------------------------------------
    // Get member due
    // --------------------------------------------------------

    const {
      data: due,
      error: dueError,
    } =
      await supabaseAdmin
        .from('member_dues')
        .select(
          `
          id,
          member_id,
          hostel_id,
          total_due,
          paid_amount,
          remaining_due,
          balance,
          advance_amount,
          status
          `
        )
        .eq('id', dueId)
        .eq('member_id', member.id)
        .maybeSingle();

    if (dueError) {
      throw dueError;
    }

    if (!due) {
      return json(
        {
          message:
            'Due record not found.',
        },
        404
      );
    }

    // --------------------------------------------------------
    // Current outstanding amount
    // --------------------------------------------------------

    const remaining =
      Number(
        due.remaining_due || 0
      );

    // If the due already has no outstanding amount,
    // don't create another SSLCommerz payment.
    //
    // IMPORTANT:
    // Payment above the due is allowed ONLY when
    // there is an actual outstanding due.
    if (remaining <= 0) {
      return json(
        {
          message:
            'This due is already fully paid or has an advance balance.',
        },
        400
      );
    }

    // --------------------------------------------------------
    // IMPORTANT:
    //
    // Do NOT reject amount > remaining.
    //
    // Example:
    //
    // Remaining due = BDT 1,000
    // User pays     = BDT 1,500
    //
    // After verification:
    // Balance = -500
    // Advance = 500
    //
    // Therefore overpayment is intentionally allowed.
    // --------------------------------------------------------

    // --------------------------------------------------------
    // Create transaction ID
    // --------------------------------------------------------

    const transactionId =
      `MESS_${Date.now()}_${crypto
        .randomUUID()
        .replaceAll('-', '')
        .slice(0, 12)}`;

    // --------------------------------------------------------
    // Create pending payment transaction
    // --------------------------------------------------------

    const {
      error: insertError,
    } =
      await supabaseAdmin
        .from('payment_transactions')
        .insert({
          member_id: member.id,
          hostel_id: member.hostel_id,
          due_id: due.id,
          amount,
          currency: 'BDT',
          payment_method: paymentMethod,
          provider: 'sslcommerz',
          transaction_id: transactionId,
          status: 'pending',
        });

    if (insertError) {
      throw insertError;
    }

    // --------------------------------------------------------
    // SSLCommerz configuration
    // --------------------------------------------------------

    const sandbox =
      (
        Deno.env.get(
          'SSLCOMMERZ_SANDBOX'
        ) || 'true'
      ).toLowerCase() === 'true';

    const apiUrl = sandbox
      ? 'https://sandbox-gw.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

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

    const functionBase =
      `${supabaseUrl.replace(
        /\/$/,
        ''
      )}/functions/v1/sslcommerz-callback`;

    // --------------------------------------------------------
    // SSLCommerz form
    // --------------------------------------------------------

    const form =
      new URLSearchParams();

    form.set(
      'store_id',
      storeId
    );

    form.set(
      'store_passwd',
      storePassword
    );

    form.set(
      'total_amount',
      amount.toFixed(2)
    );

    form.set(
      'currency',
      'BDT'
    );

    form.set(
      'tran_id',
      transactionId
    );

    // --------------------------------------------------------
    // Callback URLs
    // --------------------------------------------------------

    form.set(
      'success_url',
      `${functionBase}?type=success`
    );

    form.set(
      'fail_url',
      `${functionBase}?type=fail`
    );

    form.set(
      'cancel_url',
      `${functionBase}?type=cancel`
    );

    form.set(
      'ipn_url',
      `${functionBase}?type=ipn`
    );

    // --------------------------------------------------------
    // Customer information
    // --------------------------------------------------------

    form.set(
      'cus_name',
      member.name
    );

    form.set(
      'cus_email',
      member.email
    );

    form.set(
      'cus_add1',
      'Hostel Member'
    );

    form.set(
      'cus_city',
      'Dhaka'
    );

    form.set(
      'cus_postcode',
      '1200'
    );

    form.set(
      'cus_country',
      'Bangladesh'
    );

    form.set(
      'cus_phone',
      '01700000000'
    );

    // --------------------------------------------------------
    // Product information
    // --------------------------------------------------------

    form.set(
      'shipping_method',
      'NO'
    );

    form.set(
      'product_name',
      `Mess dues payment - ${transactionId}`
    );

    form.set(
      'product_category',
      'Mess Fee'
    );

    form.set(
      'product_profile',
      'general'
    );

    // --------------------------------------------------------
    // Send request to SSLCommerz
    // --------------------------------------------------------

    const gatewayResponse =
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

    // --------------------------------------------------------
    // Gateway HTTP error
    // --------------------------------------------------------

    if (!gatewayResponse.ok) {
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'failed',
          gateway_response: {
            http_status:
              gatewayResponse.status,
          },
        })
        .eq(
          'transaction_id',
          transactionId
        );

      throw new Error(
        `SSLCOMMERZ returned HTTP ${gatewayResponse.status}.`
      );
    }

    // --------------------------------------------------------
    // Parse gateway response
    // --------------------------------------------------------

    const gateway =
      await gatewayResponse.json();

    // --------------------------------------------------------
    // Gateway failed
    // --------------------------------------------------------

    if (
      !gateway?.GatewayPageURL
    ) {
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'failed',
          gateway_response:
            gateway,
        })
        .eq(
          'transaction_id',
          transactionId
        );

      return json(
        {
          message:
            gateway?.failedreason ||
            'SSLCOMMERZ could not create a payment session.',
        },
        502
      );
    }

    // --------------------------------------------------------
    // Save gateway response
    // --------------------------------------------------------

    await supabaseAdmin
      .from('payment_transactions')
      .update({
        gateway_response:
          gateway,
      })
      .eq(
        'transaction_id',
        transactionId
      );

    // --------------------------------------------------------
    // Return payment URL
    // --------------------------------------------------------

    return json({
      gateway_url:
        gateway.GatewayPageURL,

      transaction_id:
        transactionId,

      amount,

      payment_method:
        paymentMethod,

      site_url:
        siteUrl,
    });

  } catch (error) {
    console.error(
      'Create payment error:',
      error
    );

    return json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected payment error.',
      },
      500
    );
  }
});