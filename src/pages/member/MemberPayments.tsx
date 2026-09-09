import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
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

  const [message, setMessage] =
    useState<Message | null>(null);

  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem('memberTheme') !==
      'light'
  );

  const currentMonth = month();

  // ----------------------------------------------------------
  // Theme listener
  // ----------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => {
      setIsDark(
        localStorage.getItem('memberTheme') !==
          'light'
      );
    }, 100);

    return () => clearInterval(id);
  }, []);

  // ----------------------------------------------------------
  // Load payment information
  // ----------------------------------------------------------

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

      // Generate/update current month's due
      const {
        error: generateError,
      } = await supabase.rpc(
        'generate_member_due',
        {
          p_member_id: memberId,
          p_billing_month:
            currentMonth,
          p_other_charge: null,
        }
      );

      if (generateError) {
        throw generateError;
      }

      // Load due + payment history
      const [
        {
          data: dueData,
          error: dueError,
        },
        {
          data: paymentData,
          error: paymentError,
        },
      ] = await Promise.all([
        supabase
          .from('member_payment_summary')
          .select('*')
          .eq(
            'member_id',
            memberId
          )
          .eq(
            'billing_month',
            currentMonth
          )
          .maybeSingle(),

        supabase
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
            notes
            `
          )
          .eq(
            'member_id',
            memberId
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          ),
      ]);

      if (dueError) {
        throw dueError;
      }

      if (paymentError) {
        throw paymentError;
      }

      setDue(dueData);
      setPayments(
        paymentData || []
      );

      // Default amount
      if (dueData) {
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

  // ----------------------------------------------------------
  // Submit manual payment
  // ----------------------------------------------------------

  async function submitPayment() {
    const n = Number(amount);

    // Minimum payment
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

      // ------------------------------------------------------
      // IMPORTANT:
      //
      // We intentionally DO NOT compare payment amount
      // with current due.
      //
      // Example:
      //
      // Current due = ৳1,000
      // Payment     = ৳1,500
      //
      // Allowed.
      // After admin verification:
      // Advance = ৳500
      // ------------------------------------------------------

      const transactionId =
        `MAN-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)
          .toUpperCase()}`;

      const {
        error,
      } = await supabase
        .from(
          'payment_transactions'
        )
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
        });

      if (error) {
        throw error;
      }

      setMessage({
        type: 'success',
        text:
          'Payment request submitted successfully. Admin will verify it and your balance will update.',
      });

      setAmount('');

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

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  if (loading) {
    return (
      <MemberLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </MemberLayout>
    );
  }

  // ----------------------------------------------------------
  // Current balance
  // ----------------------------------------------------------

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
              Submit any payment amount.
              Extra verified payment stays
              as advance credit.
            </p>
          </div>

          <button
            onClick={load}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              isDark
                ? 'border-white/10 bg-white/5 text-slate-300'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
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
              message.type ===
              'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : message.type ===
                  'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
            }`}
          >
            {message.type ===
            'success' ? (
              <CheckCircle2
                size={18}
              />
            ) : (
              <AlertCircle
                size={18}
              />
            )}

            <span>
              {message.text}
            </span>
          </div>
        )}


        {/* ==================================================
            BALANCE + PAYMENT
        ================================================== */}

        <div className="grid lg:grid-cols-3 gap-5">

          {/* ================================================
              CURRENT BALANCE
          ================================================ */}

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
                  : balance < 0
                  ? 'text-emerald-500'
                  : 'text-emerald-500'
              }`}
            >
              {balance > 0
                ? `Due ${money(
                    balance
                  )}`
                : balance < 0
                ? `Advance ${money(
                    Math.abs(
                      balance
                    )
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
                automatically kept as
                advance credit.
              </p>
            </div>

          </div>


          {/* ================================================
              MAKE PAYMENT
          ================================================ */}

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
              className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                isDark
                  ? 'bg-slate-900/60 border-white/10 text-white placeholder:text-slate-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
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
              className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                isDark
                  ? 'bg-slate-900/60 border-white/10 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
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
              disabled={paying}
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
              Minimum payment is BDT 10.
              You can pay less or more than
              your current due. Extra verified
              payment becomes advance credit.
            </p>

          </div>

        </div>


        {/* ==================================================
            PAYMENT HISTORY
        ================================================== */}

        <div
          className={`mt-6 rounded-3xl border overflow-hidden ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >

          <div className="p-5 border-b border-slate-200/10">

            <h2
              className={`font-bold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              Payment History
            </h2>

          </div>


          {payments.length === 0 ? (

            <div className="p-10 text-center text-sm text-slate-500">
              No payment transactions yet.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[820px] text-left">

                <thead>

                  <tr
                    className={
                      isDark
                        ? 'bg-slate-900/50'
                        : 'bg-slate-50'
                    }
                  >

                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Method
                    </th>

                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Transaction
                    </th>

                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Status
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-200/10">

                  {payments.map(
                    (p) => (
                      <tr
                        key={p.id}
                      >

                        <td className="px-5 py-3 text-sm text-slate-400">
                          {new Date(
                            p.created_at
                          ).toLocaleString(
                            'en-BD'
                          )}
                        </td>

                        <td
                          className={`px-5 py-3 text-sm font-bold ${
                            isDark
                              ? 'text-slate-200'
                              : 'text-slate-800'
                          }`}
                        >
                          {money(
                            p.amount
                          )}
                        </td>

                        <td className="px-5 py-3 text-sm text-slate-400">
                          {formatMethod(
                            p.payment_method
                          )}
                        </td>

                        <td className="px-5 py-3 text-xs text-slate-500 font-mono">
                          {p.transaction_id ||
                            '-'}
                        </td>

                        <td
                          className={`px-5 py-3 text-sm font-bold uppercase ${
                            p.status ===
                            'paid'
                              ? 'text-emerald-500'
                              : p.status ===
                                'failed'
                              ? 'text-rose-500'
                              : p.status ===
                                'cancelled'
                              ? 'text-slate-500'
                              : 'text-amber-500'
                          }`}
                        >
                          {p.status}
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


// ==========================================================
// STAT COMPONENT
// ==========================================================

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
      className={`rounded-2xl p-3 ${
        dark
          ? 'bg-white/[0.03]'
          : 'bg-slate-50'
      }`}
    >

      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
        {label}
      </p>

      <p
        className={`text-sm font-bold mt-1 ${
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


// ==========================================================
// PAYMENT METHOD FORMAT
// ==========================================================

function formatMethod(
  method: string
) {
  switch (method) {
    case 'bkash':
      return 'bKash';

    case 'nagad':
      return 'Nagad';

    case 'bank_transfer':
      return 'Bank Transfer';

    case 'cash':
      return 'Cash';

    default:
      return method || '-';
  }
}