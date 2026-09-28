import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  X,
  Utensils,
  Sun,
  Moon,
} from 'lucide-react';

import { MealWithRecord } from './useMealsData';

type MealCardProps = {
  meal: MealWithRecord;
  toggleMeal: (
    meal: MealWithRecord,
    type: 'day' | 'night'
  ) => void;
  isDark: boolean;
  itemVariants: any;
};

export default function MealCard({
  meal,
  toggleMeal,
  isDark,
  itemVariants,
}: MealCardProps) {

  const mealDate = new Date(meal.date);

  const dayOn =
    meal.record?.day_meal === true;

  const nightOn =
    meal.record?.night_meal === true;


  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
        isDark
          ? 'bg-slate-800/60 border-white/5 shadow-lg'
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >

      {/* =====================================================
          DATE HEADER
      ===================================================== */}

      <div
        className={`px-5 py-4 border-b ${
          isDark
            ? 'border-white/5'
            : 'border-slate-100'
        }`}
      >

        <div className="flex items-center gap-3">

          <div
            className={`p-2.5 rounded-xl ${
              isDark
                ? 'bg-indigo-500/10 text-indigo-400'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <Calendar size={19} />
          </div>


          <div>

            <h3
              className={`text-sm sm:text-base font-bold uppercase tracking-wider ${
                isDark
                  ? 'text-indigo-400'
                  : 'text-indigo-600'
              }`}
            >
              {mealDate.toLocaleDateString(
                'en-US',
                {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }
              )}
            </h3>

          </div>

        </div>

      </div>


      {/* =====================================================
          MEALS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5">


        {/* ===================================================
            DAY MEAL
        =================================================== */}

        <div
          className={`overflow-hidden rounded-2xl border ${
            isDark
              ? 'border-white/10 bg-slate-900/40'
              : 'border-slate-200 bg-slate-50'
          }`}
        >

          {/* IMAGE */}

          {meal.day_menu_image ? (

            <img
              src={meal.day_menu_image}
              alt={
                meal.day_menu_name ||
                'Day Meal'
              }
              className="w-full h-48 object-cover"
            />

          ) : (

            <div
              className={`w-full h-48 flex items-center justify-center ${
                isDark
                  ? 'bg-slate-900'
                  : 'bg-slate-100'
              }`}
            >

              <Utensils
                size={42}
                className="text-slate-400"
              />

            </div>

          )}


          <div className="p-5">

            {/* LABEL */}

            <div className="flex items-center gap-2 mb-3">

              <Sun
                size={18}
                className="text-amber-500"
              />

              <span className="text-xs font-bold uppercase tracking-widest text-amber-500">
                Day Meal
              </span>

            </div>


            {/* MENU NAME */}

            <h4
              className={`text-xl font-bold mb-5 ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              {meal.day_menu_name ||
                'Menu Not Set'}
            </h4>


            {/* ON / OFF BUTTON */}

            <button
              type="button"
              onClick={() =>
                toggleMeal(
                  meal,
                  'day'
                )
              }
              className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-200 active:scale-[0.98] ${
                dayOn
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
              }`}
            >

              {dayOn ? (

                <>
                  <Check size={18} />
                  Day ON
                </>

              ) : (

                <>
                  <X size={18} />
                  Day OFF
                </>

              )}

            </button>

          </div>

        </div>


        {/* ===================================================
            NIGHT MEAL
        =================================================== */}

        <div
          className={`overflow-hidden rounded-2xl border ${
            isDark
              ? 'border-white/10 bg-slate-900/40'
              : 'border-slate-200 bg-slate-50'
          }`}
        >

          {/* IMAGE */}

          {meal.night_menu_image ? (

            <img
              src={meal.night_menu_image}
              alt={
                meal.night_menu_name ||
                'Night Meal'
              }
              className="w-full h-48 object-cover"
            />

          ) : (

            <div
              className={`w-full h-48 flex items-center justify-center ${
                isDark
                  ? 'bg-slate-900'
                  : 'bg-slate-100'
              }`}
            >

              <Utensils
                size={42}
                className="text-slate-400"
              />

            </div>

          )}


          <div className="p-5">

            {/* LABEL */}

            <div className="flex items-center gap-2 mb-3">

              <Moon
                size={18}
                className="text-indigo-500"
              />

              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                Night Meal
              </span>

            </div>


            {/* MENU NAME */}

            <h4
              className={`text-xl font-bold mb-5 ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              {meal.night_menu_name ||
                'Menu Not Set'}
            </h4>


            {/* ON / OFF BUTTON */}

            <button
              type="button"
              onClick={() =>
                toggleMeal(
                  meal,
                  'night'
                )
              }
              className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-200 active:scale-[0.98] ${
                nightOn
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : isDark
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
              }`}
            >

              {nightOn ? (

                <>
                  <Check size={18} />
                  Night ON
                </>

              ) : (

                <>
                  <X size={18} />
                  Night OFF
                </>

              )}

            </button>

          </div>

        </div>

      </div>

    </motion.div>
  );
}
```

---

# 2. `src/pages/member/useMealsData.ts`

এখানেও **time restriction remove করতে হবে**। তোমার current code-এ `toggleMeal()` প্রথমেই 8 AM/8 PM check করছে।

পুরো file-টা এভাবে দাও:

```tsx
import { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';


export type MealWithRecord = {
  id: string;

  date: string;

  day_menu_name?: string | null;
  day_menu_image?: string | null;

  night_menu_name?: string | null;
  night_menu_image?: string | null;

  record: {
    id: string;
    day_meal: boolean;
    night_meal: boolean;
  } | null;
};


export function useMealsData() {

  const { profile } = useAuth();

  const [meals, setMeals] =
    useState<MealWithRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isDark, setIsDark] =
    useState(
      () =>
        localStorage.getItem(
          'memberTheme'
        ) !== 'light'
    );


  // ==========================================================
  // THEME
  // ==========================================================

  useEffect(() => {

    const checkTheme = () => {

      setIsDark(
        localStorage.getItem(
          'memberTheme'
        ) !== 'light'
      );

    };

    const interval =
      setInterval(
        checkTheme,
        100
      );

    return () =>
      clearInterval(interval);

  }, []);


  // ==========================================================
  // LOAD
  // ==========================================================

  useEffect(() => {

    if (profile) {
      fetchMeals();
    }

  }, [profile]);


  // ==========================================================
  // FETCH MEALS
  // ==========================================================

  const fetchMeals =
    async () => {

      try {

        setLoading(true);


        const memberId =
          (profile as any)?.id;

        const hostelId =
          (profile as any)?.hostel_id;


        if (
          !memberId ||
          !hostelId
        ) {

          setMeals([]);

          return;
        }


        // ----------------------------------------------------
        // GET ADMIN SELECTED MEALS
        // ----------------------------------------------------

        const {
          data: mealsData,
          error,
        } = await supabase
          .from('meals')
          .select('*')
          .eq(
            'hostel_id',
            hostelId
          )
          .order(
            'date',
            {
              ascending: false,
            }
          );


        if (error) {
          throw error;
        }


        // ----------------------------------------------------
        // GET MEMBER RECORD
        // ----------------------------------------------------

        const mealsWithRecords =
          await Promise.all(

            (mealsData || []).map(
              async (meal) => {

                const {
                  data: record,
                  error: recordError,
                } = await supabase
                  .from(
                    'meal_records'
                  )
                  .select(`
                    id,
                    day_meal,
                    night_meal
                  `)
                  .eq(
                    'meal_id',
                    meal.id
                  )
                  .eq(
                    'member_id',
                    memberId
                  )
                  .maybeSingle();


                if (
                  recordError &&
                  recordError.code !==
                    'PGRST116'
                ) {

                  console.error(
                    'Meal record error:',
                    recordError
                  );

                }


                return {

                  id:
                    meal.id,

                  date:
                    meal.date,

                  day_menu_name:
                    meal.day_menu_name,

                  day_menu_image:
                    meal.day_menu_image,

                  night_menu_name:
                    meal.night_menu_name,

                  night_menu_image:
                    meal.night_menu_image,

                  record:
                    record || null,

                };

              }
            )
          );


        setMeals(
          mealsWithRecords
        );

      } catch (error) {

        console.error(
          'Error fetching meals:',
          error
        );

      } finally {

        setLoading(false);

      }

    };


  // ==========================================================
  // TOGGLE DAY / NIGHT
  //
  // NO TIME LIMIT
  // NO 8 AM
  // NO 8 PM
  // NO LOCK
  // ==========================================================

  const toggleMeal =
    async (
      meal: MealWithRecord,
      type: 'day' | 'night'
    ) => {

      try {

        const memberId =
          (profile as any)?.id;


        if (!memberId) {

          throw new Error(
            'Member profile not found.'
          );

        }


        // ====================================================
        // EXISTING RECORD
        // ====================================================

        if (meal.record?.id) {

          const column =
            type === 'day'
              ? 'day_meal'
              : 'night_meal';


          const currentValue =
            type === 'day'
              ? meal.record.day_meal
              : meal.record.night_meal;


          const {
            error,
          } = await supabase
            .from(
              'meal_records'
            )
            .update({

              [column]:
                !currentValue,

            })
            .eq(
              'id',
              meal.record.id
            );


          if (error) {
            throw error;
          }

        }

        // ====================================================
        // NO RECORD YET
        // ====================================================

        else {

          const {
            error,
          } = await supabase
            .from(
              'meal_records'
            )
            .insert({

              meal_id:
                meal.id,

              member_id:
                memberId,

              day_meal:
                type === 'day',

              night_meal:
                type === 'night',

            });


          if (error) {
            throw error;
          }

        }


        // ====================================================
        // REFRESH UI
        // ====================================================

        await fetchMeals();

      } catch (error: any) {

        console.error(
          'Meal toggle error:',
          error
        );

        alert(
          error?.message ||
          'Could not update meal preference.'
        );

      }

    };


  return {
    meals,
    loading,
    isDark,
    toggleMeal,
  };

}
