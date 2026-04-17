import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, Circle, Utensils, Clock, Lock } from 'lucide-react';
import { MealWithRecord } from './useMealsData';

type MealCardProps = {
  meal: MealWithRecord;
  toggleMeal: (meal: MealWithRecord, type: 'day' | 'night') => void;
  isDark: boolean;
  itemVariants: any;
};

export default function MealCard({ meal, toggleMeal, isDark, itemVariants }: MealCardProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const mealDate = new Date(meal.date);
  const isToday = mealDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

  const dayCutoff = new Date(`${meal.date}T08:00:00`);
  const nightCutoff = new Date(`${meal.date}T20:00:00`);

  const isDayLocked = now > dayCutoff;
  const isNightLocked = now > nightCutoff;

  const formatTimeLeft = (targetDate: Date) => {
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) return 'Locked';

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    if (h > 24) {
      const d = Math.floor(h / 24);
      return `Closes in ${d}d ${h % 24}h`;
    }
    return `Closes in ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`relative p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
        isDark 
          ? isToday 
            ? 'bg-indigo-900/20 border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]' 
            : 'bg-slate-800/60 border-white/5 shadow-lg'
          : isToday
            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
            : 'bg-white border-slate-200 shadow-sm hover:shadow-xl'
      }`}
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${
            isToday 
              ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
              : (isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {mealDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            {isToday ? (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'
              }`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                Today
              </div>
            ) : (
              <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Scheduled
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Meal Selection Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Day Meal Button */}
        <button
          onClick={() => !isDayLocked && toggleMeal(meal, 'day')}
          disabled={isDayLocked}
          className={`group relative overflow-hidden flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 ${
            isDayLocked 
              ? (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed grayscale')
              : meal.record?.day_meal
                ? (isDark 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' 
                    : 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm')
                : (isDark 
                    ? 'bg-slate-900/40 border-slate-700/50 hover:border-amber-500/30 text-slate-400 hover:text-amber-400' 
                    : 'bg-slate-50 border-slate-200 hover:border-amber-300 text-slate-500 hover:text-amber-600 hover:bg-white')
          }`}
        >
          {meal.record?.day_meal && isDark && !isDayLocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
          )}
          
          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <div className={`w-full flex items-center justify-center gap-1.5 py-1 px-3 rounded-t-lg text-[11px] font-bold tracking-wider ${
              isDayLocked 
                ? (isDark ? 'text-rose-500' : 'text-rose-600')
                : (isDark ? 'text-amber-400' : 'text-amber-600')
            }`}>
              {isDayLocked ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {formatTimeLeft(dayCutoff)}
            </div>

            {meal.day_menu_image ? (
              <img 
                src={meal.day_menu_image} 
                alt="Day Menu" 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 shadow-lg transition-transform ${
                  isDayLocked ? 'border-slate-500/20' : 'border-amber-500/30 group-hover:scale-105'
                }`} 
              />
            ) : (
              <div className={`p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Utensils className="w-8 h-8 opacity-40" />
              </div>
            )}

            <p className={`font-bold text-center mt-1 ${
              isDayLocked ? (isDark ? 'text-slate-500' : 'text-slate-400') : (isDark ? 'text-white' : 'text-slate-900')
            }`}>
              {meal.day_menu_name || 'Menu Not Set Yet'}
            </p>
          </div>
          
          <div className={`flex items-center gap-2 mt-2 relative z-10 px-4 py-1.5 rounded-full ${
            isDayLocked ? 'bg-transparent' : 'bg-black/5 dark:bg-black/20'
          }`}>
            {meal.record?.day_meal ? (
              <CheckCircle className={`w-5 h-5 fill-current ${isDayLocked ? 'text-slate-400' : 'text-amber-500'}`} strokeWidth={1.5} />
            ) : (
              <Circle className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            )}
            <span className="font-bold tracking-wide">Day Meal</span>
          </div>
        </button>

        {/* Night Meal Button */}
        <button
          onClick={() => !isNightLocked && toggleMeal(meal, 'night')}
          disabled={isNightLocked}
          className={`group relative overflow-hidden flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 ${
            isNightLocked 
              ? (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-70 cursor-not-allowed grayscale')
              : meal.record?.night_meal
                ? (isDark 
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                    : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm')
                : (isDark 
                    ? 'bg-slate-900/40 border-slate-700/50 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400' 
                    : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 hover:bg-white')
          }`}
        >
          {meal.record?.night_meal && isDark && !isNightLocked && (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center gap-2 w-full">
            <div className={`w-full flex items-center justify-center gap-1.5 py-1 px-3 rounded-t-lg text-[11px] font-bold tracking-wider ${
              isNightLocked 
                ? (isDark ? 'text-rose-500' : 'text-rose-600')
                : (isDark ? 'text-indigo-400' : 'text-indigo-600')
            }`}>
              {isNightLocked ? <Lock className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {formatTimeLeft(nightCutoff)}
            </div>

            {meal.night_menu_image ? (
              <img 
                src={meal.night_menu_image} 
                alt="Night Menu" 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 shadow-lg transition-transform ${
                  isNightLocked ? 'border-slate-500/20' : 'border-indigo-500/30 group-hover:scale-105'
                }`} 
              />
            ) : (
              <div className={`p-4 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Utensils className="w-8 h-8 opacity-40" />
              </div>
            )}

            <p className={`font-bold text-center mt-1 ${
              isNightLocked ? (isDark ? 'text-slate-500' : 'text-slate-400') : (isDark ? 'text-white' : 'text-slate-900')
            }`}>
              {meal.night_menu_name || 'Menu Not Set Yet'}
            </p>
          </div>
          
          <div className={`flex items-center gap-2 mt-2 relative z-10 px-4 py-1.5 rounded-full ${
            isNightLocked ? 'bg-transparent' : 'bg-black/5 dark:bg-black/20'
          }`}>
            {meal.record?.night_meal ? (
              <CheckCircle className={`w-5 h-5 fill-current ${isNightLocked ? 'text-slate-400' : 'text-indigo-500'}`} strokeWidth={1.5} />
            ) : (
              <Circle className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
            )}
            <span className="font-bold tracking-wide">Night Meal</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
}