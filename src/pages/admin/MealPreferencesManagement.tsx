import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  Utensils,
} from 'lucide-react';

import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type Meal = {
  id: string;
  date: string;
  day_menu_name: string | null;
  night_menu_name: string | null;
};

type Preference = {
  id: string;
  meal_id: string;
  meal_date: string;
  member_id: string;
  meal_time: 'day' | 'night';
  preferred_item: string;
  status: string;
  member?: {
    name: string;
    email: string;
  } | null;
};

type Member = {
  id: string;
  name: string;
  email: string;
};

type Summary = {
  item: string;
  count: number;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(
    new Date(`${date}T00:00:00+06:00`)
  );

export default function MealPreferencesManagement() {
  const { profile } = useAuth();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [preferences, setPreferences] =
    useState<Preference[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedDate, setSelectedDate] =
    useState('');

  const [mealTime, setMealTime] =
    useState<'day' | 'night'>('day');

  const [search, setSearch] =
    useState('');

  const [isDark, setIsDark] =
    useState(
      () =>
        localStorage.getItem(
          'adminTheme'
        ) !== 'light'
    );


  // ============================================================
  // THEME
  // ============================================================

  useEffect(() => {
    const id = window.setInterval(() => {
      setIsDark(
        localStorage.getItem(
          'adminTheme'
        ) !== 'light'
      );
    }, 500);

    return () =>
      window.clearInterval(id);
  }, []);


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);


  // ============================================================
  // LOAD
  // ============================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const hostelId =
        (profile as any)?.id;

      if (!hostelId) return;


      const today =
        new Date().toISOString().slice(0, 10);


      const [
        { data: mealData, error: mealError },
        { data: prefData, error: prefError },
        { data: memberData, error: memberError },
      ] = await Promise.all([

        supabase
          .from('meals')
          .select(
            'id,date,day_menu_name,night_menu_name'
          )
          .eq('hostel_id', hostelId)
          .gte('date', today)
          .order('date')
          .limit(31),

        supabase
          .from('meal_preferences')
          .select(
            `
            id,
            meal_id,
            meal_date,
            member_id,
            meal_time,
            preferred_item,
            status,
            member:members(name,email)
            `
          )
          .eq('hostel_id', hostelId)
          .gte('meal_date', today)
          .order('meal_date')
          .order('meal_time'),

        supabase
          .from('members')
          .select('id,name,email')
          .eq('hostel_id', hostelId)
          .order('name'),
      ]);


      if (mealError)
        throw mealError;

      if (prefError)
        throw prefError;

      if (memberError)
        throw memberError;


      const normalizedPreferences =
        (prefData || []).map(
          (p: any) => ({
            ...p,
            member:
              Array.isArray(p.member)
                ? p.member[0]
                : p.member,
          })
        );


      setMeals(
        (mealData || []) as Meal[]
      );

      setPreferences(
        normalizedPreferences
      );

      setMembers(
        (memberData || []) as Member[]
      );


      if (
        !selectedDate &&
        mealData &&
        mealData.length > 0
      ) {
        setSelectedDate(
          mealData[0].date
        );
      }

    } catch (error: any) {

      console.error(error);

      alert(
        error.message ||
          'Could not load meal preferences.'
      );

    } finally {

      setLoading(false);

    }
  };


  // ============================================================
  // CURRENT MEAL
  // ============================================================

  const currentMeal = useMemo(
    () =>
      meals.find(
        (meal) =>
          meal.date === selectedDate
      ) || null,
    [meals, selectedDate]
  );


  // ============================================================
  // CURRENT PREFERENCES
  // ============================================================

  const currentPreferences =
    useMemo(
      () =>
        preferences.filter(
          (p) =>
            p.meal_date ===
              selectedDate &&
            p.meal_time ===
              mealTime
        ),
      [
        preferences,
        selectedDate,
        mealTime,
      ]
    );


  // ============================================================
  // SUMMARY
  // ============================================================

  const summary =
    useMemo<Summary[]>(() => {

      const map =
        new Map<string, number>();

      currentPreferences.forEach(
        (p) => {

          const item =
            p.preferred_item
              ?.trim();

          if (!item) return;

          map.set(
            item,
            (map.get(item) || 0) + 1
          );
        }
      );

      return Array.from(
        map.entries()
      )
        .map(([item, count]) => ({
          item,
          count,
        }))
        .sort(
          (a, b) =>
            b.count - a.count
        );

    }, [currentPreferences]);


  // ============================================================
  // MISSING MEMBERS
  // ============================================================

  const submittedMemberIds =
    useMemo(
      () =>
        new Set(
          currentPreferences.map(
            (p) => p.member_id
          )
        ),
      [currentPreferences]
    );


  const missingMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            !submittedMemberIds.has(
              member.id
            )
        ),
      [
        members,
        submittedMemberIds,
      ]
    );


  // ============================================================
  // SEARCH
  // ============================================================

  const filteredPreferences =
    useMemo(() => {

      const query =
        search.trim().toLowerCase();

      if (!query) {
        return currentPreferences;
      }

      return currentPreferences.filter(
        (p) =>
          p.member?.name
            ?.toLowerCase()
            .includes(query) ||
          p.member?.email
            ?.toLowerCase()
            .includes(query) ||
          p.preferred_item
            ?.toLowerCase()
            .includes(query)
      );

    }, [
      currentPreferences,
      search,
    ]);


  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }


  // ============================================================
  // UI
  // ============================================================

  return (
    <AdminLayout>

      <div className="w-full max-w-7xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">

          <div>

            <div className="flex items-center gap-3">

              <div
                className={`p-3 rounded-2xl ${
                  isDark
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                <Utensils size={24} />
              </div>

              <h1
                className={`text-3xl sm:text-4xl font-extrabold ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Meal Preferences
              </h1>

            </div>

            <p className="text-sm mt-2 text-slate-500">
              Plan food using member preferences.
            </p>

          </div>


          <button
            onClick={loadData}
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


        {/* FILTER */}

        <div
          className={`rounded-3xl border p-4 mb-6 ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* DATE */}

            <div>

              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Date
              </label>

              <select
                value={selectedDate}
                onChange={(e) =>
                  setSelectedDate(
                    e.target.value
                  )
                }
                className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200'
                }`}
              >

                {meals.map(
                  (meal) => (
                    <option
                      key={meal.id}
                      value={meal.date}
                    >
                      {formatDate(
                        meal.date
                      )}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* MEAL TIME */}

            <div>

              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Meal
              </label>

              <select
                value={mealTime}
                onChange={(e) =>
                  setMealTime(
                    e.target.value as
                      | 'day'
                      | 'night'
                  )
                }
                className={`w-full mt-2 px-4 py-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200'
                }`}
              >

                <option value="day">
                  Lunch
                </option>

                <option value="night">
                  Dinner
                </option>

              </select>

            </div>


            {/* SEARCH */}

            <div>

              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Search
              </label>

              <div className="relative mt-2">

                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Member or food..."
                  className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                    isDark
                      ? 'bg-slate-900 border-white/10 text-white'
                      : 'bg-white border-slate-200'
                  }`}
                />

              </div>

            </div>

          </div>

        </div>


        {/* MENU INFO */}

        {currentMeal && (

          <div
            className={`rounded-3xl border p-5 mb-6 ${
              isDark
                ? 'bg-slate-800/50 border-white/5'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >

            <p className="text-xs uppercase tracking-widest font-bold text-indigo-500">
              Published Menu
            </p>

            <h2
              className={`text-xl font-bold mt-1 ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              {mealTime === 'day'
                ? currentMeal.day_menu_name ||
                  'No lunch menu'
                : currentMeal.night_menu_name ||
                  'No dinner menu'}
            </h2>

          </div>
        )}


        {/* STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">

          <StatCard
            icon={<Users size={20} />}
            label="Total Members"
            value={members.length}
            dark={isDark}
          />

          <StatCard
            icon={
              <CheckCircle2 size={20} />
            }
            label="Submitted"
            value={
              currentPreferences.length
            }
            dark={isDark}
          />

          <StatCard
            icon={
              <AlertCircle size={20} />
            }
            label="Missing"
            value={
              missingMembers.length
            }
            dark={isDark}
          />

        </div>


        {/* SUMMARY */}

        <div
          className={`rounded-3xl border p-5 mb-6 ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >

          <div className="flex items-center justify-between mb-5">

            <div>

              <h2
                className={`font-bold text-lg ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Preference Summary
              </h2>

              <p className="text-xs text-slate-500 mt-1">
                {formatDate(
                  selectedDate
                )}{' '}
                •{' '}
                {mealTime === 'day'
                  ? 'Lunch'
                  : 'Dinner'}
              </p>

            </div>

            <Clock
              size={19}
              className="text-indigo-500"
            />

          </div>


          {summary.length === 0 ? (

            <div className="text-center py-8 text-sm text-slate-500">
              No preferences submitted.
            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {summary.map(
                (item) => (

                  <div
                    key={item.item}
                    className={`rounded-2xl border p-4 ${
                      isDark
                        ? 'bg-white/[0.02] border-white/5'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >

                    <p
                      className={`font-bold ${
                        isDark
                          ? 'text-white'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.item}
                    </p>

                    <p className="text-2xl font-extrabold text-indigo-500 mt-1">
                      {item.count}
                    </p>

                    <p className="text-xs text-slate-500">
                      members
                    </p>

                  </div>

                )
              )}

            </div>
          )}

        </div>


        {/* MISSING MEMBERS */}

        {missingMembers.length > 0 && (

          <div
            className={`rounded-3xl border p-5 mb-6 ${
              isDark
                ? 'bg-amber-500/5 border-amber-500/10'
                : 'bg-amber-50 border-amber-100'
            }`}
          >

            <div className="flex items-center gap-2 mb-4">

              <AlertCircle
                size={19}
                className="text-amber-500"
              />

              <h2
                className={`font-bold ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Members Without Preference
              </h2>

            </div>


            <div className="flex flex-wrap gap-2">

              {missingMembers.map(
                (member) => (

                  <span
                    key={member.id}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/70 text-slate-700 border border-amber-200"
                  >
                    {member.name}
                  </span>

                )
              )}

            </div>

          </div>

        )}


        {/* MEMBER TABLE */}

        <div
          className={`rounded-3xl border overflow-hidden ${
            isDark
              ? 'bg-slate-800/50 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >

          <div
            className={`p-5 border-b ${
              isDark
                ? 'border-white/5'
                : 'border-slate-200'
            }`}
          >

            <h2
              className={`font-bold text-lg ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              Member Preferences
            </h2>

          </div>


          {filteredPreferences.length === 0 ? (

            <div className="p-12 text-center text-sm text-slate-500">
              No matching preferences.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[760px] text-left">

                <thead>

                  <tr
                    className={
                      isDark
                        ? 'bg-slate-900/50'
                        : 'bg-slate-50'
                    }
                  >

                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Member
                    </th>

                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Email
                    </th>

                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Preference
                    </th>

                    <th className="px-6 py-4 text-xs uppercase tracking-widest text-slate-500">
                      Status
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

                  {filteredPreferences.map(
                    (p) => (

                      <tr key={p.id}>

                        <td
                          className={`px-6 py-4 text-sm font-semibold ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >
                          {p.member?.name ||
                            'Unknown'}
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-500">
                          {p.member?.email ||
                            '-'}
                        </td>

                        <td
                          className={`px-6 py-4 text-sm ${
                            isDark
                              ? 'text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >
                          {p.preferred_item}
                        </td>

                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              p.status ===
                              'locked'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >

                            {p.status ===
                            'locked' ? (
                              <Clock
                                size={13}
                              />
                            ) : (
                              <CheckCircle2
                                size={13}
                              />
                            )}

                            {p.status ===
                            'locked'
                              ? 'Locked'
                              : 'Submitted'}

                          </span>

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

    </AdminLayout>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  label,
  value,
  dark,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 ${
        dark
          ? 'bg-slate-800/50 border-white/5'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >

      <div className="flex items-center gap-3">

        <div
          className={`p-3 rounded-xl ${
            dark
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {icon}
        </div>

        <div>

          <p className="text-xs uppercase tracking-widest text-slate-500">
            {label}
          </p>

          <p
            className={`text-2xl font-extrabold mt-1 ${
              dark
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}

