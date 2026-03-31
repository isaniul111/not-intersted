import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import MemberLayout from '../../components/member/MemberLayout';
import { Calendar, CheckCircle, Circle, Utensils, Sun, Moon, Activity } from 'lucide-react';

type MealWithRecord = {
  id: string;
  date: string;
  record: {
    id: string;
    day_meal: boolean;
    night_meal: boolean;
  } | null;
};

export default function MemberMeals() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<MealWithRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchMeals();
    }
  }, [profile]);

  const fetchMeals = async () => {
    try {
      const memberId = (profile as any).id;
      const hostelId = (profile as any).hostel_id;

      const { data: mealsData, error } = await supabase
        .from('meals')
        .select('*')
        .eq('hostel_id', hostelId)
        .order('date', { ascending: false });

      if (error) throw error;

      const mealsWithRecords = await Promise.all(
        (mealsData || []).map(async (meal) => {
          const { data: record } = await supabase
            .from('meal_records')
            .select('*')
            .eq('meal_id', meal.id)
            .eq('member_id', memberId)
            .maybeSingle();

          return {
            id: meal.id,
            date: meal.date,
            record: record || null,
          };
        })
      );

      setMeals(mealsWithRecords);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMeal = async (mealId: string, recordId: string | undefined, type: 'day' | 'night') => {
    try {
      const memberId = (profile as any).id;

      if (recordId) {
        const currentRecord = meals.find((m) => m.id === mealId)?.record;
        if (!currentRecord) return;

        const { error } = await supabase
          .from('meal_records')
          .update({
            [type === 'day' ? 'day_meal' : 'night_meal']:
              type === 'day' ? !currentRecord.day_meal : !currentRecord.night_meal,
          })
          .eq('id', recordId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('meal_records').insert({
          meal_id: mealId,
          member_id: memberId,
          day_meal: type === 'day',
          night_meal: type === 'night',
        });

        if (error) throw error;
      }

      await fetchMeals();
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

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
      <div className="relative w-full max-w-4xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 lg:mb-12"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Meal Selections
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your daily meal preferences to update your balance and notify the kitchen.
          </p>
        </motion.div>

        {/* MEAL CARDS LIST */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4 sm:space-y-6"
        >
          {meals.length > 0 ? (
            meals.map((meal) => {
              const mealDate = new Date(meal.date);
              const isToday = mealDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

              return (
                <motion.div
                  variants={itemVariants}
                  key={meal.id}
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
                      onClick={() => toggleMeal(meal.id, meal.record?.id, 'day')}
                      className={`group relative overflow-hidden flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 ${
                        meal.record?.day_meal
                          ? (isDark 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' 
                              : 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm')
                          : (isDark 
                              ? 'bg-slate-900/40 border-slate-700/50 hover:border-amber-500/30 text-slate-400 hover:text-amber-400' 
                              : 'bg-slate-50 border-slate-200 hover:border-amber-300 text-slate-500 hover:text-amber-600 hover:bg-white')
                      }`}
                    >
                      {/* Decorative Background Glow on Active */}
                      {meal.record?.day_meal && isDark && (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                      )}
                      
                      {meal.record?.day_meal ? (
                        <CheckCircle className="w-5 h-5 fill-current text-amber-500" strokeWidth={1.5} />
                      ) : (
                        <Circle className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Sun className={`w-4 h-4 ${meal.record?.day_meal ? '' : 'opacity-50 group-hover:opacity-100 transition-opacity'}`} />
                        <span className="font-bold tracking-wide">Day Meal</span>
                      </div>
                    </button>

                    {/* Night Meal Button */}
                    <button
                      onClick={() => toggleMeal(meal.id, meal.record?.id, 'night')}
                      className={`group relative overflow-hidden flex items-center justify-center gap-3 p-5 rounded-2xl border-2 transition-all duration-300 ${
                        meal.record?.night_meal
                          ? (isDark 
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                              : 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm')
                          : (isDark 
                              ? 'bg-slate-900/40 border-slate-700/50 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400' 
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-300 text-slate-500 hover:text-indigo-600 hover:bg-white')
                      }`}
                    >
                      {/* Decorative Background Glow on Active */}
                      {meal.record?.night_meal && isDark && (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                      )}

                      {meal.record?.night_meal ? (
                        <CheckCircle className="w-5 h-5 fill-current text-indigo-500" strokeWidth={1.5} />
                      ) : (
                        <Circle className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" strokeWidth={1.5} />
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Moon className={`w-4 h-4 ${meal.record?.night_meal ? '' : 'opacity-50 group-hover:opacity-100 transition-opacity'}`} />
                        <span className="font-bold tracking-wide">Night Meal</span>
                      </div>
                    </button>

                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div variants={itemVariants} className={`p-12 rounded-3xl border text-center ${
              isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col items-center justify-center opacity-60">
                <Utensils className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No Meals Scheduled</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  The admin hasn't created any meal charts yet.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

      </div>
    </MemberLayout>
  );
}