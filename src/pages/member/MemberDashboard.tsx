import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MemberLayout from '../../components/member/MemberLayout';
import { 
  UtensilsCrossed, 
  DollarSign, 
  TrendingUp, 
  Wallet,
  Activity,
  CalendarDays,
  BellRing,
  ArrowRight,
  UserCircle
} from 'lucide-react';

// কাস্টম হুক ও কম্পোনেন্ট ইম্পোর্ট
import { useMemberStats } from './useMemberStats';
import { AnimatedHeartbeat } from './AnimatedHeartbeat';

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { profile, loading, stats } = useMemberStats();
  
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  // Sync Theme
  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  // Framer Motion Variants
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
          <AnimatedHeartbeat isDark={isDark} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Syncing personal records...
          </p>
        </div>
      </MemberLayout>
    );
  }

  const statCards = [
    { icon: UtensilsCrossed, label: 'MY MEALS', value: stats.totalMeals, color: 'emerald' },
    { icon: TrendingUp, label: 'AVG RATE', value: `৳${stats.avgMealRate.toFixed(2)}`, color: 'amber' },
    { icon: DollarSign, label: 'TOTAL COST', value: `৳${stats.mealCost.toFixed(2)}`, color: 'rose' },
    { icon: Wallet, label: 'MY DEPOSIT', value: `৳${stats.bazarAmount.toFixed(2)}`, color: 'indigo' },
  ];

  const balance = stats.bazarAmount - stats.mealCost;
  const isBalancePositive = balance >= 0;

  return (
    <MemberLayout>
      <div className="relative w-full max-w-7xl mx-auto">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 lg:mb-12"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Resident Dashboard
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Welcome back, <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{(profile as any)?.name}</span>. Here is your monthly overview.
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
          {/* Detailed Summary Card */}
          <motion.div variants={itemVariants} className={`p-6 sm:p-8 rounded-3xl border ${
            isDark ? 'bg-slate-800/60 border-white/5 shadow-lg' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl'
          }`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              <div className={`w-1.5 h-6 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
              Financial Summary
            </h3>

            <div className="space-y-4">
              {[
                { label: 'Meals Consumed', value: stats.totalMeals },
                { label: 'Average Rate', value: `৳${stats.avgMealRate.toFixed(2)}` },
                { label: 'Total Expense', value: `৳${stats.mealCost.toFixed(2)}` },
                { label: 'Total Deposit', value: `৳${stats.bazarAmount.toFixed(2)}` },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</span>
                  <span className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.value}</span>
                </div>
              ))}
              
              <div className={`pt-4 mt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <div className={`flex justify-between items-center p-4 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Net Balance</span>
                  <span className={`text-xl font-extrabold tracking-tight ${
                    isBalancePositive 
                      ? (isDark ? 'text-emerald-400' : 'text-emerald-600') 
                      : (isDark ? 'text-rose-400' : 'text-rose-600')
                  }`}>
                    {isBalancePositive ? '+' : ''}৳{balance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action & Status Card */}
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            
            {/* Quick Actions */}
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              isDark ? 'bg-slate-800/60 border-white/5 shadow-lg' : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <div className={`w-1.5 h-6 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-600'}`}></div>
                Quick Actions
              </h3>
              
             <div className="space-y-3">
                {[
                  { icon: CalendarDays, text: 'Manage Daily Meals', link: '/meals', color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
                  { icon: BellRing, text: 'View Announcements', link: '/notices', color: isDark ? 'text-amber-400' : 'text-amber-600' },
                  { icon: UserCircle, text: 'My Profile', link: '/profile', color: isDark ? 'text-indigo-400' : 'text-indigo-600' },
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
            </div>

            {/* Account Status Heartbeat */}
            <div className={`group p-6 rounded-3xl relative overflow-hidden flex items-center gap-4 border transition-all duration-500 ${
              isDark 
                ? 'bg-indigo-900/20 border-indigo-500/20 hover:border-indigo-500/40' 
                : 'bg-indigo-50 border-indigo-100 hover:border-indigo-200'
            }`}>
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-200'}`}>
                <Activity className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`} />
              </div>
              <div>
                <h4 className={`text-base font-bold ${isDark ? 'text-white' : 'text-indigo-900'}`}>Account Active</h4>
                <p className={`text-sm ${isDark ? 'text-indigo-200/60' : 'text-indigo-700/70'}`}>Your member profile is fully synced.</p>
              </div>
            </div>

          </motion.div>

        </motion.div>
      </div>
    </MemberLayout>
  );
}