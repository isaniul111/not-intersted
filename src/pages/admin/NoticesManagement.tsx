import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Notice } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Trash2, Megaphone, Bell, Calendar, X, Activity } from 'lucide-react';

export default function NoticesManagement() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
  });

  // Theme Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchNotices();
    }
  }, [profile]);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('hostel_id', (profile as any).id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('notices').insert({
        hostel_id: (profile as any).id,
        title: formData.title,
        message: formData.message,
      });

      if (error) throw error;

      await fetchNotices();
      setShowModal(false);
      setFormData({ title: '', message: '' });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice? It will be removed for all members.')) return;

    try {
      const { error } = await supabase.from('notices').delete().eq('id', noticeId);

      if (error) throw error;
      await fetchNotices();
    } catch (error: any) {
      alert(error.message);
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading announcements...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="relative w-full max-w-5xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Announcements
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Broadcast important updates and notices to all residents.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Post Notice
          </button>
        </motion.div>

        {/* NOTICES LIST */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4 sm:space-y-6"
        >
          {notices.length > 0 ? (
            notices.map((notice) => (
              <motion.div 
                variants={itemVariants}
                key={notice.id} 
                className={`group relative p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${
                  isDark 
                    ? 'bg-slate-800/60 border-white/5 hover:bg-slate-800 hover:border-indigo-500/30 shadow-lg' 
                    : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-xl'
                }`}
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  {/* Icon */}
                  <div className={`hidden sm:flex flex-shrink-0 p-4 rounded-2xl ${
                    isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <Megaphone className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className={`text-xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {notice.title}
                        </h3>
                        <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(notice.created_at).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className={`flex-shrink-0 p-2.5 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 ${
                          isDark 
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                        }`}
                        title="Delete Notice"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {notice.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div variants={itemVariants} className={`p-12 rounded-3xl border text-center ${
              isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex flex-col items-center justify-center opacity-60">
                <Bell className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No Active Notices</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  You haven't posted any announcements yet.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* MODAL: POST NOTICE */}
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
                className={`relative w-full max-w-lg p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      New Announcement
                    </h2>
                  </div>
                  <button 
                    onClick={() => setShowModal(false)}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddNotice} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Notice Title
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Water Supply Maintenance"
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Message Content
                    </label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      placeholder="Write the full details of your announcement here..."
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className={`flex-1 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${
                        isDark 
                          ? 'bg-white/5 hover:bg-white/10 text-white' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Broadcast
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AdminLayout>
  );
}