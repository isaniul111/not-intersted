import { useEffect, useState } from 'react';
import { Calendar, Image as ImageIcon, Sun, Moon, Eye } from 'lucide-react';
import { supabase, Meal } from '../../lib/supabase';

type MealRowProps = {
  meal: Meal;
  onView: (mealId: string) => void;
  onSetMenu: () => void;
  isDark: boolean;
};

export default function MealRow({ meal, onView, onSetMenu, isDark }: MealRowProps) {
  const [stats, setStats] = useState({ dayMeals: 0, nightMeals: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [meal.id]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_records')
        .select('day_meal, night_meal')
        .eq('meal_id', meal.id);

      if (error) throw error;

      const dayMeals = data?.filter((r) => r.day_meal).length || 0;
      const nightMeals = data?.filter((r) => r.night_meal).length || 0;

      setStats({ dayMeals, nightMeals, total: dayMeals + nightMeals });
    } catch (error) {
      console.error('Error fetching meal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
            <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
            <div className={`w-2 h-2 rounded-full animate-bounce delay-200 ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
      {/* Date */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </div>
          {new Date(meal.date).toLocaleDateString('en-GB', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
          })}
        </div>
      </td>

      {/* Menu Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {meal.day_menu_name || meal.night_menu_name ? (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md ${
              isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <ImageIcon size={12}/> Menu Set
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md ${
              isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
            }`}>
              Pending
            </span>
          )}
        </div>
      </td>

      {/* Day Count */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
          stats.dayMeals > 0 
            ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600') 
            : (isDark ? 'text-slate-500' : 'text-slate-400')
        }`}>
          <Sun className="w-3.5 h-3.5" />
          <span className="font-bold">{stats.dayMeals}</span>
        </div>
      </td>

      {/* Night Count */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
          stats.nightMeals > 0 
            ? (isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600') 
            : (isDark ? 'text-slate-500' : 'text-slate-400')
        }`}>
          <Moon className="w-3.5 h-3.5" />
          <span className="font-bold">{stats.nightMeals}</span>
        </div>
      </td>

      {/* Total */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`text-sm font-extrabold px-3 py-1 rounded-lg ${
          stats.total > 0
            ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
            : (isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')
        }`}>
          {stats.total}
        </span>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onSetMenu}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              isDark 
                ? 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300' 
                : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            Set Menu
          </button>
          
          <button
            onClick={() => onView(meal.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
              isDark 
                ? 'text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300' 
                : 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            <Eye className="w-4 h-4" />
            Details
          </button>
        </div>
      </td>
    </tr>
  );
}