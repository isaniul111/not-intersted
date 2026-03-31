import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import MemberLayout from '../../components/member/MemberLayout';
import { Calendar, CheckCircle, Circle } from 'lucide-react';

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

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meals</h1>
        <p className="text-gray-600 mt-1">Mark your daily meals</p>
      </div>

      <div className="space-y-4">
        {meals.map((meal) => {
          const mealDate = new Date(meal.date);
          const isToday =
            mealDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

          return (
            <div
              key={meal.id}
              className={`bg-white rounded-xl shadow-sm border p-6 ${
                isToday ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {mealDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    {isToday && (
                      <span className="text-xs font-medium text-emerald-600">Today</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => toggleMeal(meal.id, meal.record?.id, 'day')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition ${
                    meal.record?.day_meal
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-emerald-300 text-gray-600'
                  }`}
                >
                  {meal.record?.day_meal ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                  <span className="font-medium">Day Meal</span>
                </button>

                <button
                  onClick={() => toggleMeal(meal.id, meal.record?.id, 'night')}
                  className={`flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition ${
                    meal.record?.night_meal
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-600'
                  }`}
                >
                  {meal.record?.night_meal ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                  <span className="font-medium">Night Meal</span>
                </button>
              </div>
            </div>
          );
        })}

        {meals.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            No meal charts available yet
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
