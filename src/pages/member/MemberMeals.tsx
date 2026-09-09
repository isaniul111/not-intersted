import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Activity, Moon, Sun, Utensils } from 'lucide-react';
import MemberLayout from '../../components/member/MemberLayout';
import { useMealsData } from './useMealsData';

export default function MemberMeals() {
  const { meals, loading, isDark } = useMealsData();

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading meal schedules...
          </p>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="w-full max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Food Schedule</p>
          <h1 className={`text-3xl sm:text-4xl font-extrabold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Meals
          </h1>
          <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            View the daily menu. Use <b>Meal Preference</b> from the sidebar to choose whether you are taking lunch or dinner.
          </p>
        </motion.div>

        {meals.length === 0 ? (
          <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200'}`}>
            <Utensils className={`w-14 h-14 mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No Meals Scheduled
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              The admin has not created any meal charts yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {meals.map((meal, index) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-3xl border p-5 ${
                  isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-widest font-bold text-indigo-500">
                    {meal.date}
                  </p>
                </div>

                <div className="space-y-3">
                  <MenuRow
                    icon={<Sun size={19} className="text-amber-500" />}
                    label="Lunch"
                    value={meal.day_menu_name || 'Menu not set'}
                    dark={isDark}
                  />
                  <MenuRow
                    icon={<Moon size={19} className="text-indigo-500" />}
                    label="Dinner"
                    value={meal.night_menu_name || 'Menu not set'}
                    dark={isDark}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}

function MenuRow({
  icon,
  label,
  value,
  dark,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  dark: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-4 ${dark ? 'bg-white/[0.03]' : 'bg-slate-50'}`}>
      <div>{icon}</div>
      <div>
        <p className={`text-xs font-bold uppercase tracking-widest ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className={`font-bold mt-0.5 ${dark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      </div>
    </div>
  );
}
