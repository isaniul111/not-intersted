import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Meal, Member, FoodItem } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Activity, X, Utensils, Sun, Moon } from 'lucide-react';
import MealRow from './MealRow';
import MenuModal from './MenuModal';

export default function MealsManagement() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<(Meal & { records?: any[] })[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // --- NEW: Menu Modal States (DB Integration) ---
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [dbFoods, setDbFoods] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dayMenu, setDayMenu] = useState<{name: string, image: string} | null>(null);
  const [nightMenu, setNightMenu] = useState<{name: string, image: string} | null>(null);

  // Detail View States
  const [viewingMeal, setViewingMeal] = useState<string | null>(null);
  const [mealRecords, setMealRecords] = useState<any[]>([]);

  // Theme State Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchMeals();
      fetchMembers();
      fetchDbFoods(); // Fetch foods from DB on mount
    }
  }, [profile]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('hostel_id', (profile as any).id);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchMeals = async () => {
    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('hostel_id', (profile as any).id)
        .order('date', { ascending: false });

      if (error) throw error;
      setMeals(data || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch foods from Supabase
  const fetchDbFoods = async () => {
    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDbFoods(data || []);
    } catch (error) {
      console.error('Error fetching food items:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateMealChart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Check if chart exists
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('hostel_id', (profile as any).id)
        .eq('date', selectedDate)
        .maybeSingle();

      if (existingMeal) {
        alert('A meal chart already exists for this date.');
        return;
      }

      // 2. Insert new meal row
      const { data: newMeal, error: mealError } = await supabase
        .from('meals')
        .insert({
          hostel_id: (profile as any).id,
          date: selectedDate,
        })
        .select()
        .single();

      if (mealError) throw mealError;

      // 3. Batch insert records for all members
      const mealRecordsToInsert = members.map((member) => ({
        meal_id: newMeal.id,
        member_id: member.id,
        day_meal: false,
        night_meal: false,
      }));

      const { error: recordsError } = await supabase
        .from('meal_records')
        .insert(mealRecordsToInsert);

      if (recordsError) throw recordsError;

      await fetchMeals();
      setShowModal(false);
      setSelectedDate(new Date().toISOString().split('T')[0]);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const viewMealDetails = async (mealId: string) => {
    try {
      const { data, error } = await supabase
        .from('meal_records')
        .select(`
          *,
          member:members(name, email)
        `)
        .eq('meal_id', mealId);

      if (error) throw error;
      setMealRecords(data || []);
      setViewingMeal(mealId);
    } catch (error) {
      console.error('Error fetching meal records:', error);
    }
  };

  // --- MENU FUNCTIONS (DB Integration) ---
  const openMenuModal = (meal: Meal) => {
    setActiveMealId(meal.id);
    setDayMenu(meal.day_menu_name ? { name: meal.day_menu_name, image: meal.day_menu_image || '' } : null);
    setNightMenu(meal.night_menu_name ? { name: meal.night_menu_name, image: meal.night_menu_image || '' } : null);
    setShowMenuModal(true);
  };

  const handleSaveMenu = async () => {
    if (!activeMealId) return;
    try {
      const { error } = await supabase.from('meals').update({
        day_menu_name: dayMenu?.name || null,
        day_menu_image: dayMenu?.image || null,
        night_menu_name: nightMenu?.name || null,
        night_menu_image: nightMenu?.image || null,
      }).eq('id', activeMealId);

      if (error) throw error;
      await fetchMeals(); // Refresh the list
      setShowMenuModal(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading meal charts...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="relative w-full max-w-7xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Meal Charts & Menu
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Create and manage daily hostel meal allocations and menus
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Create Chart
          </button>
        </motion.div>

        {/* DATA TABLE */}
        <motion.div 
          variants={containerVariants} 
          initial="hidden" 
          animate="show" 
          className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            isDark ? 'bg-slate-800/60 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Menu Status</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Day Meals</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Night Meals</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                {meals.length > 0 ? (
                  meals.map((meal) => (
                    <MealRow key={meal.id} meal={meal} onView={viewMealDetails} onSetMenu={() => openMenuModal(meal)} isDark={isDark} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <Utensils className={`w-12 h-12 mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No meal charts created yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* MODAL: SET MENU - Component rendering */}
        <MenuModal 
            isOpen={showMenuModal}
            onClose={() => setShowMenuModal(false)}
            isDark={isDark}
            dayMenu={dayMenu}
            setDayMenu={setDayMenu}
            nightMenu={nightMenu}
            setNightMenu={setNightMenu}
            onSave={handleSaveMenu}
            dbFoods={dbFoods}
            isSearching={isSearching}
        />

        {/* MODAL: CREATE CHART (Existing) */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    New Meal Chart
                  </h2>
                  <button 
                    onClick={() => setShowModal(false)}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateMealChart} className="space-y-6">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Select Date
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500 [color-scheme:dark]' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className={`flex-1 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${
                        isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-200"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: VIEW DETAILS (Existing) */}
        <AnimatePresence>
          {viewingMeal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingMeal(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                {/* Fixed Header */}
                <div className={`p-6 sm:p-8 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Meal Allocations
                      </h2>
                      <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Detailed view of resident selections
                      </p>
                    </div>
                    <button 
                      onClick={() => setViewingMeal(null)}
                      className={`p-2 rounded-full transition-colors ${
                        isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-3">
                  {mealRecords.length > 0 ? (
                    mealRecords.map((record) => (
                      <div 
                        key={record.id} 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-colors ${
                          isDark ? 'bg-slate-800/40 border-white/5 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="mb-3 sm:mb-0">
                          <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{record.member.name}</p>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{record.member.email}</p>
                        </div>
                        
                        <div className="flex gap-4 sm:gap-6">
                          {/* Day Status */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                            record.day_meal 
                              ? (isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
                              : (isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-100 border-slate-200')
                          }`}>
                            <Sun className={`w-4 h-4 ${record.day_meal ? 'text-amber-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`} />
                            <span className={`text-sm font-bold ${
                              record.day_meal 
                                ? (isDark ? 'text-amber-400' : 'text-amber-600') 
                                : (isDark ? 'text-slate-500' : 'text-slate-400')
                            }`}>
                              {record.day_meal ? 'ON' : 'OFF'}
                            </span>
                          </div>

                          {/* Night Status */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                            record.night_meal 
                              ? (isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-200')
                              : (isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-100 border-slate-200')
                          }`}>
                            <Moon className={`w-4 h-4 ${record.night_meal ? 'text-indigo-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`} />
                            <span className={`text-sm font-bold ${
                              record.night_meal 
                                ? (isDark ? 'text-indigo-400' : 'text-indigo-600') 
                                : (isDark ? 'text-slate-500' : 'text-slate-400')
                            }`}>
                              {record.night_meal ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>No records found for this meal chart.</p>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
      </div>
    </AdminLayout>
  );
}



