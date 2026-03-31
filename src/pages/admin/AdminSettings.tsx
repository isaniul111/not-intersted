import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Save, Lock, User, Building2, Mail, ShieldCheck } from 'lucide-react';

export default function AdminSettings() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [formData, setFormData] = useState({
    hostelName: (profile as any)?.hostel_name || '',
    fullName: (profile as any)?.full_name || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Success/Error Feedback States
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Theme Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('admins')
        .update({
          hostel_name: formData.hostelName,
          full_name: formData.fullName,
        })
        .eq('id', (profile as any).id);

      if (error) throw error;

      await refreshProfile();
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

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
      
      // Clear success message after 3 seconds
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
    <AdminLayout>
      <div className="relative w-full max-w-4xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Account Settings
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your personal profile and system security preferences.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6 sm:space-y-8"
        >
          {/* PROFILE SETTINGS CARD */}
          <motion.div 
            variants={itemVariants} 
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-800/60 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <User className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Profile Information
              </h2>
            </div>

            {profileMessage.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                profileMessage.type === 'success' 
                  ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                  : (isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Hostel Name */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Building2 className="w-3.5 h-3.5" />
                    Hostel Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.hostelName}
                    onChange={(e) => setFormData({ ...formData, hostelName: e.target.value })}
                    className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                      isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <User className="w-3.5 h-3.5" />
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                      isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Email (Disabled) */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <Mail className="w-3.5 h-3.5" />
                  Account Email (Unchangeable)
                </label>
                <input
                  type="email"
                  value={(profile as any)?.email || ''}
                  disabled
                  className={`w-full px-4 py-3.5 rounded-xl border outline-none font-medium cursor-not-allowed ${
                    isDark ? 'bg-slate-900/30 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>

          {/* SECURITY SETTINGS CARD */}
          <motion.div 
            variants={itemVariants} 
            className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
              isDark ? 'bg-slate-800/60 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Security & Password
              </h2>
            </div>

            {passwordMessage.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                passwordMessage.type === 'success' 
                  ? (isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600')
                  : (isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600')
              }`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* New Password */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Lock className="w-3.5 h-3.5" />
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    minLength={6}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all font-medium ${
                      isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Lock className="w-3.5 h-3.5" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    minLength={6}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all font-medium ${
                      isDark ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  <Lock className="w-5 h-5" />
                  Update Password
                </button>
              </div>
            </form>
          </motion.div>

        </motion.div>
      </div>
    </AdminLayout>
  );
}