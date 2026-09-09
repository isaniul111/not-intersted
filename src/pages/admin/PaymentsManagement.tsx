import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const money = (v: number) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const monthStart = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}-01`;
};

export default function PaymentsManagement() {
  const { profile } = useAuth();

  const [month, setMonth] = useState(monthStart());
  const [rows, setRows] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [rate, setRate] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const [cost, setCost] = useState({
    category: 'rent',
    description: '',
    amount: '',
  });

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('adminTheme') !== 'light'
  );

  useEffect(() => {
    const id = setInterval(() => {
      setIsDark(localStorage.getItem('adminTheme') !== 'light');
    }, 100);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (profile) {
      load();
    }
  }, [profile, month]);

  async function load() {
    try {
      setLoading(true);

      const hostel = (profile as any).id;

      const [
        { data: dues, error: de },
        { data: members, error: me },
        { data: r, error: re },
        { data: c, error: ce },
      ] = await Promise.all([
        supabase
          .from('member_payment_summary')
          .select('*')
          .eq('hostel_id', hostel)
          .eq('billing_month', month)
          .order('balance'),

        supabase
          .from('members')
          .select('id,name,email')
          .eq('hostel_id', hostel),

        supabase
          .from('monthly_meal_rates')
          .select('*')
          .eq('hostel_id', hostel)
          .eq('billing_month', month)
          .maybeSingle(),

        supabase
          .from('monthly_costs')
          .select('*')
          .eq('hostel_id', hostel)
          .eq('billing_month', month)
          .order('created_at', { ascending: false }),
      ]);

      if (de) throw de;
      if (me) throw me;
      if (re) throw re;
      if (ce) throw ce;

      const map = new Map(
        (members || []).map((m: any) => [m.id, m])
      );

      setRows(
        (dues || []).map((d: any) => ({
          ...d,
          member: map.get(d.member_id),
        }))
      );

      setRate(r);
      setCosts(c || []);
    } catch (e: any) {
      alert(e.message || 'Could not load finance data.');
    } finally {
      setLoading(false);
    }
  }

  async function calculate() {
    try {
      setBusy(true);

      const { data, error } = await supabase.rpc(
        'calculate_monthly_meal_rate',
        {
          p_hostel_id: (profile as any).id,
          p_billing_month: month,
        }
      );

      if (error) throw error;

      setRate(data);

      const { error: ge } = await supabase.rpc(
        'generate_hostel_dues',
        {
          p_billing_month: month,
        }
      );

      if (ge) throw ge;

      alert('Monthly meal rate and member bills recalculated.');

      await load();
    } catch (e: any) {
      alert(e.message || 'Calculation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function addCost(e: React.FormEvent) {
    e.preventDefault();

    const amount = Number(cost.amount);

    if (
      !cost.description.trim() ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      alert('Enter a valid description and amount.');
      return;
    }

    try {
      setBusy(true);

      const { data, error } = await supabase
        .from('monthly_costs')
        .insert({
          hostel_id: (profile as any).id,
          billing_month: month,
          category: cost.category,
          description: cost.description,
          total_amount: amount,
          distribution: 'equal',
        })
        .select()
        .single();

      if (error) throw error;

      const { error: de } = await supabase.rpc(
        'distribute_monthly_cost',
        {
          p_cost_id: data.id,
        }
      );

      if (de) throw de;

      setCost({
        category: 'rent',
        description: '',
        amount: '',
      });

      await calculate();
    } catch (e: any) {
      alert(e.message || 'Could not add cost.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(id: string, paid: boolean) {
    try {
      setBusy(true);

      const { error } = await supabase
        .from('payment_transactions')
        .update({
          status: paid ? 'paid' : 'failed',
          paid_at: paid ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      await load();
    } catch (e: any) {
      alert(e.message || 'Could not update payment.');
    } finally {
      setBusy(false);
    }
  }

  const filtered = rows.filter(
    (r) =>
      !search ||
      r.member?.name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      r.member?.email
        ?.toLowerCase()
        .includes(search.toLowerCase())
  );

  const stats = useMemo(
    () => ({
      charges: rows.reduce(
        (s, r) => s + Number(r.total_due || 0),
        0
      ),

      paid: rows.reduce(
        (s, r) => s + Number(r.paid_amount || 0),
        0
      ),

      due: rows.reduce(
        (s, r) => s + Math.max(Number(r.balance || 0), 0),
        0
      ),

      advance: rows.reduce(
        (s, r) => s + Math.max(-Number(r.balance || 0), 0),
        0
      ),
    }),
    [rows]
  );

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
              Finance
            </p>

            <h1
              className={`text-3xl sm:text-4xl font-extrabold mt-1 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Payment & Monthly Calculation
            </h1>

            <p className="text-sm mt-2 text-slate-500">
              Calculate meal rate, distribute monthly costs and review
              member balances.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="month"
              value={month.slice(0, 7)}
              onChange={(e) =>
                setMonth(`${e.target.value}-01`)
              }
              className={`px-4 py-2.5 rounded-xl border ${
                isDark
                  ? 'bg-slate-900/60 border-white/10 text-white [color-scheme:dark]'
                  : 'bg-white border-slate-200'
              }`}
            />

            <button
              onClick={calculate}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60"
            >
              {busy ? (
                <Loader2
                  className="animate-spin"
                  size={16}
                />
              ) : (
                <RefreshCw size={16} />
              )}

              Calculate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Stat
            title="Total Charges"
            value={money(stats.charges)}
            dark={isDark}
          />

          <Stat
            title="Collected"
            value={money(stats.paid)}
            dark={isDark}
          />

          <Stat
            title="Total Due"
            value={money(stats.due)}
            dark={isDark}
          />

          <Stat
            title="Total Advance"
            value={money(stats.advance)}
            dark={isDark}
          />
        </div>

        {/* Meal Rate + Costs */}
        <div className="grid lg:grid-cols-3 gap-5 mb-6">

          {/* Meal Rate */}
          <div
            className={`lg:col-span-1 rounded-3xl border p-6 ${
              isDark
                ? 'bg-slate-800/50 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings2
                size={18}
                className="text-indigo-500"
              />

              <h2
                className={`font-bold ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Calculated Meal Rate
              </h2>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Total Bazar ÷ Total Actual Meals
            </p>

            <p className="text-4xl font-black text-indigo-500 mt-2">
              {money(rate?.meal_rate || 0)}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Stat
                title="Bazar"
                value={money(rate?.total_bazar || 0)}
                dark={isDark}
              />

              <Stat
                title="Meals"
                value={String(rate?.total_meals || 0)}
                dark={isDark}
              />
            </div>
          </div>

          {/* Add Cost */}
          <form
            onSubmit={addCost}
            className={`lg:col-span-2 rounded-3xl border p-6 ${
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
              Add Monthly Rent / Utility / Other
            </h2>

            <div className="grid sm:grid-cols-3 gap-3 mt-4">

              {/* Category */}
              <select
                value={cost.category}
                onChange={(e) =>
                  setCost({
                    ...cost,
                    category: e.target.value,
                  })
                }
                className={`rounded-xl border px-3 py-3 ${
                  isDark
                    ? 'bg-slate-900/60 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="rent">
                  House Rent
                </option>

                <option value="utility">
                  Utility
                </option>

                <option value="other">
                  Other
                </option>
              </select>

              {/* Description */}
              <input
                value={cost.description}
                onChange={(e) =>
                  setCost({
                    ...cost,
                    description: e.target.value,
                  })
                }
                placeholder="Electricity / Rent / Gas..."
                className={`rounded-xl border px-3 py-3 ${
                  isDark
                    ? 'bg-slate-900/60 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200'
                }`}
              />

              {/* Amount */}
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost.amount}
                onChange={(e) =>
                  setCost({
                    ...cost,
                    amount: e.target.value,
                  })
                }
                placeholder="Amount"
                className={`rounded-xl border px-3 py-3 ${
                  isDark
                    ? 'bg-slate-900/60 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold disabled:opacity-60"
            >
              {busy ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Plus size={16} />
              )}

              Add & Equal Distribute
            </button>

            <div className="mt-4 space-y-2">
              {costs.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between text-sm rounded-xl px-3 py-2 bg-slate-500/5"
                >
                  <span>
                    {c.description}{' '}
                    <span className="text-xs text-slate-500">
                      ({c.category})
                    </span>
                  </span>

                  <b>{money(c.total_amount)}</b>
                </div>
              ))}
            </div>
          </form>
        </div>

        {/* Search */}
        <div
          className={`rounded-3xl border p-4 mb-5 ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search member..."
              className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                isDark
                  ? 'bg-slate-900/60 border-white/10 text-white'
                  : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>
        </div>

        {/* Members Table */}
        <div
          className={`rounded-3xl border overflow-hidden ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">

                <thead>
                  <tr
                    className={
                      isDark
                        ? 'bg-slate-900/50'
                        : 'bg-slate-50'
                    }
                  >
                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Member
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Meal
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Other / Rent / Utility
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Paid
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Balance
                    </th>

                    <th className="px-5 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody
                  className={`divide-y ${
                    isDark
                      ? 'divide-white/5'
                      : 'divide-slate-100'
                  }`}
                >
                  {filtered.map((r) => (
                    <tr key={r.id}>

                      <td
                        className={`px-5 py-4 text-sm font-semibold ${
                          isDark
                            ? 'text-white'
                            : 'text-slate-900'
                        }`}
                      >
                        {r.member?.name}

                        <div className="text-xs text-slate-500 font-normal">
                          {r.member?.email}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {money(r.meal_charge)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {money(r.other_charge)}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-300">
                        {money(r.total_due)}
                      </td>

                      <td className="px-5 py-4 text-sm text-emerald-500">
                        {money(r.paid_amount)}
                      </td>

                      <td
                        className={`px-5 py-4 text-sm font-black ${
                          Number(r.balance) < 0
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {Number(r.balance) < 0
                          ? `Advance ${money(
                              Math.abs(r.balance)
                            )}`
                          : Number(r.balance) > 0
                          ? `Due ${money(r.balance)}`
                          : 'Settled'}
                      </td>

                      <td className="px-5 py-4 text-sm">
                        <PaymentRequests
                          memberId={r.member_id}
                          verify={verify}
                          disabled={busy}
                        />
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}

function PaymentRequests({
  memberId,
  verify,
  disabled,
}: {
  memberId: string;
  verify: (
    id: string,
    paid: boolean
  ) => Promise<void>;
  disabled: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('payment_transactions')
      .select(
        'id,amount,payment_method,status,transaction_id,created_at'
      )
      .eq('member_id', memberId)
      .eq('status', 'pending')
      .order('created_at', {
        ascending: false,
      })
      .then(({ data }) => {
        setItems(data || []);
      });
  }, [memberId]);

  if (!items.length) {
    return (
      <span className="text-xs text-slate-500">
        No pending
      </span>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((p) => (
        <div key={p.id} className="text-xs">

          <b>{money(p.amount)}</b>

          {' · '}

          {p.payment_method}

          <div className="flex gap-2 mt-1">

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                verify(p.id, true)
              }
              className="text-emerald-500 font-bold"
            >
              <CheckCircle2 size={15} />
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                verify(p.id, false)
              }
              className="text-rose-500 font-bold"
            >
              <XCircle size={15} />
            </button>

          </div>
        </div>
      ))}
    </div>
  );
}

function Stat({
  title,
  value,
  dark,
}: {
  title: string;
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
        {title}
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