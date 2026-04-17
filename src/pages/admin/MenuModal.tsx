import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Image as ImageIcon, Trash2, Search, Activity, Utensils } from 'lucide-react';
import { FoodItem } from '../../lib/supabase';

type MenuType = { name: string; image: string } | null;

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  dayMenu: MenuType;
  setDayMenu: (menu: MenuType) => void;
  nightMenu: MenuType;
  setNightMenu: (menu: MenuType) => void;
  onSave: () => void;
  dbFoods: FoodItem[];
  isSearching: boolean;
}

export default function MenuModal({
  isOpen, onClose, isDark, dayMenu, setDayMenu, nightMenu, setNightMenu, onSave, dbFoods, isSearching
}: MenuModalProps) {
  const [menuSearch, setMenuSearch] = useState('');

  // Modal open hole search khali kore dibe
  useEffect(() => {
    if (isOpen) {
      setMenuSearch('');
    }
  }, [isOpen]);

  const filteredFoods = dbFoods.filter(food => 
    food.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                onClick={onClose}
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
                  onClick={onSave} 
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
  );
}