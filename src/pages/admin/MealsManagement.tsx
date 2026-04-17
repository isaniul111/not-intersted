import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
// Note: Ensure FoodItem type is added in your supabase.ts file
import { supabase, Meal, Member, FoodItem } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Calendar, Activity, X, Utensils, Sun, Moon, Eye, Image as ImageIcon, Search, Trash2 } from 'lucide-react';

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
  const [menuSearch, setMenuSearch] = useState('');
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
    setMenuSearch(''); // Reset search when opening modal
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

  // Local filter for instant search
  const filteredFoods = dbFoods.filter(food => 
    food.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

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

        {/* MODAL: SET MENU */}
        <AnimatePresence>
          {showMenuModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMenuModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Set Daily Menu
                    </h2>
                    <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Search and assign food items from your database
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowMenuModal(false)}
                    className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Selected Menu Side */}
                  <div className="space-y-6">
                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <Sun size={20}/> Day Meal
                      </h3>
                      {dayMenu ? (
                        <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                          <img src={dayMenu.image} alt={dayMenu.name} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                          <div className="flex-1">
                            <p className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{dayMenu.name}</p>
                            <button onClick={() => setDayMenu(null)} className="text-rose-500 hover:text-rose-600 text-sm flex items-center gap-1 mt-2 font-medium">
                              <Trash2 size={14}/> Remove Item
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl opacity-60">
                          <ImageIcon size={32} className="mb-2" />
                          <p className="text-sm font-medium">Select a meal from the right</p>
                        </div>
                      )}
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                      <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        <Moon size={20}/> Night Meal
                      </h3>
                      {nightMenu ? (
                        <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-3 rounded-xl">
                          <img src={nightMenu.image} alt={nightMenu.name} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                          <div className="flex-1">
                            <p className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{nightMenu.name}</p>
                            <button onClick={() => setNightMenu(null)} className="text-rose-500 hover:text-rose-600 text-sm flex items-center gap-1 mt-2 font-medium">
                              <Trash2 size={14}/> Remove Item
                            </button>
                          </div>
                        </div>
                      ) : (
                         <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl opacity-60">
                          <ImageIcon size={32} className="mb-2" />
                          <p className="text-sm font-medium">Select a meal from the right</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={handleSaveMenu} 
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300"
                    >
                      Save Menu to Database
                    </button>
                  </div>

                  {/* Database Search Side */}
                  <div className="flex flex-col h-full">
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={18} className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                        <input 
                          type="text" 
                          value={menuSearch} 
                          onChange={(e) => setMenuSearch(e.target.value)}
                          placeholder="Search database foods..." 
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium ${
                            isDark ? 'bg-slate-800/50 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div className={`flex-1 min-h-[400px] max-h-[500px] overflow-y-auto pr-2 grid grid-cols-2 gap-4 ${isDark ? 'custom-scrollbar-dark' : 'custom-scrollbar'}`}>
                      {isSearching ? (
                        <div className="col-span-2 flex flex-col items-center justify-center py-12 opacity-50">
                          <Activity className="w-8 h-8 animate-spin mb-2" />
                          <p>Loading database...</p>
                        </div>
                      ) : filteredFoods.length > 0 ? (
                        filteredFoods.map(food => (
                          <div key={food.id} className={`p-3 rounded-2xl border group hover:border-indigo-500 transition-all duration-300 ${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="overflow-hidden rounded-xl mb-3">
                              <img src={food.image_url} className="w-full h-28 object-cover group-hover:scale-110 transition-transform duration-500" alt={food.name} />
                            </div>
                            <p className={`text-sm font-bold truncate mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`} title={food.name}>
                              {food.name}
                            </p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setDayMenu({name: food.name, image: food.image_url})} 
                                className="flex-1 text-xs py-1.5 font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg transition-colors"
                              >
                                Set Day
                              </button>
                              <button 
                                onClick={() => setNightMenu({name: food.name, image: food.image_url})} 
                                className="flex-1 text-xs py-1.5 font-bold bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 rounded-lg transition-colors"
                              >
                                Set Night
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center py-12 opacity-50">
                          <Utensils className="w-10 h-10 mb-2" />
                          <p>No matching foods found in database.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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

// ---------------------------------------------------------
// Extracted Row Component 
// ---------------------------------------------------------
function MealRow({ meal, onView, onSetMenu, isDark }: { meal: Meal; onView: (mealId: string) => void, onSetMenu: () => void, isDark: boolean }) {
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
          {/* Set Menu Button */}
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