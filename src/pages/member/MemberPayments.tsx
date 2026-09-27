import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Clock3,
} from 'lucide-react';

import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const money = (v: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const month = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-01`;
};

type Message = {
  type: 'success' | 'error' | 'info';
  text: string;
};

export default function MemberPayments() {
  const { profile } = useAuth();

  const [due, setDue] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');

  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const [pendingPayment, setPendingPayment] =
    useState<any>(null);

  const [message, setMessage] =
    useState<Message | null>(null);

  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem('memberTheme') !== 'light'
  );

  const currentMonth = month();

  // =========================================================
  // Theme listener
  // =========================================================

  useEffect(() => {
    const id = setInterval(() => {
      setIsDark(
        localStorage.getItem('memberTheme') !== 'light'
      );
    }, 100);

    return () => clearInterval(id);
  }, []);

  // =========================================================
  // Load payment information
  // =========================================================

  useEffect(() => {
    if (profile) {
      load();
    }
  }, [profile]);

  async function load() {
    try {
      setLoading(true);
      setMessage(null);

      const memberId = (profile as any)?.id;

      if (!memberId) {
        throw new Error(
          'Member profile not found.'
        );
      }

      // -------------------------------------------------------
      // Generate/update current month's due
      // -------------------------------------------------------

      const {
        error: generateError,
      } = await supabase.rpc(
        'generate_member_due',
        {
          p_member_id: memberId,
          p_billing_month: currentMonth,
          p_other_charge: null,
        }
      );

      if (generateError) {
        throw generateError;
      }

      // -------------------------------------------------------
      // Load due
      // -------------------------------------------------------

      const {
        data: dueData,
        error: dueError,
      } = await supabase
        .from('member_payment_summary')
        .select('*')
        .eq('member_id', memberId)
        .eq('billing_month', currentMonth)
        .maybeSingle();

      if (dueError) {
        throw dueError;
      }

      // -------------------------------------------------------
      // Load payment history
      // -------------------------------------------------------

      const {
        data: paymentData,
        error: paymentError,
      } = await supabase
        .from('payment_transactions')
        .select(
          `
          id,
          amount,
          payment_method,
          provider,
          transaction_id,
          status,
          paid_at,
          created_at,
          notes,
          due_id
          `
        )
        .eq('member_id', memberId)
        .order('created_at', {
          ascending: false,
        });

      if (paymentError) {
        throw paymentError;
      }

      const allPayments = paymentData || [];

      setDue(dueData);
      setPayments(allPayments);

      // -------------------------------------------------------
      // IMPORTANT:
      // Check whether current due already has a pending payment
      // -------------------------------------------------------

      const currentDueId = dueData?.id;

      const pending = currentDueId
        ? allPayments.find(
            (payment) =>
              payment.due_id === currentDueId &&
              payment.status === 'pending'
          )
        : null;

      setPendingPayment(pending || null);

      // -------------------------------------------------------
      // Amount handling
      // -------------------------------------------------------

      if (pending) {
        // Payment already submitted.
        // DO NOT allow another amount.
        setAmount('');
      } else if (dueData) {
        const balance = Number(
          dueData.balance || 0
        );

        if (balance > 0) {
          setAmount(
            balance.toFixed(2)
          );
        } else {
          setAmount('');
        }
      }
    } catch (e: any) {
      setMessage({
        type: 'error',
        text:
          e?.message ||
          'Could not load payment information.',
      });
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // Submit payment
  // =========================================================

  async function submitPayment() {
    // -------------------------------------------------------
    // HARD FRONTEND BLOCK
    // -------------------------------------------------------

    if (pendingPayment) {
      setMessage({
        type: 'info',
        text:
          'You already have a pending payment request. Please wait until the admin accepts or rejects it.',
      });

      return;
    }

    const n = Number(amount);

    // -------------------------------------------------------
    // Validate amount
    // -------------------------------------------------------

    if (
      !Number.isFinite(n) ||
      n < 10
    ) {
      setMessage({
        type: 'error',
        text:
          'Minimum payment is BDT 10.',
      });

      return;
    }

    if (!profile) {
      setMessage({
        type: 'error',
        text:
          'Member profile not found.',
      });

      return;
    }

    try {
      setPaying(true);
      setMessage(null);

      const memberId =
        (profile as any).id;

      const hostelId =
        (profile as any).hostel_id;

      if (!memberId || !hostelId) {
        throw new Error(
          'Member account information is incomplete.'
        );
      }

      if (!due?.id) {
        throw new Error(
          'Current due record was not found.'
        );
      }

      // -------------------------------------------------------
      // SECOND CHECK FROM DATABASE
      //
      // This protects against:
      //
      // - double click
      // - multiple browser tabs
      // - another request submitted simultaneously
      // -------------------------------------------------------

      const {
        data: existingPending,
        error: pendingError,
      } = await supabase
        .from('payment_transactions')
        .select(
          `
          id,
          amount,
          status,
          created_at,
          due_id
          `
        )
        .eq('member_id', memberId)
        .eq('due_id', due.id)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (pendingError) {
        throw pendingError;
      }

      if (existingPending) {
        setPendingPayment(
          existingPending
        );

        setAmount('');

        setMessage({
          type: 'info',
          text:
            'A payment request is already pending. Please wait for admin verification.',
        });

        return;
      }

      // -------------------------------------------------------
      // Generate transaction ID
      // -------------------------------------------------------

      const transactionId =
        `MAN-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;

      // -------------------------------------------------------
      // Insert payment
      // -------------------------------------------------------

      const {
        data: insertedPayment,
        error,
      } = await supabase
        .from('payment_transactions')
        .insert({
          member_id: memberId,
          hostel_id: hostelId,
          due_id: due.id,
          amount: Number(
            n.toFixed(2)
          ),
          currency: 'BDT',
          payment_method: method,
          provider: method,
          transaction_id:
            transactionId,
          status: 'pending',
          notes:
            'Manual payment submitted by member',
        })
        .select(
          `
          id,
          amount,
          status,
          created_at,
          due_id
          `
        )
        .single();

      // -------------------------------------------------------
      // Database unique index can reject duplicate pending
      // payment even if two requests arrive simultaneously.
      // -------------------------------------------------------

      if (error) {
        // PostgreSQL unique violation
        if (
          error.code === '23505'
        ) {
          setMessage({
            type: 'info',
            text:
              'A payment request is already pending for this due. Please wait for admin verification.',
          });

          await load();

          return;
        }

        throw error;
      }

      // -------------------------------------------------------
      // Lock payment form immediately
      // -------------------------------------------------------

      setPendingPayment(
        insertedPayment
      );

      setAmount('');

      setMessage({
        type: 'success',
        text:
          'Payment request submitted successfully. You cannot submit another payment until admin accepts or rejects this request.',
      });

      await load();
    } catch (e: any) {
      setMessage({
        type: 'error',
        text:
          e?.message ||
          'Could not submit payment request.',
      });
    } finally {
      setPaying(false);
    }
  }

  // =========================================================
  // Loading
  // =========================================================

  if (loading) {
    return (
      <MemberLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </MemberLayout>
    );
  }

  // =========================================================
  // Current balance
  // =========================================================

  const balance = Number(
    due?.balance || 0
  );

  const totalDue = Number(
    due?.total_due || 0
  );

  const paidAmount = Number(
    due?.paid_amount || 0
  );

  const advanceAmount = Number(
    due?.advance_amount || 0
  );

  return (
    <MemberLayout>
      <div className="w-full max-w-6xl mx-auto">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-end justify-between gap-4 mb-8">

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Finance
            </p>

            <h1
              className={`text-3xl sm:text-4xl font-extrabold mt-1 ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              My Payments
            </h1>

            <p className="text-sm mt-2 text-slate-500">
              Submit a payment and wait for
              admin verification.
            </p>
          </div>

          <button
            onClick={load}
            disabled={paying}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              isDark
                ? 'border-white/10 bg-white/5 text-slate-300'
                : 'border-slate-200 bg-white text-slate-700'
            } disabled:opacity-50`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </div>

        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && (
          <div
            className={`mb-5 rounded-2xl border p-4 text-sm flex gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : message.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : message.type === 'info' ? (
              <Clock3 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}

            <span>
              {message.text}
            </span>
          </div>
        )}

        {/* ==================================================
            PENDING PAYMENT WARNING
        ================================================== */}

        {pendingPayment && (
          <div
            className={`mb-5 rounded-2xl border p-5 ${
              isDark
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-start gap-3">

              <Clock3
                className="text-amber-500 mt-0.5"
                size={22}
              />

              <div>
                <p
                  className={`font-bold ${
                    isDark
                      ? 'text-amber-300'
                      : 'text-amber-700'
                  }`}
                >
                  Payment Verification Pending
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  You have already submitted a payment
                  request of{' '}
                  <strong>
                    {money(
                      pendingPayment.amount
                    )}
                  </strong>
                  .
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  You cannot submit another payment
                  until the admin accepts or rejects
                  this request.
                </p>

                <p className="text-xs text-slate-500 mt-2">
                  Transaction ID:{' '}
                  {pendingPayment.transaction_id ||
                    'Pending'}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* ==================================================
            BALANCE + PAYMENT
        ================================================== */}

        <div className="grid lg:grid-cols-3 gap-5">

          {/* ==================================================
              CURRENT BALANCE
          ================================================== */}

          <div
            className={`lg:col-span-2 rounded-3xl border p-6 sm:p-8 ${
              isDark
                ? 'bg-slate-800/50 border-white/5'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >

            <p className="text-sm font-semibold text-slate-500">
              Current Account Balance
            </p>

            <p
              className={`text-4xl sm:text-5xl font-black mt-2 ${
                balance > 0
                  ? 'text-rose-500'
                  : 'text-emerald-500'
              }`}
            >
              {balance > 0
                ? `Due ${money(balance)}`
                : balance < 0
                ? `Advance ${money(
                    Math.abs(balance)
                  )}`
                : 'Settled'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7">

              <Stat
                label="Meal"
                value={money(
                  due?.meal_charge
                )}
                dark={isDark}
              />

              <Stat
                label="Other"
                value={money(
                  due?.other_charge
                )}
                dark={isDark}
              />

              <Stat
                label="Total Due"
                value={money(
                  totalDue
                )}
                dark={isDark}
              />

              <Stat
                label="Paid"
                value={money(
                  paidAmount
                )}
                dark={isDark}
              />

            </div>

            {/* Advance */}

            <div
              className={`mt-4 rounded-2xl p-4 ${
                isDark
                  ? 'bg-emerald-500/5'
                  : 'bg-emerald-50'
              }`}
            >

              <p className="text-xs uppercase tracking-widest font-bold text-slate-500">
                Advance Credit
              </p>

              <p className="text-xl font-black text-emerald-500 mt-1">
                {money(
                  advanceAmount
                )}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Extra verified payment is
                automatically kept as advance
                credit.
              </p>

            </div>

          </div>

          {/* ==================================================
              MAKE PAYMENT
          ================================================== */}

          <div
            className={`rounded-3xl border p-6 ${
              isDark
                ? 'bg-slate-800/50 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <h2
              className={`font-bold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              Make a Payment
            </h2>

            {/* ------------------------------------------------
                PENDING STATE
            ------------------------------------------------ */}

            {pendingPayment ? (
              <div className="mt-5">

                <div
                  className={`rounded-2xl p-5 border ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >

                  <Clock3
                    size={28}
                    className="text-amber-500 mb-3"
                  />

                  <p
                    className={`font-bold ${
                      isDark
                        ? 'text-amber-300'
                        : 'text-amber-700'
                    }`}
                  >
                    Payment Pending
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    Amount:{' '}
                    <strong>
                      {money(
                        pendingPayment.amount
                      )}
                    </strong>
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Please wait until the admin
                    accepts or rejects this payment.
                  </p>

                </div>

                <button
                  disabled
                  className="w-full mt-4 px-4 py-3.5 rounded-xl bg-slate-500/30 text-slate-500 font-bold cursor-not-allowed"
                >
                  Payment Locked
                </button>

              </div>
            ) : (
              <>
                {/* Amount */}

                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mt-5">
                  Amount
                </label>

                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="Enter amount"
                  disabled={paying}
                  className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } disabled:opacity-50`}
                />

                {/* Payment method */}

                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mt-4">
                  Payment Method
                </label>

                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(
                      e.target.value
                    )
                  }
                  disabled={paying}
                  className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-900/60 border-white/10 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  } disabled:opacity-50`}
                >

                  <option value="bkash">
                    bKash
                  </option>

                  <option value="nagad">
                    Nagad
                  </option>

                  <option value="bank_transfer">
                    Bank Transfer
                  </option>

                  <option value="cash">
                    Cash
                  </option>

                </select>

                {/* Submit */}

                <button
                  onClick={
                    submitPayment
                  }
                  disabled={
                    paying ||
                    !amount
                  }
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-60"
                >

                  {paying ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <CreditCard
                      size={18}
                    />
                  )}

                  Submit Payment Request

                </button>

                <p className="text-[11px] text-slate-500 mt-3">
                  After submitting a payment,
                  the payment form will remain locked
                  until an admin accepts or rejects
                  the request.
                </p>
              </>
            )}

          </div>

        </div>

        {/* ==================================================
            PAYMENT HISTORY
        ================================================== */}

        <div
          className={`mt-5 rounded-3xl border p-6 ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200'
          }`}
        >

          <h2
            className={`text-lg font-bold ${
              isDark
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            Payment History
          </h2>

          {payments.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No payment history found.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">

              <table className="w-full text-sm">

                <thead>
                  <tr className="text-left text-slate-500 border-b border-white/5">
                    <th className="py-3 pr-4">
                      Amount
                    </th>

                    <th className="py-3 pr-4">
                      Method
                    </th>

                    <th className="py-3 pr-4">
                      Status
                    </th>

                    <th className="py-3 pr-4">
                      Transaction ID
                    </th>

                    <th className="py-3">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-b border-white/5"
                      >

                        <td
                          className={`py-4 pr-4 font-bold ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >
                          {money(
                            payment.amount
                          )}
                        </td>

                        <td className="py-4 pr-4 text-slate-500">
                          {payment.payment_method ||
                            '-'}
                        </td>

                        <td className="py-4 pr-4">

                          <StatusBadge
                            status={
                              payment.status
                            }
                          />

                        </td>

                        <td className="py-4 pr-4 text-xs text-slate-500">
                          {payment.transaction_id ||
                            '-'}
                        </td>

                        <td className="py-4 text-xs text-slate-500">
                          {payment.created_at
                            ? new Date(
                                payment.created_at
                              ).toLocaleString(
                                'en-BD'
                              )
                            : '-'}
                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>
    </MemberLayout>
  );
}

// ============================================================
// STAT COMPONENT
// ============================================================

function Stat({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        dark
          ? 'bg-slate-900/40'
          : 'bg-slate-50'
      }`}
    >
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
        {label}
      </p>

      <p
        className={`font-bold mt-1 ${
          dark
            ? 'text-slate-200'
            : 'text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(status || '').toLowerCase();

  if (normalized === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
        <Clock3 size={13} />
        Pending
      </span>
    );
  }

  if (
    normalized === 'paid' ||
    normalized === 'approved' ||
    normalized === 'success'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 size={13} />
        Paid
      </span>
    );
  }

  if (
    normalized === 'failed' ||
    normalized === 'rejected'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500">
        <AlertCircle size={13} />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500">
      {status || 'Unknown'}
    </span>
  );
}