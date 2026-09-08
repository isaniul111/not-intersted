import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Loader2, Moon, Sun, Utensils, X } from 'lucide-react';
import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type MealRow = {
  id: string;
  date: string;
  day_menu_name: string | null;
  night_menu_name: string | null;
  record: {
    id: string;
    day_meal: boolean;
    night_meal: boolean;
  } | null;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(`${date}T00:00:00+06:00`));

const getDhakaNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')) % 24,
  };
};

export default function MemberMealPreferences() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
    const interval = window.setInterval(checkTheme, 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) fetchMeals();
  }, [profile]);

  const fetchMeals = async () => {
    try {
      setLoading(true);
      const memberId = (profile as any)?.id;
      const hostelId = (profile as any)?.hostel_id;

      const { data: mealData, error } = await supabase
        .from('meals')
        .select('id,date,day_menu_name,night_menu_name')
        .eq('hostel_id', hostelId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(14);

      if (error) throw error;

      const rows = await Promise.all(
        (mealData || []).map(async (meal) => {
          const { data: record, error: recordError } = await supabase
            .from('meal_records')
            .select('id,day_meal,night_meal')
            .eq('meal_id', meal.id)
            .eq('member_id', memberId)
            .maybeSingle();

          if (recordError) throw recordError;

          return { ...meal, record: record || null };
        })
      );

      setMeals(rows);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to load meal preferences.');
    } finally {
      setLoading(false);
    }
  };

  const today = useMemo(() => getDhakaNow(), []);

  const isLocked = (date: string, type: 'day' | 'night') => {
    if (date < today.date) return true;
    if (date > today.date) return false;

    return type === 'day' ? today.hour >= 8 : today.hour >= 20;
  };

  const togglePreference = async (meal: MealRow, type: 'day' | 'night') => {
    const key = `${meal.id}-${type}`;

    if (isLocked(meal.date, type)) {
      alert(
        type === 'day'
          ? 'Lunch preference is locked after 08:00 AM.'
          : 'Dinner preference is locked after 08:00 PM.'
      );
      return;
    }

    try {
      setSavingKey(key);

      const currentDay = meal.record?.day_meal ?? false;
      const currentNight = meal.record?.night_meal ?? false;

      const payload = {
        meal_id: meal.id,
        member_id: (profile as any).id,
        day_meal: type === 'day' ? !currentDay : currentDay,
        night_meal: type === 'night' ? !currentNight : currentNight,
      };

      const { error } = await supabase
        .from('meal_records')
        .upsert(payload, { onConflict: 'meal_id,member_id' });

      if (error) throw error;

      await fetchMeals();
    } catch (error: any) {
      alert(error.message || 'Could not update preference.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <MemberLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-500" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="w-full max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <Utensils size={24} />
            </div>
            <h1 className={`text-3xl sm:text-4xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Meal Preference
            </h1>
          </div>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Choose your daily lunch and dinner. Lunch locks at 08:00 AM and dinner locks at 08:00 PM (Dhaka time).
          </p>
        </motion.div>

        {meals.length === 0 ? (
          <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200'}`}>
            <CalendarDays className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No meal charts available
            </h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Ask the admin to create the daily meal charts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meals.map((meal, index) => {
              const dayLocked = isLocked(meal.date, 'day');
              const nightLocked = isLocked(meal.date, 'night');

              return (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`rounded-3xl border p-5 sm:p-6 ${
                    isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                      <div className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {meal.date === today.date ? 'Today' : 'Upcoming'}
                      </div>
                      <h2 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatDate(meal.date)}
                      </h2>
                    </div>
                    <div className={`text-xs px-3 py-2 rounded-xl ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                      {meal.day_menu_name || 'Lunch menu not set'} · {meal.night_menu_name || 'Dinner menu not set'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      disabled={dayLocked || savingKey === `${meal.id}-day`}
                      onClick={() => togglePreference(meal, 'day')}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        meal.record?.day_meal
                          ? isDark
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-amber-50 border-amber-200'
                          : isDark
                            ? 'bg-white/[0.02] border-white/5'
                            : 'bg-slate-50 border-slate-200'
                      } ${dayLocked ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Sun className="text-amber-500" size={20} />
                          <div>
                            <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Lunch</p>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {dayLocked ? 'Locked after 08:00 AM' : 'Available until 08:00 AM'}
                            </p>
                          </div>
                        </div>
                        {savingKey === `${meal.id}-day` ? (
                          <Loader2 className="animate-spin text-indigo-500" size={20} />
                        ) : meal.record?.day_meal ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                            <Check size={16} /> TAKING
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                            <X size={16} /> NOT TAKING
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      disabled={nightLocked || savingKey === `${meal.id}-night`}
                      onClick={() => togglePreference(meal, 'night')}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${
                        meal.record?.night_meal
                          ? isDark
                            ? 'bg-indigo-500/10 border-indigo-500/30'
                            : 'bg-indigo-50 border-indigo-200'
                          : isDark
                            ? 'bg-white/[0.02] border-white/5'
                            : 'bg-slate-50 border-slate-200'
                      } ${nightLocked ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Moon className="text-indigo-500" size={20} />
                          <div>
                            <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Dinner</p>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                              {nightLocked ? 'Locked after 08:00 PM' : 'Available until 08:00 PM'}
                            </p>
                          </div>
                        </div>
                        {savingKey === `${meal.id}-night` ? (
                          <Loader2 className="animate-spin text-indigo-500" size={20} />
                        ) : meal.record?.night_meal ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                            <Check size={16} /> TAKING
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                            <X size={16} /> NOT TAKING
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
