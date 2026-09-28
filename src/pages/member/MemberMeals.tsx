import { motion } from 'framer-motion';

import {
  Activity,
  Check,
  Moon,
  Sun,
  Utensils,
  X,
} from 'lucide-react';

import MemberLayout from '../../components/member/MemberLayout';

import {
  useMealsData,
  type MealWithRecord,
} from './useMealsData';

export default function MemberMeals() {

  const {
    meals,
    loading,
    isDark,
    toggleMeal,
  } = useMealsData();

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <MemberLayout>

        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">

          <Activity
            className={`w-10 h-10 animate-pulse ${
              isDark
                ? 'text-indigo-400'
                : 'text-indigo-600'
            }`}
          />

          <p
            className={`text-sm font-medium ${
              isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            Loading meal schedules...
          </p>

        </div>

      </MemberLayout>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <MemberLayout>

      <div className="w-full max-w-6xl mx-auto">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8"
        >

          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
            Food Schedule
          </p>

          <h1
            className={`text-3xl sm:text-4xl font-extrabold mt-1 ${
              isDark
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            Meals
          </h1>

          <p
            className={`text-sm mt-2 ${
              isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            View admin-selected meals and
            choose Day / Night meal anytime.
          </p>

        </motion.div>

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {meals.length === 0 ? (

          <div
            className={`rounded-3xl border p-12 text-center ${
              isDark
                ? 'bg-slate-800/40 border-white/5'
                : 'bg-white border-slate-200'
            }`}
          >

            <Utensils
              className={`w-14 h-14 mx-auto mb-4 ${
                isDark
                  ? 'text-slate-500'
                  : 'text-slate-400'
              }`}
            />

            <h2
              className={`font-bold text-lg ${
                isDark
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              No Meals Scheduled
            </h2>

            <p
              className={`text-sm mt-1 ${
                isDark
                  ? 'text-slate-400'
                  : 'text-slate-500'
              }`}
            >
              The admin has not created any
              meal charts yet.
            </p>

          </div>

        ) : (

          <div className="space-y-6">

            {meals.map(
              (
                meal: MealWithRecord,
                index
              ) => {

                const daySelected =
                  meal.record
                    ?.day_meal ??
                  false;

                const nightSelected =
                  meal.record
                    ?.night_meal ??
                  false;

                return (
                  <motion.div
                    key={meal.id}
                    initial={{
                      opacity: 0,
                      y: 12,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        index * 0.03,
                    }}
                    className={`rounded-3xl border overflow-hidden ${
                      isDark
                        ? 'bg-slate-800/50 border-white/5'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >

                    {/* DATE */}

                    <div
                      className={`px-5 py-4 border-b ${
                        isDark
                          ? 'border-white/5'
                          : 'border-slate-100'
                      }`}
                    >

                      <p className="text-xs uppercase tracking-widest font-bold text-indigo-500">
                        {formatDate(
                          meal.date
                        )}
                      </p>

                    </div>

                    {/* DAY + NIGHT */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5">

                      <MealCard
                        meal={meal}
                        type="day"
                        selected={
                          daySelected
                        }
                        dark={isDark}
                        onToggle={() =>
                          toggleMeal(
                            meal,
                            'day'
                          )
                        }
                      />

                      <MealCard
                        meal={meal}
                        type="night"
                        selected={
                          nightSelected
                        }
                        dark={isDark}
                        onToggle={() =>
                          toggleMeal(
                            meal,
                            'night'
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

      </div>

    </MemberLayout>
  );
}


// ============================================================
// MEAL CARD
// ============================================================

function MealCard({
  meal,
  type,
  selected,
  dark,
  onToggle,
}: {
  meal: MealWithRecord;

  type:
    | 'day'
    | 'night';

  selected: boolean;

  dark: boolean;

  onToggle: () => void;
}) {

  const isDay =
    type === 'day';

  const name =
    isDay
      ? meal.day_menu_name
      : meal.night_menu_name;

  const image =
    isDay
      ? meal.day_menu_image
      : meal.night_menu_image;

  const Icon =
    isDay
      ? Sun
      : Moon;

  const label =
    isDay
      ? 'Day Meal'
      : 'Night Meal';

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        dark
          ? 'bg-slate-900/60 border-white/10'
          : 'bg-slate-50 border-slate-200'
      }`}
    >

      {/* IMAGE */}

      {image ? (

        <img
          src={image}
          alt={
            name ||
            label
          }
          className="w-full h-56 object-cover"
        />

      ) : (

        <div
          className={`h-56 flex items-center justify-center ${
            dark
              ? 'bg-slate-900'
              : 'bg-slate-100'
          }`}
        >

          <Utensils
            size={45}
            className="text-slate-400"
          />

        </div>
      )}

      <div className="p-5">

        {/* LABEL */}

        <div className="flex items-center gap-2 mb-3">

          <Icon
            size={20}
            className={
              isDay
                ? 'text-amber-500'
                : 'text-indigo-500'
            }
          />

          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              isDay
                ? 'text-amber-500'
                : 'text-indigo-500'
            }`}
          >
            {label}
          </span>

        </div>

        {/* MENU NAME */}

        <h3
          className={`text-xl font-bold ${
            dark
              ? 'text-white'
              : 'text-slate-900'
          }`}
        >
          {name ||
            'Menu Not Set Yet'}
        </h3>

        {/* ON / OFF */}

        {name && (

          <button
            onClick={onToggle}
            className={`mt-5 w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              selected
                ? 'bg-emerald-600 text-white'
                : dark
                ? 'bg-white/10 text-slate-300'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >

            {selected ? (
              <>
                <Check size={18} />
                {isDay
                  ? 'Day ON'
                  : 'Night ON'}
              </>
            ) : (
              <>
                <X size={18} />
                {isDay
                  ? 'Day OFF'
                  : 'Night OFF'}
              </>
            )}

          </button>

        )}

      </div>

    </div>
  );
}


// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  date: string
) {

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone:
        'Asia/Dhaka',
    }
  ).format(
    new Date(
      `${date}T00:00:00+06:00`
    )
  );
}