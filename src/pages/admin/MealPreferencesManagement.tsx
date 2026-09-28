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

type Member = {
  id: string;
  name: string;
  email: string;
};

type Preference = {
  id: string;
  meal_id: string;
  meal_date: string;
  member_id: string;
  meal_time: 'day' | 'night';
  preferred_item: string;
  status: string;
  member?: Member | null;
};

type Summary = {
  item: string;
  count: number;
};

/* ============================================================
   DATE FORMAT
============================================================ */

const formatDate = (date: string) => {
  // IMPORTANT:
  // Prevent Invalid Date / blank page
  if (!date) {
    return 'No date selected';
  }

  const parsedDate = new Date(`${date}T00:00:00+06:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  }).format(parsedDate);
};

/* ============================================================
   COMPONENT
============================================================ */

export default function MealPreferencesManagement() {
  const { profile } = useAuth();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedDate, setSelectedDate] = useState('');
  const [mealTime, setMealTime] =
    useState<'day' | 'night'>('day');

  const [search, setSearch] = useState('');

  const [isDark, setIsDark] = useState(
    () =>
      localStorage.getItem('adminTheme') !== 'light'
  );

  /* ============================================================
     THEME
  ============================================================ */

  useEffect(() => {
    const id = window.setInterval(() => {
      setIsDark(
        localStorage.getItem('adminTheme') !== 'light'
      );
    }, 500);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  /* ============================================================
     LOAD DATA
  ============================================================ */

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const hostelId = (profile as any)?.id;

      if (!hostelId) {
        throw new Error(
          'Admin profile / hostel ID was not found.'
        );
      }

      const today = new Date()
        .toISOString()
        .slice(0, 10);

      /* ========================================================
         LOAD MEALS
      ======================================================== */

      const {
        data: mealData,
        error: mealError,
      } = await supabase
        .from('meals')
        .select(
          'id,date,day_menu_name,night_menu_name'
        )
        .eq('hostel_id', hostelId)
        .gte('date', today)
        .order('date')
        .limit(31);

      if (mealError) {
        throw mealError;
      }

      /* ========================================================
         LOAD MEMBERS
      ======================================================== */

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from('members')
        .select('id,name,email')
        .eq('hostel_id', hostelId)
        .order('name');

      if (memberError) {
        throw memberError;
      }

      /* ========================================================
         LOAD MEAL PREFERENCES

         IMPORTANT:
         এখানে members relationship ব্যবহার করছি না।

         আগের code:
         member:members(name,email)

         Relationship problem হলে query fail করত।

         এখন আলাদা query করে client-side join করছি।
      ======================================================== */

      const {
        data: prefData,
        error: prefError,
      } = await supabase
        .from('meal_preferences')
        .select(
          `
          id,
          meal_id,
          meal_date,
          member_id,
          meal_time,
          preferred_item,
          status
          `
        )
        .eq('hostel_id', hostelId)
        .gte('meal_date', today)
        .order('meal_date')
        .order('meal_time');

      if (prefError) {
        throw prefError;
      }

      /* ========================================================
         CREATE MEMBER MAP
      ======================================================== */

      const memberMap = new Map<string, Member>();

      (memberData || []).forEach(
        (member: any) => {
          memberMap.set(member.id, member);
        }
      );

      /* ========================================================
         MERGE MEMBER + PREFERENCE
      ======================================================== */

      const normalizedPreferences: Preference[] =
        (prefData || []).map((preference: any) => ({
          ...preference,
          member:
            memberMap.get(preference.member_id) ||
            null,
        }));

      /* ========================================================
         SET STATE
      ======================================================== */

      const loadedMeals =
        (mealData || []) as Meal[];

      const loadedMembers =
        (memberData || []) as Member[];

      setMeals(loadedMeals);

      setMembers(loadedMembers);

      setPreferences(
        normalizedPreferences
      );

      /* ========================================================
         SET DEFAULT DATE SAFELY

         IMPORTANT:
         Empty meals হলে selectedDate empty থাকবে।
         কিন্তু UI crash করবে না।
      ======================================================== */

      if (loadedMeals.length > 0) {
        setSelectedDate((current) => {
          if (
            current &&
            loadedMeals.some(
              (meal) => meal.date === current
            )
          ) {
            return current;
          }

          return loadedMeals[0].date;
        });
      } else {
        setSelectedDate('');
      }
    } catch (error: any) {
      console.error(
        'Meal Preferences Load Error:',
        error
      );

      setErrorMessage(
        error?.message ||
          'Could not load meal preferences.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     CURRENT MEAL
  ============================================================ */

  const currentMeal = useMemo(() => {
    if (!selectedDate) {
      return null;
    }

    return (
      meals.find(
        (meal) =>
          meal.date === selectedDate
      ) || null
    );
  }, [meals, selectedDate]);

  /* ============================================================
     CURRENT PREFERENCES
  ============================================================ */

  const currentPreferences = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return preferences.filter(
      (preference) =>
        preference.meal_date ===
          selectedDate &&
        preference.meal_time === mealTime
    );
  }, [
    preferences,
    selectedDate,
    mealTime,
  ]);

  /* ============================================================
     SUMMARY
  ============================================================ */

  const summary = useMemo<Summary[]>(() => {
    const map = new Map<string, number>();

    currentPreferences.forEach(
      (preference) => {
        const item =
          preference.preferred_item
            ?.trim();

        if (!item) {
          return;
        }

        map.set(
          item,
          (map.get(item) || 0) + 1
        );
      }
    );

    return Array.from(map.entries())
      .map(([item, count]) => ({
        item,
        count,
      }))
      .sort(
        (a, b) =>
          b.count - a.count
      );
  }, [currentPreferences]);

  /* ============================================================
     SUBMITTED MEMBERS
  ============================================================ */

  const submittedMemberIds =
    useMemo(() => {
      return new Set(
        currentPreferences.map(
          (preference) =>
            preference.member_id
        )
      );
    }, [currentPreferences]);

  /* ============================================================
     MISSING MEMBERS
  ============================================================ */

  const missingMembers = useMemo(() => {
    return members.filter(
      (member) =>
        !submittedMemberIds.has(
          member.id
        )
    );
  }, [
    members,
    submittedMemberIds,
  ]);

  /* ============================================================
     SEARCH
  ============================================================ */

  const filteredPreferences =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return currentPreferences;
      }

      return currentPreferences.filter(
        (preference) =>
          preference.member?.name
            ?.toLowerCase()
            .includes(query) ||
          preference.member?.email
            ?.toLowerCase()
            .includes(query) ||
          preference.preferred_item
            ?.toLowerCase()
            .includes(query)
      );
    }, [
      currentPreferences,
      search,
    ]);

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </AdminLayout>
    );
  }

  /* ============================================================
     ERROR
  ============================================================ */

  if (errorMessage) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto py-10">
          <div
            className={`rounded-3xl border p-6 ${
              isDark
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="text-red-500 mt-1"
                size={22}
              />

              <div>
                <h2
                  className={`font-bold text-lg ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >
                  Could not load Meal Preferences
                </h2>

                <p className="text-sm text-red-500 mt-2">
                  {errorMessage}
                </p>

                <button
                  onClick={loadData}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  /* ============================================================
     MAIN UI
  ============================================================ */

  return (
    <AdminLayout>
      <div className="w-full max-w-7xl mx-auto">

        {/* ======================================================
           HEADER
        ====================================================== */}

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

        {/* ======================================================
           NO MEALS
        ====================================================== */}

        {meals.length === 0 ? (
          <div
            className={`rounded-3xl border p-10 text-center ${
              isDark
                ? 'bg-slate-800/50 border-white/5'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <Utensils
              size={42}
              className="mx-auto text-slate-400"
            />

            <h2
              className={`text-xl font-bold mt-4 ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              No meals available
            </h2>

            <p className="text-sm text-slate-500 mt-2">
              There are no upcoming meals available
              for this hostel.
            </p>

            <button
              onClick={loadData}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        ) : (
          <>
            {/* ==================================================
               FILTER
            ================================================== */}

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
                    {meals.map((meal) => (
                      <option
                        key={meal.id}
                        value={meal.date}
                      >
                        {formatDate(meal.date)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* MEAL */}

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

            {/* ==================================================
               MENU INFO
            ================================================== */}

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

            {/* ==================================================
               STATS
            ================================================== */}

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

            {/* ==================================================
               SUMMARY
            ================================================== */}

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
                    {formatDate(selectedDate)}
                    {' • '}
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
                  No preference submitted yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {summary.map((item) => (
                    <div
                      key={item.item}
                      className={`flex items-center justify-between p-4 rounded-2xl ${
                        isDark
                          ? 'bg-slate-900/70'
                          : 'bg-slate-50'
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          isDark
                            ? 'text-white'
                            : 'text-slate-800'
                        }`}
                      >
                        {item.item}
                      </span>

                      <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ==================================================
               PREFERENCE TABLE
            ================================================== */}

            <div
              className={`rounded-3xl border overflow-hidden ${
                isDark
                  ? 'bg-slate-800/50 border-white/5'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="p-5 border-b border-slate-200/10">
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

              {filteredPreferences.length ===
              0 ? (
                <div className="text-center py-10 text-sm text-slate-500">
                  No preferences found.
                </div>
              ) : (
                <div className="overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead>
                      <tr
                        className={
                          isDark
                            ? 'bg-slate-900/50'
                            : 'bg-slate-50'
                        }
                      >
                        <th className="text-left px-5 py-4 font-bold text-slate-500">
                          Member
                        </th>

                        <th className="text-left px-5 py-4 font-bold text-slate-500">
                          Meal
                        </th>

                        <th className="text-left px-5 py-4 font-bold text-slate-500">
                          Preference
                        </th>

                        <th className="text-left px-5 py-4 font-bold text-slate-500">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPreferences.map(
                        (preference) => (
                          <tr
                            key={preference.id}
                            className="border-t border-slate-200/10"
                          >
                            <td className="px-5 py-4">
                              <div>
                                <p
                                  className={`font-semibold ${
                                    isDark
                                      ? 'text-white'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {preference.member
                                    ?.name ||
                                    'Unknown Member'}
                                </p>

                                <p className="text-xs text-slate-500 mt-1">
                                  {preference.member
                                    ?.email ||
                                    'No email'}
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-slate-500">
                              {preference.meal_time ===
                              'day'
                                ? 'Lunch'
                                : 'Dinner'}
                            </td>

                            <td
                              className={`px-5 py-4 font-medium ${
                                isDark
                                  ? 'text-white'
                                  : 'text-slate-800'
                              }`}
                            >
                              {preference.preferred_item ||
                                'Not specified'}
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                                  preference.status ===
                                  'confirmed'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {preference.status ||
                                  'pending'}
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

            {/* ==================================================
               MISSING MEMBERS
            ================================================== */}

            {missingMembers.length > 0 && (
              <div
                className={`rounded-3xl border p-5 mt-6 ${
                  isDark
                    ? 'bg-slate-800/50 border-white/5'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle
                    size={20}
                    className="text-orange-500"
                  />

                  <h2
                    className={`font-bold ${
                      isDark
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    Members Who Have Not Submitted
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                  {missingMembers.map(
                    (member) => (
                      <div
                        key={member.id}
                        className={`p-4 rounded-2xl ${
                          isDark
                            ? 'bg-slate-900/70'
                            : 'bg-slate-50'
                        }`}
                      >
                        <p
                          className={`font-semibold ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >
                          {member.name}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {member.email}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

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
          className={`p-2.5 rounded-xl ${
            dark
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'bg-indigo-50 text-indigo-600'
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500">
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