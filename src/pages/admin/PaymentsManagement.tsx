import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  X,
  XCircle,
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type DueRow = {
  id: string;
  member_id: string;
  hostel_id: string;
  billing_month: string;
  meal_charge: number;
  other_charge: number;
  previous_due: number;
  total_due: number;
  paid_amount: number;
  remaining_due: number;
  status: 'due' | 'partial' | 'paid';
  member?: { name: string; email: string };
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_method: string;
  provider: string;
  transaction_id: string;
  gateway_transaction_id: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type Rate = {
  id: string;
  effective_from: string;
  day_rate: number;
  night_rate: number;
};

const monthStart = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

const money = (value: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PaymentsManagement() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(monthStart());
  const [rows, setRows] = useState<DueRow[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [selectedMember, setSelectedMember] = useState<DueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [showRateModal, setShowRateModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [rateForm, setRateForm] = useState({
    effective_from: new Date().toISOString().split('T')[0],
    day_rate: '',
    night_rate: '',
  });
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = window.setInterval(checkTheme, 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) loadData();
  }, [profile, month]);

  const loadData = async () => {
    try {
      setLoading(true);
      const hostelId = (profile as any)?.id;

      const [{ data: dueData, error: dueError }, { data: memberData, error: memberError }, { data: rateData, error: rateError }] =
        await Promise.all([
          supabase
            .from('member_payment_summary')
            .select('*')
            .eq('hostel_id', hostelId)
            .eq('billing_month', month)
            .order('remaining_due', { ascending: false }),
          supabase
            .from('members')
            .select('id,name,email')
            .eq('hostel_id', hostelId),
          supabase
            .from('meal_rates')
            .select('id,effective_from,day_rate,night_rate')
            .eq('hostel_id', hostelId)
            .order('effective_from', { ascending: false }),
        ]);

      if (dueError) throw dueError;
      if (memberError) throw memberError;
      if (rateError) throw rateError;

      const memberMap = new Map((memberData || []).map((m) => [m.id, m]));

      setRows(
        (dueData || []).map((row) => ({
          ...row,
          member: memberMap.get(row.member_id),
        }))
      );
      setRates(rateData || []);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Could not load payment data.');
    } finally {
      setLoading(false);
    }
  };

  const generateDues = async () => {
    try {
      setGenerating(true);

      const { data, error } = await supabase.rpc('generate_hostel_dues', {
        p_billing_month: month,
      });

      if (error) throw error;

      alert(`${data || 0} member dues generated/refreshed for ${month}.`);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Could not generate dues.');
    } finally {
      setGenerating(false);
    }
  };

  const saveRate = async (e: React.FormEvent) => {
    e.preventDefault();

    const day = Number(rateForm.day_rate);
    const night = Number(rateForm.night_rate);

    if (!Number.isFinite(day) || day < 0 || !Number.isFinite(night) || night < 0) {
      alert('Enter valid meal rates.');
      return;
    }

    try {
      const { error } = await supabase
        .from('meal_rates')
        .upsert(
          {
            hostel_id: (profile as any).id,
            effective_from: rateForm.effective_from,
            day_rate: day,
            night_rate: night,
          },
          { onConflict: 'hostel_id,effective_from' }
        );

      if (error) throw error;

      setShowRateModal(false);
      setRateForm({
        effective_from: new Date().toISOString().split('T')[0],
        day_rate: '',
        night_rate: '',
      });
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Could not save meal rates.');
    }
  };

  const viewPayments = async (row: DueRow) => {
    try {
      setSelectedMember(row);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('id,amount,payment_method,provider,transaction_id,gateway_transaction_id,status,paid_at,created_at')
        .eq('member_id', row.member_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
      setShowPaymentsModal(true);
    } catch (error: any) {
      alert(error.message || 'Could not load payment history.');
    }
  };

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter(
      (row) =>
        row.member?.name?.toLowerCase().includes(term) ||
        row.member?.email?.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const stats = useMemo(
    () => ({
      totalDue: rows.reduce((sum, r) => sum + Number(r.total_due || 0), 0),
      collected: rows.reduce((sum, r) => sum + Number(r.paid_amount || 0), 0),
      outstanding: rows.reduce((sum, r) => sum + Number(r.remaining_due || 0), 0),
      paidMembers: rows.filter((r) => r.status === 'paid').length,
    }),
    [rows]
  );

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Finance</p>
            <h1 className={`text-3xl sm:text-4xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Payment Management
            </h1>
            <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Generate member dues, manage meal rates and inspect payment history.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowRateModal(true)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm ${
                isDark ? 'border-white/10 bg-white/5 text-slate-200' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <Settings2 size={16} />
              Meal Rates
            </button>

            <button
              onClick={generateDues}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Generate Dues
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
          <Stat title="Total Due" value={money(stats.totalDue)} dark={isDark} />
          <Stat title="Collected" value={money(stats.collected)} dark={isDark} />
          <Stat title="Outstanding" value={money(stats.outstanding)} dark={isDark} />
          <Stat title="Paid Members" value={`${stats.paidMembers}/${rows.length}`} dark={isDark} />
        </div>

        <div className={`rounded-3xl border p-4 mb-5 ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member name or email..."
                className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isDark ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) => setMonth(`${e.target.value}-01`)}
              className={`px-4 py-3 rounded-xl border outline-none ${
                isDark ? 'bg-slate-900/60 border-white/10 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            <button
              onClick={loadData}
              className={`px-4 py-3 rounded-xl border ${isDark ? 'border-white/10 text-slate-300' : 'border-slate-200 text-slate-700'}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className={`rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          {loading ? (
            <div className="p-16 flex justify-center">
              <Activity className="animate-pulse text-indigo-500" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className={`p-16 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              No dues found. Click <b>Generate Dues</b> for the selected month.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
                    {['Member', 'Meal', 'Previous', 'Total', 'Paid', 'Remaining', 'Status', 'Action'].map((head) => (
                      <th key={head} className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4">
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.member?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{row.member?.email}</p>
                      </td>
                      <Cell value={money(row.meal_charge)} dark={isDark} />
                      <Cell value={money(row.previous_due)} dark={isDark} />
                      <Cell value={money(row.total_due)} dark={isDark} bold />
                      <Cell value={money(row.paid_amount)} dark={isDark} />
                      <Cell value={money(row.remaining_due)} dark={isDark} bold />
                      <td className={`px-5 py-4 text-sm font-bold uppercase ${
                        row.status === 'paid' ? 'text-emerald-500' : row.status === 'partial' ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {row.status}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => viewPayments(row)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${
                            isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Eye size={14} />
                          History
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`mt-5 text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          Meal charge is calculated from member meal preferences and the active meal rates for each meal date.
        </div>
      </div>

      <AnimatePresence>
        {showRateModal && (
          <Modal title="Meal Rates" onClose={() => setShowRateModal(false)} dark={isDark}>
            <form onSubmit={saveRate} className="space-y-4">
              <div>
                <label className={labelClass(isDark)}>Effective From</label>
                <input
                  type="date"
                  required
                  value={rateForm.effective_from}
                  onChange={(e) => setRateForm({ ...rateForm, effective_from: e.target.value })}
                  className={inputClass(isDark)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass(isDark)}>Lunch Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={rateForm.day_rate}
                    onChange={(e) => setRateForm({ ...rateForm, day_rate: e.target.value })}
                    className={inputClass(isDark)}
                    placeholder="e.g. 60"
                  />
                </div>
                <div>
                  <label className={labelClass(isDark)}>Dinner Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={rateForm.night_rate}
                    onChange={(e) => setRateForm({ ...rateForm, night_rate: e.target.value })}
                    className={inputClass(isDark)}
                    placeholder="e.g. 70"
                  />
                </div>
              </div>

              <div className={`rounded-xl p-3 text-xs ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                Example: if a member takes lunch + dinner, that day costs Lunch Rate + Dinner Rate.
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowRateModal(false)} className={secondaryButton(isDark)}>
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold">
                  Save Rate
                </button>
              </div>

              {rates.length > 0 && (
                <div className="pt-3 border-t border-slate-200/10">
                  <p className={labelClass(isDark)}>Existing Rates</p>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {rates.map((rate) => (
                      <div key={rate.id} className={`flex justify-between text-sm p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                        <span>{rate.effective_from}</span>
                        <span className="font-bold">
                          {money(rate.day_rate)} / {money(rate.night_rate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </Modal>
        )}

        {showPaymentsModal && selectedMember && (
          <Modal
            title={`${selectedMember.member?.name || 'Member'} — Payment History`}
            onClose={() => setShowPaymentsModal(false)}
            dark={isDark}
            wide
          >
            {payments.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No transactions found.</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{money(payment.amount)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(payment.created_at).toLocaleString('en-BD')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className={`text-xs font-bold uppercase ${
                        payment.status === 'paid' ? 'text-emerald-500' : payment.status === 'failed' ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {payment.status}
                      </p>
                      <p className="text-xs font-mono text-slate-500 mt-1">{payment.transaction_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function Stat({ title, value, dark }: { title: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${dark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
      <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">{title}</p>
      <p className={`text-xl font-black mt-2 ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

function Cell({ value, dark, bold = false }: { value: string; dark: boolean; bold?: boolean }) {
  return (
    <td className={`px-5 py-4 text-sm ${bold ? 'font-bold' : ''} ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
      {value}
    </td>
  );
}

function Modal({
  title,
  onClose,
  dark,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  dark: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`relative w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-3xl border shadow-2xl p-6 ${
          dark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-white/5">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

const labelClass = (dark: boolean) =>
  `block text-xs font-bold uppercase tracking-widest mb-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`;

const inputClass = (dark: boolean) =>
  `w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 ${
    dark ? 'bg-slate-800 border-white/10 text-white [color-scheme:dark]' : 'bg-slate-50 border-slate-200 text-slate-900'
  }`;

const secondaryButton = (dark: boolean) =>
  `flex-1 px-4 py-3 rounded-xl font-bold ${dark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-700'}`;
