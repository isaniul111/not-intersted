import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  WalletCards,
  XCircle,
} from 'lucide-react';
import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Due = {
  id: string;
  billing_month: string;
  meal_charge: number;
  other_charge: number;
  previous_due: number;
  total_due: number;
  paid_amount: number;
  remaining_due: number;
  status: 'due' | 'partial' | 'paid';
};

type Payment = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  provider: string;
  transaction_id: string;
  gateway_transaction_id: string | null;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paid_at: string | null;
  created_at: string;
};

const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

const money = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`)
  );

export default function MemberPayments() {
  const { profile } = useAuth();
  const [due, setDue] = useState<Due | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  const currentMonth = useMemo(() => monthStart(), []);

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
    const interval = window.setInterval(checkTheme, 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) {
      handlePaymentResult();
      loadPayments();
    }
  }, [profile]);

  const handlePaymentResult = () => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('payment');

    if (result === 'success') {
      setMessage({
        type: 'success',
        text: `Payment submitted successfully${params.get('tran_id') ? ` · ${params.get('tran_id')}` : ''}.`,
      });
    } else if (result === 'failed') {
      setMessage({ type: 'error', text: 'Payment failed. No amount was added to your paid balance.' });
    } else if (result === 'cancelled') {
      setMessage({ type: 'info', text: 'Payment was cancelled.' });
    }

    if (result) {
      window.history.replaceState({}, document.title, '/payments');
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const memberId = (profile as any)?.id;

      // Generate/refresh this month's due from meal preferences.
      const { error: dueError } = await supabase.rpc('generate_member_due', {
        p_member_id: memberId,
        p_billing_month: currentMonth,
        p_other_charge: null,
      });

      if (dueError) throw dueError;

      const { data: dueData, error: dueSelectError } = await supabase
        .from('member_payment_summary')
        .select('*')
        .eq('member_id', memberId)
        .eq('billing_month', currentMonth)
        .maybeSingle();

      if (dueSelectError) throw dueSelectError;

      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_transactions')
        .select(
          'id,amount,currency,payment_method,provider,transaction_id,gateway_transaction_id,status,paid_at,created_at'
        )
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (paymentError) throw paymentError;

      setDue(dueData || null);
      setPayments(paymentData || []);

      if (dueData && dueData.remaining_due > 0) {
        setAmount(Number(dueData.remaining_due).toFixed(2));
      } else {
        setAmount('0');
      }
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Could not load payment information.' });
    } finally {
      setLoading(false);
    }
  };

  const startPayment = async () => {
    const numericAmount = Number(amount);

    if (!due || due.remaining_due <= 0) {
      setMessage({ type: 'info', text: 'You do not have any outstanding balance.' });
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage({ type: 'error', text: 'Enter a valid payment amount.' });
      return;
    }

    if (numericAmount < 10) {
      setMessage({ type: 'error', text: 'SSLCOMMERZ requires at least BDT 10.00 per transaction.' });
      return;
    }

    if (numericAmount > Number(due.remaining_due)) {
      setMessage({ type: 'error', text: `You cannot pay more than ${money(due.remaining_due)}.` });
      return;
    }

    try {
      setPaying(true);
      setMessage(null);

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          due_id: due.id,
          amount: Number(numericAmount.toFixed(2)),
        },
      });

      if (error) throw error;
      if (!data?.gateway_url) throw new Error(data?.message || 'Payment gateway URL was not returned.');

      window.location.href = data.gateway_url;
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'Could not start payment.' });
      setPaying(false);
    }
  };

  const statusIcon = (status: Payment['status']) => {
    if (status === 'paid') return <CheckCircle2 size={18} className="text-emerald-500" />;
    if (status === 'failed') return <XCircle size={18} className="text-rose-500" />;
    if (status === 'cancelled') return <XCircle size={18} className="text-slate-500" />;
    return <Clock3 size={18} className="text-amber-500" />;
  };

  const statusClass = (status: Payment['status']) => {
    if (status === 'paid') return 'text-emerald-500';
    if (status === 'failed') return 'text-rose-500';
    if (status === 'cancelled') return 'text-slate-500';
    return 'text-amber-500';
  };

  if (loading) {
    return (
      <MemberLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Finance
            </p>
            <h1 className={`text-3xl sm:text-4xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              My Payments
            </h1>
            <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              View your individual mess balance and complete online payments.
            </p>
          </div>

          <button
            onClick={loadPayments}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
              isDark
                ? 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : message.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          <div className={`lg:col-span-2 rounded-3xl border p-6 sm:p-8 ${
            isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Outstanding Balance
                </p>
                <p className={`text-4xl sm:text-5xl font-black mt-2 ${due?.remaining_due ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {money(due?.remaining_due || 0)}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <WalletCards size={26} />
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Meal" value={money(due?.meal_charge || 0)} dark={isDark} />
              <Stat label="Other" value={money(due?.other_charge || 0)} dark={isDark} />
              <Stat label="Previous" value={money(due?.previous_due || 0)} dark={isDark} />
              <Stat label="Paid" value={money(due?.paid_amount || 0)} dark={isDark} />
            </div>
          </div>

          <div className={`rounded-3xl border p-6 ${
            isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {monthLabel(currentMonth)}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Current billing cycle
            </p>

            <div className="mt-6">
              <label className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Payment amount
              </label>
              <div className="relative mt-2">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  ৳
                </span>
                <input
                  type="number"
                  min="10"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!due || due.remaining_due <= 0 || paying}
                  className={`w-full pl-9 pr-4 py-3.5 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? 'bg-slate-900/60 border-white/10 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <button
                onClick={startPayment}
                disabled={!due || due.remaining_due <= 0 || paying}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition"
              >
                {paying ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                {paying ? 'Redirecting...' : due?.remaining_due ? 'Pay with SSLCOMMERZ' : 'Fully Paid'}
              </button>

              <p className={`text-[11px] mt-3 leading-5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                You will be redirected to the hosted payment page. Your card/mobile-wallet credentials are handled by the gateway.
              </p>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl border overflow-hidden ${
          isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-5 sm:p-6 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Payment History
            </h2>
          </div>

          {payments.length === 0 ? (
            <div className={`p-12 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              No payment transactions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">Date</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">Method</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">Transaction</th>
                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {new Date(payment.created_at).toLocaleString('en-BD')}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {money(payment.amount)}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {payment.payment_method || 'Online'}
                      </td>
                      <td className={`px-6 py-4 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {payment.transaction_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 text-sm font-bold uppercase ${statusClass(payment.status)}`}>
                          {statusIcon(payment.status)}
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`mt-5 flex items-center gap-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          <ExternalLink size={14} />
          Online payments are verified server-side before your balance is updated.
        </div>
      </div>
    </MemberLayout>
  );
}

function Stat({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{label}</p>
      <p className={`text-sm font-bold mt-1 ${dark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
