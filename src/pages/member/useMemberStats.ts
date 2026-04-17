import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export type MemberStats = {
  totalMeals: number;
  mealCost: number;
  avgMealRate: number;
  bazarAmount: number;
};

export function useMemberStats() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<MemberStats>({
    totalMeals: 0,
    mealCost: 0,
    avgMealRate: 0,
    bazarAmount: 0,
  });

  useEffect(() => {
    if (profile) fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    try {
      const memberId = (profile as any).id;
      const hostelId = (profile as any).hostel_id;

      // মেম্বারের নিজস্ব মিল রেকর্ড
      const { data: memberMealRecords } = await supabase
        .from('meal_records')
        .select('day_meal, night_meal')
        .eq('member_id', memberId);

      const totalMeals = memberMealRecords?.reduce((sum, record) => 
        sum + (record.day_meal ? 1 : 0) + (record.night_meal ? 1 : 0), 0) || 0;

      // হোস্টেলের সর্বমোট মিল রেকর্ড
      const { data: allMealRecords } = await supabase
        .from('meal_records')
        .select('day_meal, night_meal, meal_id!inner(hostel_id)')
        .eq('meal_id.hostel_id', hostelId);

      const totalHostelMeals = allMealRecords?.reduce((sum, record) => 
        sum + (record.day_meal ? 1 : 0) + (record.night_meal ? 1 : 0), 0) || 0;

      // হোস্টেলের সর্বমোট বাজার ও খরচ
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

      // মিল রেট এবং খরচ হিসাব করা
      const avgMealRate = totalHostelMeals > 0 ? totalBazarExpense / totalHostelMeals : 0;
      const mealCost = totalMeals * avgMealRate;

      setStats({
        totalMeals,
        mealCost,
        avgMealRate,
        bazarAmount: Number((profile as any).bazar_amount),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, stats };
}