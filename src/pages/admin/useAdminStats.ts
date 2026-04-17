import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function useAdminStats() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMeals: 0,
    totalBazarExpense: 0,
    avgMealCost: 0,
  });

  useEffect(() => {
    if (profile) fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    try {
      const hostelId = (profile as any).id;

      const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('hostel_id', hostelId);

      const { data: mealRecords } = await supabase
        .from('meal_records')
        .select('day_meal, night_meal, meal_id!inner(hostel_id)')
        .eq('meal_id.hostel_id', hostelId);

      const totalMeals = mealRecords?.reduce((sum, record) => {
        return sum + (record.day_meal ? 1 : 0) + (record.night_meal ? 1 : 0);
      }, 0) || 0;

      const { data: members } = await supabase
        .from('members')
        .select('bazar_amount')
        .eq('hostel_id', hostelId);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('hostel_id', hostelId);

      const totalBazar = members?.reduce((sum, m) => sum + Number(m.bazar_amount), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalBazarExpense = totalBazar + totalExpenses;

      const avgMealCost = totalMeals > 0 ? totalBazarExpense / totalMeals : 0;

      setStats({
        totalMembers: membersCount || 0,
        totalMeals,
        totalBazarExpense,
        avgMealCost,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, profile };
}