import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Trash2, Megaphone, Bell, Calendar, Activity } from 'lucide-react';

// একই ফোল্ডার থেকে কাস্টম হুক ও মডাল ইম্পোর্ট
import { useNotices } from './useNotices';
import { NoticeModal } from './NoticeModal';

export default function NoticesManagement() {
  const { notices, loading, addNotice, deleteNotice } = useNotices();
  const [showModal, setShowModal] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  // Theme Sync
  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
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
                        onClick={() => deleteNotice(notice.id)}
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

        {/* MODAL: POST NOTICE (ইম্পোর্ট করা কম্পোনেন্ট) */}
        <NoticeModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onSubmit={addNotice} 
          isDark={isDark} 
        />

      </div>
    </AdminLayout>
  );
}