import { useEffect, useState } from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Moon,
  RefreshCw,
  Sun,
  Utensils,
} from 'lucide-react';

import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';


type Preference = {
  id: string;
  preference_date: string;
  meal_time: 'day' | 'night';
  meal_name: string;
  cooking_comment: string | null;
};


export default function MemberMealPreferences() {

  const { profile } = useAuth();

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [mealTime, setMealTime] =
    useState<'day' | 'night'>('day');

  const [mealName, setMealName] =
    useState('');

  const [cookingComment, setCookingComment] =
    useState('');

  const [preferences, setPreferences] =
    useState<Preference[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [isDark, setIsDark] =
    useState(
      () =>
        localStorage.getItem('memberTheme') !== 'light'
    );


  useEffect(() => {

    const interval = window.setInterval(() => {

      setIsDark(
        localStorage.getItem('memberTheme') !== 'light'
      );

    }, 500);

    return () =>
      window.clearInterval(interval);

  }, []);


  useEffect(() => {

    if (profile) {
      loadPreferences();
    }

  }, [profile, date]);


  const loadPreferences = async () => {

    try {

      setLoading(true);
      setMessage('');

      const memberId =
        (profile as any)?.id;

      if (!memberId) {

        setPreferences([]);

        return;

      }

      const {
        data,
        error,
      } = await supabase

        .from('member_meal_preferences')

        .select(`
          id,
          preference_date,
          meal_time,
          meal_name,
          cooking_comment
        `)

        .eq('member_id', memberId)

        .eq('preference_date', date)

        .order('meal_time', {
          ascending: true,
        });


      if (error) {
        throw error;
      }


      const loaded =
        (data || []) as Preference[];

      setPreferences(loaded);


      const current =
        loaded.find(
          item =>
            item.meal_time === mealTime
        );


      if (current) {

        setMealName(
          current.meal_name || ''
        );

        setCookingComment(
          current.cooking_comment || ''
        );

      } else {

        setMealName('');
        setCookingComment('');

      }

    } catch (error: any) {

      console.error(
        'Meal preference load error:',
        error
      );

      setMessage(
        error?.message ||
        'Could not load preferences.'
      );

    } finally {

      setLoading(false);

    }

  };


  const changeMealTime =
    (
      value: 'day' | 'night'
    ) => {

      setMealTime(value);

      const existing =
        preferences.find(
          item =>
            item.meal_time === value
        );


      if (existing) {

        setMealName(
          existing.meal_name
        );

        setCookingComment(
          existing.cooking_comment || ''
        );

      } else {

        setMealName('');
        setCookingComment('');

      }

    };


  const savePreference = async () => {

    try {

      setMessage('');

      const memberId =
        (profile as any)?.id;

      const hostelId =
        (profile as any)?.hostel_id;


      if (!memberId || !hostelId) {

        throw new Error(
          'Member information not found.'
        );

      }


      if (!date) {

        throw new Error(
          'Please select a date.'
        );

      }


      if (!mealName.trim()) {

        throw new Error(
          'Please enter the meal name.'
        );

      }


      setSaving(true);


      const {
        error,
      } = await supabase

        .from('member_meal_preferences')

        .upsert(
          {
            hostel_id: hostelId,

            member_id: memberId,

            preference_date: date,

            meal_time: mealTime,

            meal_name: mealName.trim(),

            cooking_comment:
              cookingComment.trim() || null,
          },
          {
            onConflict:
              'member_id,preference_date,meal_time',
          }
        );


      if (error) {
        throw error;
      }


      setMessage(
        `${
          mealTime === 'day'
            ? 'Day'
            : 'Night'
        } preference saved successfully.`
      );


      await loadPreferences();

    } catch (error: any) {

      console.error(
        'Save preference error:',
        error
      );

      setMessage(
        error?.message ||
        'Could not save preference.'
      );

    } finally {

      setSaving(false);

    }

  };


  const deletePreference =
    async (
      preferenceId: string
    ) => {

      try {

        const {
          error,
        } = await supabase

          .from('member_meal_preferences')

          .delete()

          .eq('id', preferenceId);


        if (error) {
          throw error;
        }


        setMealName('');
        setCookingComment('');

        setMessage(
          'Preference removed.'
        );

        await loadPreferences();

      } catch (error: any) {

        setMessage(
          error?.message ||
          'Could not remove preference.'
        );

      }

    };


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


  const currentPreference =
    preferences.find(
      item =>
        item.meal_time === mealTime
    );


  return (

    <MemberLayout>

      <div className="w-full max-w-5xl mx-auto">


        {/* HEADER */}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

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

                Meal Preference

              </h1>

            </div>


            <p className="text-sm text-slate-500 mt-2">

              Tell the manager what meal you want
              and how you want it cooked.

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


        {/* FORM */}

        <div
          className={`rounded-3xl border p-6 ${
            isDark
              ? 'bg-slate-800/60 border-white/5'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >


          {/* DATE */}

          <div className="mb-6">

            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">

              Preference Date

            </label>


            <div className="relative mt-2">

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
                className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />

            </div>

          </div>


          {/* DAY / NIGHT */}

          <div className="mb-6">

            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">

              Select Meal Time

            </label>


            <div className="grid grid-cols-2 gap-3 mt-2">


              <button
                type="button"
                onClick={() =>
                  changeMealTime('day')
                }
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 font-bold transition ${
                  mealTime === 'day'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : isDark
                      ? 'bg-slate-900 border-white/10 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >

                <Sun size={20} />

                Day

              </button>


              <button
                type="button"
                onClick={() =>
                  changeMealTime('night')
                }
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 font-bold transition ${
                  mealTime === 'night'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : isDark
                      ? 'bg-slate-900 border-white/10 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >

                <Moon size={20} />

                Night

              </button>

            </div>

          </div>


          {/* MEAL NAME */}

          <div className="mb-6">

            <label
              className={`text-sm font-bold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >

              Meal Name

            </label>


            <input
              type="text"
              value={mealName}
              onChange={e =>
                setMealName(e.target.value)
              }
              placeholder="Example: Chicken Curry"
              className={`w-full mt-2 px-4 py-3 rounded-xl border outline-none ${
                isDark
                  ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            />

          </div>


          {/* COMMENT */}

          <div className="mb-6">

            <label
              className={`text-sm font-bold ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >

              How should it be cooked?

            </label>


            <textarea
              value={cookingComment}
              onChange={e =>
                setCookingComment(e.target.value)
              }
              rows={5}
              placeholder="Example: কম ঝাল, আলু বেশি, ঝোল একটু বেশি রাখতে হবে..."
              className={`w-full mt-2 px-4 py-3 rounded-xl border outline-none resize-none ${
                isDark
                  ? 'bg-slate-900 border-white/10 text-white placeholder:text-slate-600'
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
            />

          </div>


          {/* MESSAGE */}

          {message && (

            <div
              className={`mb-5 p-4 rounded-xl text-sm ${
                message.includes('successfully') ||
                message.includes('removed')
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >

              {message}

            </div>

          )}


          {/* SAVE */}

          <button
            type="button"
            disabled={saving}
            onClick={savePreference}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
          >

            {saving ? (
              <Loader2
                size={19}
                className="animate-spin"
              />
            ) : (
              <CheckCircle2 size={19} />
            )}

            {saving
              ? 'Saving...'
              : `Save ${
                  mealTime === 'day'
                    ? 'Day'
                    : 'Night'
                } Preference`
            }

          </button>


          {/* CURRENT */}

          {currentPreference && (

            <div
              className={`mt-6 p-5 rounded-2xl border ${
                isDark
                  ? 'bg-slate-900/60 border-white/5'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >

              <div className="flex items-start justify-between gap-4">

                <div>

                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">

                    Current Preference

                  </p>


                  <h3
                    className={`text-lg font-bold mt-2 ${
                      isDark
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >

                    {currentPreference.meal_name}

                  </h3>


                  {currentPreference.cooking_comment && (

                    <p className="text-sm text-slate-500 mt-2">

                      {currentPreference.cooking_comment}

                    </p>

                  )}

                </div>


                <button
                  type="button"
                  onClick={() =>
                    deletePreference(
                      currentPreference.id
                    )
                  }
                  className="text-sm text-red-500 font-semibold"
                >

                  Remove

                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </MemberLayout>

  );

}

