import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import MemberLayout from '../../components/member/MemberLayout';
import { User, Mail, Calendar, Wallet, Lock, ShieldCheck, UserCircle } from 'lucide-react';

export default function MemberProfile() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Theme Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
      
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <MemberLayout>
      <div className="relative w-full max-w-4xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            My Profile
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your resident account details and security settings.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6 sm:space-y-8"
        >
          {/* PERSONAL INFO CARD */}
          <motion.div 
            variants={itemVariants} 
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-800/60 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className={`p-2 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <UserCircle className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-6">
              
              {/* Name */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Name</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {(profile as any)?.name}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Account Email</p>
                  <p className={`text-base font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {(profile as any)?.email}
                  </p>
                </div>
              </div>

              {/* Bazar Amount */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Initial Deposit</p>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ৳{Number((profile as any)?.bazar_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Member Since</p>
                  <p className={`text-base font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {new Date((profile as any)?.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>

          {/* COMPACT SECURITY CARD */}
          <motion.div 
            variants={itemVariants} 
            className={`p-6 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-800/40 border-white/5 shadow-md' : 'bg-slate-50/80 border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 rounded-xl flex items-center justify-center ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Update Password
              </h2>
            </div>

            {passwordMessage.text && (
              <div className={`mb-5 p-3 rounded-xl text-sm font-medium border ${
                passwordMessage.type === 'success' 
                  ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                  : (isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:flex-1">
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Lock className="w-3 h-3" />
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  minLength={6}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                    isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="w-full sm:flex-1">
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Lock className="w-3 h-3" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  minLength={6}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                    isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-600' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 disabled:opacity-70"
              >
                Update
              </button>
            </form>
          </motion.div>

        </motion.div>
      </div>
    </MemberLayout>
  );
}