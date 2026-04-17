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
  const [meals, setMeals] = useState<MealWithRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  // Theme Sync
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
            day_menu_name: meal.day_menu_name,
            day_menu_image: meal.day_menu_image,
            night_menu_name: meal.night_menu_name,
            night_menu_image: meal.night_menu_image,
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

  const toggleMeal = async (meal: MealWithRecord, type: 'day' | 'night') => {
    const now = new Date();
    const cutoffTime = new Date(`${meal.date}${type === 'day' ? 'T08:00:00' : 'T20:00:00'}`);
    
    if (now > cutoffTime) {
      alert(`Time is over! You cannot update the ${type} meal for this date anymore.`);
      return;
    }

    try {
      const memberId = (profile as any).id;

      if (meal.record?.id) {
        const { error } = await supabase
          .from('meal_records')
          .update({
            [type === 'day' ? 'day_meal' : 'night_meal']:
              type === 'day' ? !meal.record.day_meal : !meal.record.night_meal,
          })
          .eq('id', meal.record.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('meal_records').insert({
          meal_id: meal.id,
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

  return { meals, loading, isDark, toggleMeal };
}