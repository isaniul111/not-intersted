import { useEffect, useMemo, useState } from 'react';

import {
  CalendarDays,
  Loader2,
  Moon,
  RefreshCw,
  Search,
  Sun,
  User,
  Utensils,
} from 'lucide-react';

import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';


type Preference = {
  id: string;

  preference_date: string;

  meal_time:
    | 'day'
    | 'night';

  meal_name: string;

  cooking_comment:
    | string
    | null;

  member: {
    id: string;
    name: string;
    email: string;
  } | null;
};


const formatDate =
  (date: string) => {

    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'en-GB',
      {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      }
    ).format(
      new Date(
        `${date}T00:00:00+06:00`
      )
    );

  };


export default function MealPreferencesManagement() {

  const { profile } = useAuth();

  const [preferences, setPreferences] =
    useState<Preference[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [date, setDate] =
    useState('');

  const [mealTime, setMealTime] =
    useState<
      'all' |
      'day' |
      'night'
    >('all');

  const [isDark, setIsDark] =
    useState(
      () =>
        localStorage.getItem('adminTheme') !== 'light'
    );


  useEffect(() => {

    const interval =
      window.setInterval(() => {

        setIsDark(
          localStorage.getItem('adminTheme') !== 'light'
        );

      }, 500);

    return () =>
      window.clearInterval(interval);

  }, []);


  useEffect(() => {

    if (profile) {
      loadPreferences();
    }

  }, [profile]);


  const loadPreferences = async () => {

    try {

      setLoading(true);
      setError('');


      const hostelId =
        (profile as any)?.id;


      if (!hostelId) {

        throw new Error(
          'Admin hostel ID not found.'
        );

      }


      const {
        data: preferenceData,
        error: preferenceError,
      } = await supabase

        .from('member_meal_preferences')

        .select(`
          id,
          preference_date,
          meal_time,
          meal_name,
          cooking_comment,
          member_id
        `)

        .eq('hostel_id', hostelId)

        .order('preference_date', {
          ascending: false,
        })

        .order('meal_time', {
          ascending: true,
        });


      if (preferenceError) {
        throw preferenceError;
      }


      const memberIds =
        Array.from(
          new Set(
            (preferenceData || [])
              .map(
                (item: any) =>
                  item.member_id
              )
          )
        );


      let members: any[] = [];


      if (memberIds.length > 0) {

        const {
          data: memberData,
          error: memberError,
        } = await supabase

          .from('members')

          .select(
            'id,name,email'
          )

          .in(
            'id',
            memberIds
          );


        if (memberError) {
          throw memberError;
        }


        members =
          memberData || [];

      }


      const memberMap =
        new Map();


      members.forEach(member => {

        memberMap.set(
          member.id,
          member
        );

      });


      const result =
        (preferenceData || [])
          .map(
            (item: any) => ({

              id: item.id,

              preference_date:
                item.preference_date,

              meal_time:
                item.meal_time,

              meal_name:
                item.meal_name,

              cooking_comment:
                item.cooking_comment,

              member:
                memberMap.get(
                  item.member_id
                ) || null,

            })
          );


      setPreferences(result);

    } catch (error: any) {

      console.error(
        'Admin preference error:',
        error
      );

      setError(
        error?.message ||
        'Could not load preferences.'
      );

    } finally {

      setLoading(false);

    }

  };


  const filteredPreferences =
    useMemo(() => {

      const query =
        search.trim().toLowerCase();


      return preferences.filter(
        preference => {

          const dateMatch =
            !date ||
            preference.preference_date === date;


          const timeMatch =
            mealTime === 'all' ||
            preference.meal_time === mealTime;


          const searchMatch =
            !query ||

            preference.meal_name
              .toLowerCase()
              .includes(query) ||

            preference.member?.name
              ?.toLowerCase()
              .includes(query) ||

            preference.member?.email
              ?.toLowerCase()
              .includes(query) ||

            preference.cooking_comment
              ?.toLowerCase()
              .includes(query);


          return (
            dateMatch &&
            timeMatch &&
            searchMatch
          );

        }
      );

    }, [
      preferences,
      date,
      mealTime,
      search,
    ]);


  const dayCount =
    preferences.filter(
      item =>
        item.meal_time === 'day'
    ).length;


  const nightCount =
    preferences.filter(
      item =>
        item.meal_time === 'night'
    ).length;


  if (loading) {

    return (

      <AdminLayout>

        <div className="min-h-[70vh] flex items-center justify-center">

          <Loader2
            className="w-9 h-9 animate-spin text-indigo-500"
          />

        </div>

      </AdminLayout>

    );

  }


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


            <p className="text-sm text-slate-500 mt-2">

              View what each member wants
              and how they want it prepared.

            </p>

          </div>


          <button
            onClick={loadPreferences}
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


        {/* SUMMARY */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">


          <div
            className={`rounded-2xl border p-5 ${
              isDark
                ? 'bg-slate-800/60 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <div className="flex items-center gap-3">

              <Sun
                size={22}
                className="text-amber-500"
              />

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">

                  Day Preferences

                </p>


                <p
                  className={`text-2xl font-extrabold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >

                  {dayCount}

                </p>

              </div>

            </div>

          </div>


          <div
            className={`rounded-2xl border p-5 ${
              isDark
                ? 'bg-slate-800/60 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <div className="flex items-center gap-3">

              <Moon
                size={22}
                className="text-indigo-500"
              />

              <div>

                <p className="text-xs uppercase tracking-widest text-slate-500">

                  Night Preferences

                </p>


                <p
                  className={`text-2xl font-extrabold ${
                    isDark
                      ? 'text-white'
                      : 'text-slate-900'
                  }`}
                >

                  {nightCount}

                </p>

              </div>

            </div>

          </div>

        </div>


        {/* FILTER */}

        <div
          className={`rounded-3xl border p-4 mb-6 ${
            isDark
              ? 'bg-slate-800/60 border-white/5'
              : 'bg-white border-slate-200'
          }`}
        >

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


            <div className="relative">

              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                type="text"
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
                placeholder="Search member or meal..."
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200'
                }`}
              />

            </div>


            <div className="relative">

              <CalendarDays
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                type="date"
                value={date}
                onChange={e =>
                  setDate(e.target.value)
                }
                className={`w-full pl-11 pr-4 py-3 rounded-xl border ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200'
                }`}
              />

            </div>


            <div className="grid grid-cols-3 gap-2">

              <button
                onClick={() =>
                  setMealTime('all')
                }
                className={`rounded-xl font-bold text-sm ${
                  mealTime === 'all'
                    ? 'bg-indigo-600 text-white'
                    : isDark
                      ? 'bg-slate-900 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >

                All

              </button>


              <button
                onClick={() =>
                  setMealTime('day')
                }
                className={`rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${
                  mealTime === 'day'
                    ? 'bg-amber-500 text-white'
                    : isDark
                      ? 'bg-slate-900 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >

                <Sun size={15} />

                Day

              </button>


              <button
                onClick={() =>
                  setMealTime('night')
                }
                className={`rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${
                  mealTime === 'night'
                    ? 'bg-indigo-600 text-white'
                    : isDark
                      ? 'bg-slate-900 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >

                <Moon size={15} />

                Night

              </button>

            </div>

          </div>

        </div>


        {/* ERROR */}

        {error && (

          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 text-red-500">

            {error}

          </div>

        )}


        {/* EMPTY */}

        {filteredPreferences.length === 0 ? (

          <div
            className={`rounded-3xl border p-12 text-center ${
              isDark
                ? 'bg-slate-800/60 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <Utensils
              size={42}
              className="mx-auto text-slate-400"
            />


            <h2
              className={`mt-4 text-xl font-bold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >

              No preferences found

            </h2>


            <p className="text-sm text-slate-500 mt-2">

              No member has submitted a preference
              matching your filters.

            </p>

          </div>

        ) : (

          <div className="space-y-4">

            {filteredPreferences.map(
              preference => (

                <div
                  key={preference.id}
                  className={`rounded-3xl border p-5 ${
                    isDark
                      ? 'bg-slate-800/60 border-white/5'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >

                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">


                    {/* MEMBER */}

                    <div className="flex gap-4">

                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                          preference.meal_time === 'day'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                        }`}
                      >

                        <User size={22} />

                      </div>


                      <div>

                        <h3
                          className={`font-bold text-lg ${
                            isDark
                              ? 'text-white'
                              : 'text-slate-900'
                          }`}
                        >

                          {preference.member?.name ||
                            'Unknown Member'}

                        </h3>


                        <p className="text-sm text-slate-500">

                          {preference.member?.email || ''}

                        </p>


                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">

                          <CalendarDays size={14} />

                          {formatDate(
                            preference.preference_date
                          )}

                        </div>

                      </div>

                    </div>


                    {/* DAY NIGHT */}

                    <div
                      className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm w-fit ${
                        preference.meal_time === 'day'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-indigo-500/10 text-indigo-500'
                      }`}
                    >

                      {preference.meal_time === 'day'
                        ? <Sun size={17} />
                        : <Moon size={17} />
                      }

                      {preference.meal_time === 'day'
                        ? 'Day'
                        : 'Night'
                      }

                    </div>

                  </div>


                  {/* MEAL */}

                  <div
                    className={`mt-5 p-4 rounded-2xl ${
                      isDark
                        ? 'bg-slate-900/60'
                        : 'bg-slate-50'
                    }`}
                  >

                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">

                      Requested Meal

                    </p>


                    <h4
                      className={`text-xl font-extrabold mt-1 ${
                        isDark
                          ? 'text-white'
                          : 'text-slate-900'
                      }`}
                    >

                      {preference.meal_name}

                    </h4>

                  </div>


                  {/* COMMENT */}

                  <div className="mt-4">

                    <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">

                      Cooking Instruction / Comment

                    </p>


                    <p
                      className={`mt-2 text-sm leading-6 ${
                        isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >

                      {preference.cooking_comment ||
                        'No cooking instruction provided.'}

                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </AdminLayout>

  );

}

