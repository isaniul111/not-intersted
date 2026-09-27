import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  Utensils,
  Users,
} from 'lucide-react';

import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type MealRow = {
  id: string;
  date: string;
  day_menu_name: string | null;
  night_menu_name: string | null;
  day_preference: string | null;
  night_preference: string | null;
};

type PublicPreference = {
  id: string;
  meal_id: string;
  member_id: string;
  meal_time: 'day' | 'night';
  preferred_item: string;
  member?: {
    name: string;
  } | null;
  meal?: {
    date: string;
  } | null;
};


// ============================================================
// DATE FORMAT
// ============================================================

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(
    new Date(`${date}T00:00:00+06:00`)
  );


// ============================================================
// DHAKA DATE
// ============================================================

const getDhakaDate = () => {
  const parts = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).formatToParts(new Date());

  const get = (type: string) =>
    parts.find(
      (part) => part.type === type
    )?.value || '00';

  return `${get('year')}-${get(
    'month'
  )}-${get('day')}`;
};


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MemberMealPreferences() {
  const { profile } = useAuth();

  const [meals, setMeals] =
    useState<MealRow[]>([]);

  const [preferences, setPreferences] =
    useState<PublicPreference[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [savingKey, setSavingKey] =
    useState<string | null>(null);

  const [isDark, setIsDark] =
    useState(
      () =>
        localStorage.getItem(
          'memberTheme'
        ) !== 'light'
    );

  const today = useMemo(
    () => getDhakaDate(),
    []
  );


  // ============================================================
  // THEME
  // ============================================================

  useEffect(() => {
    const id = window.setInterval(() => {
      setIsDark(
        localStorage.getItem(
          'memberTheme'
        ) !== 'light'
      );
    }, 500);

    return () =>
      window.clearInterval(id);
  }, []);


  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);


  // ============================================================
  // 24-HOUR PREFERENCE RULE
  // ============================================================

  /*
   * No 08:00 AM / 08:00 PM locking.
   *
   * Member can edit:
   * - Today
   * - Tomorrow
   * - Future dates
   *
   * Past dates are kept read-only.
   */

  const isLocked = (date: string) => {
    return date < today;
  };


  // ============================================================
  // LOAD MEALS + PREFERENCES
  // ============================================================

  const loadData = async () => {
    try {
      setLoading(true);

      const hostelId =
        (profile as any)?.hostel_id;

      const memberId =
        (profile as any)?.id;

      if (!hostelId || !memberId) {
        setMeals([]);
        setPreferences([]);
        return;
      }

      const startDate = today;


      const [
        {
          data: mealData,
          error: mealError,
        },

        {
          data: prefData,
          error: prefError,
        },
      ] = await Promise.all([

        // --------------------------------------------------------
        // ADMIN PUBLISHED MEALS
        // --------------------------------------------------------

        supabase
          .from('meals')
          .select(
            `
            id,
            date,
            day_menu_name,
            night_menu_name
            `
          )
          .eq(
            'hostel_id',
            hostelId
          )
          .gte(
            'date',
            startDate
          )
          .order('date', {
            ascending: true,
          })
          .limit(31),


        // --------------------------------------------------------
        // MEMBER PREFERENCES
        // --------------------------------------------------------

        supabase
          .from('meal_preferences')
          .select(
            `
            id,
            meal_id,
            member_id,
            meal_time,
            preferred_item,
            member:members(name),
            meal:meals(date)
            `
          )
          .eq(
            'hostel_id',
            hostelId
          )
          .gte(
            'meal_date',
            startDate
          )
          .order(
            'meal_date',
            {
              ascending: true,
            }
          )
          .order(
            'meal_time',
            {
              ascending: true,
            }
          ),
      ]);


      if (mealError) {
        throw mealError;
      }

      if (prefError) {
        throw prefError;
      }


      // ----------------------------------------------------------
      // NORMALIZE PREFERENCES
      // ----------------------------------------------------------

      const prefRows =
        (prefData || []) as any[];


      const normalizedPreferences =
        prefRows.map((p) => ({
          ...p,

          member:
            Array.isArray(p.member)
              ? p.member[0]
              : p.member,

          meal:
            Array.isArray(p.meal)
              ? p.meal[0]
              : p.meal,
        }));


      setPreferences(
        normalizedPreferences
      );


      // ----------------------------------------------------------
      // ATTACH CURRENT MEMBER PREFERENCE
      // TO EACH MEAL
      // ----------------------------------------------------------

      const rows =
        (mealData || []).map(
          (meal: any) => {

            const dayPreference =
              prefRows.find(
                (p) =>
                  p.meal_id ===
                    meal.id &&
                  p.member_id ===
                    memberId &&
                  p.meal_time ===
                    'day'
              );


            const nightPreference =
              prefRows.find(
                (p) =>
                  p.meal_id ===
                    meal.id &&
                  p.member_id ===
                    memberId &&
                  p.meal_time ===
                    'night'
              );


            return {
              id: meal.id,
              date: meal.date,

              day_menu_name:
                meal.day_menu_name,

              night_menu_name:
                meal.night_menu_name,

              day_preference:
                dayPreference
                  ?.preferred_item ||
                null,

              night_preference:
                nightPreference
                  ?.preferred_item ||
                null,
            };
          }
        );


      setMeals(rows);

    } catch (error: any) {

      console.error(
        'Meal preference load error:',
        error
      );

      alert(
        error?.message ||
          'Failed to load meal preferences.'
      );

    } finally {

      setLoading(false);

    }
  };


  // ============================================================
  // SAVE / UPDATE PREFERENCE
  // ============================================================

  const savePreference = async (
    meal: MealRow,
    mealTime: 'day' | 'night',
    value: string
  ) => {

    const savingId =
      `${meal.id}-${mealTime}`;


    // ----------------------------------------------------------
    // PAST DATE
    // ----------------------------------------------------------

    if (isLocked(meal.date)) {

      alert(
        'Past date preference cannot be changed.'
      );

      return;
    }


    // ----------------------------------------------------------
    // NO MENU
    // ----------------------------------------------------------

    if (!meal[
      mealTime === 'day'
        ? 'day_menu_name'
        : 'night_menu_name'
    ]) {

      alert(
        'Admin has not set the menu yet.'
      );

      return;
    }


    try {

      setSavingKey(savingId);


      const memberId =
        (profile as any)?.id;

      const hostelId =
        (profile as any)?.hostel_id;


      if (!memberId || !hostelId) {
        throw new Error(
          'Member information is missing.'
        );
      }


      // --------------------------------------------------------
      // REMOVE PREFERENCE
      // --------------------------------------------------------

      if (!value) {

        const {
          error,
        } = await supabase
          .from(
            'meal_preferences'
          )
          .delete()
          .eq(
            'meal_id',
            meal.id
          )
          .eq(
            'member_id',
            memberId
          )
          .eq(
            'meal_time',
            mealTime
          );


        if (error) {
          throw error;
        }

      }


      // --------------------------------------------------------
      // INSERT / UPDATE PREFERENCE
      // --------------------------------------------------------

      else {

        const {
          error,
        } = await supabase
          .from(
            'meal_preferences'
          )
          .upsert(
            {
              meal_id:
                meal.id,

              member_id:
                memberId,

              hostel_id:
                hostelId,

              meal_date:
                meal.date,

              meal_time:
                mealTime,

              preferred_item:
                value,
            },
            {
              onConflict:
                'meal_id,member_id,meal_time',
            }
          );


        if (error) {
          throw error;
        }

      }


      // Reload after save
      await loadData();

    } catch (error: any) {

      console.error(
        'Preference save error:',
        error
      );

      alert(
        error?.message ||
          'Could not save preference.'
      );

    } finally {

      setSavingKey(null);

    }
  };


  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {

    return (
      <MemberLayout>

        <div className="min-h-[70vh] flex items-center justify-center">

          <Loader2
            className="w-9 h-9 animate-spin text-indigo-500"
          />

        </div>

      </MemberLayout>
    );
  }


  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <MemberLayout>

      <div className="w-full max-w-6xl mx-auto">


        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

          <div>

            <div className="flex items-center gap-3 mb-2">

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
                Meal Preference
              </h1>

            </div>


            <p
              className={`text-sm ${
                isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              Choose your preferred menu
              item for each meal.
            </p>

          </div>


          <button
            onClick={loadData}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${
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
            INFORMATION
        ====================================================== */}

        <div
          className={`rounded-3xl border p-5 mb-6 ${
            isDark
              ? 'bg-indigo-500/5 border-indigo-500/10'
              : 'bg-indigo-50 border-indigo-100'
          }`}
        >

          <div className="flex gap-3">

            <CalendarDays
              size={20}
              className="text-indigo-500 mt-0.5"
            />


            <div>

              <p
                className={`font-bold ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                24-Hour Preference
              </p>


              <p className="text-sm text-slate-500 mt-1">
                You can select or change your
                preference anytime during the day.
              </p>


              <p className="text-xs text-slate-500 mt-1">
                There is no 08:00 AM or 08:00 PM
                lock. Past dates are kept read-only.
              </p>

            </div>

          </div>

        </div>


        {/* ======================================================
            MEALS
        ====================================================== */}

        {meals.length === 0 ? (

          <div
            className={`rounded-3xl border p-12 text-center ${
              isDark
                ? 'bg-slate-800/40 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <CalendarDays
              className="w-12 h-12 mx-auto mb-4 text-slate-400"
            />


            <h2
              className={`font-bold text-lg ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              No meal charts available
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Admin has not published any meal menu yet.
            </p>

          </div>

        ) : (

          <div className="space-y-5">

            {meals.map(
              (meal, index) => {

                const pastDate =
                  isLocked(
                    meal.date
                  );


                return (
                  <motion.div
                    key={meal.id}
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.02,
                    }}
                    className={`rounded-3xl border p-5 sm:p-6 ${
                      isDark
                        ? 'bg-slate-800/50 border-white/5'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >


                    {/* DATE HEADER */}

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">

                      <div>

                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">

                          {meal.date ===
                          today
                            ? 'Today'
                            : pastDate
                            ? 'Past'
                            : 'Upcoming'}

                        </p>


                        <h2
                          className={`text-xl font-bold mt-1 ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatDate(
                            meal.date
                          )}
                        </h2>

                      </div>


                      <p
                        className={`text-xs rounded-xl px-3 py-2 ${
                          isDark
                            ? 'bg-white/5 text-slate-400'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {pastDate
                          ? 'Past preference'
                          : 'Editable for the day'}
                      </p>

                    </div>


                    {/* =================================================
                        LUNCH + DINNER
                    ================================================= */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


                      {/* LUNCH */}

                      <PreferenceSelect
                        icon={
                          <Sun
                            size={19}
                            className="text-amber-500"
                          />
                        }
                        label="Day / Lunch"
                        value={
                          meal.day_preference ||
                          ''
                        }
                        menu={
                          meal.day_menu_name
                        }
                        locked={
                          pastDate
                        }
                        saving={
                          savingKey ===
                          `${meal.id}-day`
                        }
                        dark={
                          isDark
                        }
                        onChange={(
                          value
                        ) =>
                          savePreference(
                            meal,
                            'day',
                            value
                          )
                        }
                      />


                      {/* DINNER */}

                      <PreferenceSelect
                        icon={
                          <Moon
                            size={19}
                            className="text-indigo-500"
                          />
                        }
                        label="Night / Dinner"
                        value={
                          meal.night_preference ||
                          ''
                        }
                        menu={
                          meal.night_menu_name
                        }
                        locked={
                          pastDate
                        }
                        saving={
                          savingKey ===
                          `${meal.id}-night`
                        }
                        dark={
                          isDark
                        }
                        onChange={(
                          value
                        ) =>
                          savePreference(
                            meal,
                            'night',
                            value
                          )
                        }
                      />

                    </div>

                  </motion.div>
                );
              }
            )}

          </div>
        )}


        {/* ======================================================
            EVERYONE'S PREFERENCE
        ====================================================== */}

        <div
          className={`mt-8 rounded-3xl border overflow-hidden ${
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

            <div className="flex items-center gap-2">

              <Users
                size={19}
                className="text-indigo-500"
              />


              <h2
                className={`font-bold text-lg ${
                  isDark
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                Everyone's Preferences
              </h2>

            </div>


            <p className="text-xs mt-1 text-slate-500">
              Submitted preferences from members
              of your mess.
            </p>

          </div>


          {preferences.length === 0 ? (

            <div className="p-10 text-center text-sm text-slate-500">
              No preferences submitted yet.
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[720px] text-left">

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
                      Meal
                    </th>


                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Member
                    </th>


                    <th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">
                      Preference
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

                  {preferences.map(
                    (preference) => (

                      <tr
                        key={
                          preference.id
                        }
                      >

                        <td className="px-5 py-3 text-sm text-slate-400">

                          {preference.meal?.date
                            ? formatDate(
                                preference
                                  .meal
                                  .date
                              )
                            : '-'}

                        </td>


                        <td className="px-5 py-3 text-sm font-semibold text-slate-400">

                          {preference.meal_time ===
                          'day'
                            ? 'Lunch'
                            : 'Dinner'}

                        </td>


                        <td
                          className={`px-5 py-3 text-sm font-semibold ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >

                          {preference
                            .member
                            ?.name ||
                            'Member'}

                        </td>


                        <td
                          className={`px-5 py-3 text-sm ${
                            isDark
                              ? 'text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >

                          <span className="inline-flex items-center gap-2">

                            <Check
                              size={15}
                              className="text-emerald-500"
                            />

                            {
                              preference.preferred_item
                            }

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

    </MemberLayout>
  );
}


// ============================================================
// PREFERENCE SELECT COMPONENT
// ============================================================

function PreferenceSelect({
  icon,
  label,
  value,
  menu,
  locked,
  saving,
  dark,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  menu: string | null;
  locked: boolean;
  saving: boolean;
  dark: boolean;
  onChange: (
    value: string
  ) => void;
}) {


  // ==========================================================
  // ADMIN'S MENU → MEMBER'S OPTIONS
  // ==========================================================

  /*
   * Admin sets:
   *
   * "Alu Bhorta"
   *
   * Member sees:
   *
   * Select preferred item
   * Alu Bhorta
   *
   *
   * If admin sets:
   *
   * "Alu Bhorta, Chicken Curry, Fish"
   *
   * Member sees:
   *
   * Alu Bhorta
   * Chicken Curry
   * Fish
   *
   * So Member cannot create an arbitrary food item.
   */

  const options = menu
    ? menu
        .split(',')
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
    : [];


  return (
    <div
      className={`rounded-2xl border p-4 ${
        dark
          ? 'bg-white/[0.02] border-white/5'
          : 'bg-slate-50 border-slate-200'
      }`}
    >


      {/* HEADER */}

      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">

          {icon}

          <span
            className={`font-bold ${
              dark
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            {label}
          </span>

        </div>


        {saving ? (

          <Loader2
            size={17}
            className="animate-spin text-indigo-500"
          />

        ) : value ? (

          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-500">

            <Check size={13} />

            SELECTED

          </span>

        ) : null}

      </div>


      {/* ADMIN MENU DISPLAY */}

      <div
        className={`mb-3 rounded-xl px-3 py-2 text-xs ${
          dark
            ? 'bg-indigo-500/10 text-indigo-300'
            : 'bg-indigo-50 text-indigo-700'
        }`}
      >

        <span className="font-semibold">
          Admin Menu:
        </span>{' '}

        {menu || 'Menu not set yet'}

      </div>


      {/* PREFERENCE SELECT */}

      <select
        disabled={
          locked ||
          saving ||
          !menu
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className={`w-full rounded-xl border px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 ${
          dark
            ? 'bg-slate-900/60 border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >

        <option value="">
          {!menu
            ? 'Admin has not set menu'
            : locked
            ? 'Past date'
            : value
            ? value
            : 'Select preferred item'}
        </option>


        {options.map(
          (option) => (

            <option
              key={option}
              value={option}
            >
              {option}
            </option>

          )
        )}

      </select>


      {/* STATUS */}

      <p className="text-[11px] mt-2 text-slate-500">

        {locked
          ? 'This is a past date and cannot be changed.'
          : menu
          ? 'You can change your preference anytime during this day.'
          : 'Admin needs to set the menu first.'}

      </p>

    </div>
  );
}

