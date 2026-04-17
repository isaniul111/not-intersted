import { motion } from 'framer-motion';
import MemberLayout from '../../components/member/MemberLayout';
import { Activity, Utensils } from 'lucide-react';
import { useMealsData } from './useMealsData';
import MealCard from './MealCard';

export default function MemberMeals() {
  // Logic is now separated cleanly in custom hook
  const { meals, loading, isDark, toggleMeal } = useMealsData();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading meal schedules...
          </p>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="relative w-full max-w-4xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 lg:mb-12"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Meal Selections
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your daily meal preferences to update your balance and notify the kitchen. Meals lock automatically at 8:00 AM & 8:00 PM.
          </p>
        </motion.div>

        {/* MEAL CARDS LIST */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4 sm:space-y-6"
        >
          {meals.length > 0 ? (
            meals.map((meal) => (
              <MealCard 
                key={meal.id} 
                meal={meal} 
                toggleMeal={toggleMeal} 
                isDark={isDark} 
                itemVariants={itemVariants} 
              />
            ))
          ) : (
            <motion.div variants={itemVariants} className={`p-12 rounded-3xl border text-center ${
              isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col items-center justify-center opacity-60">
                <Utensils className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No Meals Scheduled</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  The admin hasn't created any meal charts yet.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

      </div>
    </MemberLayout>
  );
}