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

  // ============================================================
  // THEME
  // ============================================================

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(
        localStorage.getItem(
          'memberTheme'
        ) !== 'light'
      );
    };

    const interval =
      window.setInterval(
        checkTheme,
        100
      );

    return () =>
      window.clearInterval(
        interval
      );
  }, []);

  // ============================================================
  // LOAD MEALS
  // ============================================================

  useEffect(() => {
    if (profile) {
      fetchMeals();
    }
  }, [profile]);

  // ============================================================
  // FETCH
  // ============================================================

  const fetchMeals = async () => {
    try {
      setLoading(true);

      const memberId =
        (profile as any)?.id;

      const hostelId =
        (profile as any)?.hostel_id;

      if (!memberId || !hostelId) {
        setMeals([]);
        return;
      }

      const {
        data: mealsData,
        error: mealsError,
      } = await supabase
        .from('meals')
        .select(`
          id,
          date,
          day_menu_name,
          day_menu_image,
          night_menu_name,
          night_menu_image
        `)
        .eq(
          'hostel_id',
          hostelId
        )
        .order('date', {
          ascending: false,
        });

      if (mealsError) {
        throw mealsError;
      }

      const mealsWithRecords =
        await Promise.all(
          (mealsData || []).map(
            async (meal) => {

              const {
                data: record,
                error:
                  recordError,
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

              if (recordError) {
                console.error(
                  'Meal record error:',
                  recordError
                );
              }

              return {
                id: meal.id,
                date: meal.date,

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

  // ============================================================
  // TOGGLE DAY / NIGHT
  //
  // IMPORTANT:
  // NO TIME LIMIT
  // NO 08:00 AM
  // NO 08:00 PM
  // ============================================================

  const toggleMeal = async (
    meal: MealWithRecord,
    type: 'day' | 'night'
  ) => {
    try {
      const memberId =
        (profile as any)?.id;

      if (!memberId) {
        throw new Error(
          'Member information not found.'
        );
      }

      // --------------------------------------------------------
      // NEW VALUE
      // --------------------------------------------------------

      const currentValue =
        type === 'day'
          ? meal.record?.day_meal ??
            false
          : meal.record?.night_meal ??
            false;

      const newValue =
        !currentValue;

      // --------------------------------------------------------
      // UPDATE EXISTING RECORD
      // --------------------------------------------------------

      if (meal.record?.id) {

        const updateData =
          type === 'day'
            ? {
                day_meal:
                  newValue,
              }
            : {
                night_meal:
                  newValue,
              };

        const {
          error,
        } = await supabase
          .from(
            'meal_records'
          )
          .update(
            updateData
          )
          .eq(
            'id',
            meal.record.id
          )
          .eq(
            'member_id',
            memberId
          );

        if (error) {
          throw error;
        }
      }

      // --------------------------------------------------------
      // CREATE NEW RECORD
      // --------------------------------------------------------

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
              type === 'day'
                ? newValue
                : false,

            night_meal:
              type === 'night'
                ? newValue
                : false,
          });

        if (error) {
          throw error;
        }
      }

      // --------------------------------------------------------
      // REFRESH
      // --------------------------------------------------------

      await fetchMeals();

    } catch (error: any) {

      console.error(
        'Toggle meal error:',
        error
      );

      alert(
        error?.message ||
          'Could not update meal.'
      );
    }
  };

  return {
    meals,
    loading,
    isDark,
    toggleMeal,
    refreshMeals:
      fetchMeals,
  };
}