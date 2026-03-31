import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Users,
  UtensilsCrossed,
  DollarSign,
  TrendingUp,
  UserPlus,
  CalendarDays,
  BellRing,
  ArrowRight,
  Activity
} from 'lucide-react';

// কাস্টম হার্টবিট অ্যানিমেশন কম্পোনেন্ট
const AnimatedHeartbeat = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="relative w-20 h-12 flex items-center justify-center">
      {/* Background Glow */}
      <div className={`absolute inset-0 blur-xl rounded-full opacity-50 ${isDark ? 'bg-emerald-500/30' : 'bg-emerald-400/40'} animate-pulse`} />
      
      {/* ECG SVG Line */}
      <svg viewBox="0 0 100 50" className={`w-full h-full relative z-10 ${isDark ? 'stroke-emerald-400' : 'stroke-emerald-500'}`}>
        <motion.path
          d="M 5,25 L 25,25 L 35,10 L 50,45 L 60,5 L 70,30 L 80,25 L 95,25"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0.2 }}
          animate={{ 
            pathLength: [0, 1, 1], 
            opacity: [0, 1, 1, 0] 
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.4, 0.8, 1]
          }}
        />
      </svg>
    </div>
  );
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  const [stats, setStats] = useState({
    totalMembers: 0,
    totalMeals: 0,
    totalBazarExpense: 0,
    avgMealCost: 0,
  });

  // থিম সিঙ্ক করার জন্য
  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  // ডেটা ফেচ
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
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <AnimatedHeartbeat isDark={isDark} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Syncing system data...
          </p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { icon: Users, label: 'TOTAL MEMBERS', value: stats.totalMembers, color: 'indigo' },
    { icon: UtensilsCrossed, label: 'TOTAL MEALS', value: stats.totalMeals, color: 'emerald' },
    { icon: DollarSign, label: 'TOTAL EXPENSES', value: `৳${stats.totalBazarExpense.toLocaleString()}`, color: 'amber' },
    { icon: TrendingUp, label: 'AVG MEAL COST', value: `৳${stats.avgMealCost.toFixed(2)}`, color: 'rose' },
  ];

  return (
    <AdminLayout>
      <div className="relative w-full max-w-7xl mx-auto">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 lg:mb-12"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            System Overview
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Welcome back, <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{(profile as any)?.full_name}</span>. Here is your operational summary.
          </p>
        </motion.div>

        {/* 📊 Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {statCards.map((card, i) => {
            const Icon = card.icon;
            
            const colorThemes: Record<string, { bg: string, text: string, iconBg: string }> = {
              indigo: { bg: 'hover:border-indigo-500/30', text: 'text-indigo-600', iconBg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100' },
              emerald: { bg: 'hover:border-emerald-500/30', text: 'text-emerald-600', iconBg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100' },
              amber: { bg: 'hover:border-amber-500/30', text: 'text-amber-600', iconBg: isDark ? 'bg-amber-500/20' : 'bg-amber-100' },
              rose: { bg: 'hover:border-rose-500/30', text: 'text-rose-600', iconBg: isDark ? 'bg-rose-500/20' : 'bg-rose-100' },
            };
            const theme = colorThemes[card.color];

            return (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -5, scale: 1.01 }}
                className={`p-6 rounded-2xl transition-all duration-300 border ${
                  isDark
                    ? `bg-slate-800/60 border-white/5 shadow-lg ${theme.bg}`
                    : `bg-white border-slate-100 shadow-sm hover:shadow-xl ${theme.bg}`
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className={`text-[11px] font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {card.label}
                    </p>
                    <h2 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {card.value}
                    </h2>
                  </div>
                  <div className={`p-3 rounded-xl ${theme.iconBg}`}>
                    <Icon className={`w-6 h-6 ${isDark ? theme.text.replace('600', '400') : theme.text}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 🛠 Bottom Section */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Quick Actions (Left) */}
          <motion.div variants={itemVariants} className={`p-6 sm:p-8 rounded-3xl border ${
            isDark ? 'bg-slate-800/60 border-white/5' : 'bg-white border-slate-100 shadow-sm'
          }`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <div className={`w-1.5 h-6 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
              Quick Actions
            </h3>

            <div className="space-y-3">
              {[
                { icon: UserPlus, text: 'Register New Member', link: '/admin/members', color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
                { icon: CalendarDays, text: 'Configure Meal Chart', link: '/admin/meals', color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
                { icon: BellRing, text: 'Broadcast Notice', link: '/admin/notices', color: isDark ? 'text-amber-400' : 'text-amber-600' },
              ].map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(action.link)}
                    className={`group flex justify-between items-center w-full p-4 rounded-2xl transition-all duration-300 border ${
                      isDark
                        ? 'bg-slate-900/40 hover:bg-slate-700/50 border-transparent hover:border-white/10 text-slate-300'
                        : 'bg-slate-50 hover:bg-white border-transparent hover:border-slate-200 hover:shadow-md text-slate-700'
                    }`}
                  >
                    <div className="flex gap-4 items-center">
                      <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${action.color}`} />
                      <span className="font-semibold text-sm sm:text-base">{action.text}</span>
                    </div>
                    <ArrowRight className={`w-4 h-4 transition-all group-hover:translate-x-1 ${
                      isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'
                    }`} />
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 💓 System Online / Heartbeat Card (Right) */}
          <motion.div 
            variants={itemVariants} 
            whileHover={{ scale: 1.01 }}
            className={`group p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center border transition-all duration-500 ${
              isDark 
                ? 'bg-slate-800/60 border-white/5 hover:border-emerald-500/30' 
                : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200'
            }`}
          >
            {/* Background Decorative Graphic */}
            <div className={`absolute -right-10 -top-10 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500 ${
              isDark ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-emerald-200/30 group-hover:bg-emerald-300/40'
            }`}></div>

            <div className="relative z-10 flex flex-col h-full justify-between">
              
              {/* Custom Heartbeat Icon */}
              <div className={`self-start inline-flex items-center justify-center p-3 rounded-2xl mb-6 border transition-all duration-500 ${
                isDark ? 'bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20' : 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100'
              }`}>
                <AnimatedHeartbeat isDark={isDark} />
              </div>
              
              <div>
                <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  System Online
                </h3>
                
                <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  All systems are operating at peak efficiency. Data synchronization is active, and database queries are resolving securely without any delays.
                </p>
                
                <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border shadow-sm ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                }`}>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Live Sync Active
                </div>
              </div>

            </div>
          </motion.div>

        </motion.div>
      </div>
    </AdminLayout>
  );
}