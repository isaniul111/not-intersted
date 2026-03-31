import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Notice } from '../../lib/supabase';
import { motion } from 'framer-motion';
import MemberLayout from '../../components/member/MemberLayout';
import { Bell, Megaphone, Calendar, Activity } from 'lucide-react';

export default function MemberNotices() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  // Theme Sync
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('memberTheme') !== 'light');
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
        .eq('hostel_id', (profile as any).hostel_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
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

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Fetching announcements...
          </p>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="relative w-full max-w-7xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 lg:mb-12"
        >
          <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Announcements
          </h1>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Stay updated with the latest notices from hostel management.
          </p>
        </motion.div>

        {/* NOTICES GRID */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {notices.length > 0 ? (
            notices.map((notice, index) => {
              // Create an alternating visual accent for the cards based on index
              const isAccent = index % 3 === 0; 

              return (
                <motion.div
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  key={notice.id}
                  className={`group relative flex flex-col p-6 sm:p-8 rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isDark 
                      ? 'bg-slate-800/60 border-white/5 shadow-lg hover:shadow-2xl hover:border-indigo-500/30' 
                      : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200'
                  }`}
                >
                  {/* Subtle Background Accent for some cards to make the grid pop */}
                  {isAccent && isDark && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[50px] -mr-10 -mt-10 pointer-events-none" />
                  )}

                  {/* Icon & Date Header */}
                  <div className="flex items-start justify-between gap-4 mb-6 relative z-10">
                    <div className={`p-3 rounded-2xl transition-colors ${
                      isDark 
                        ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20' 
                        : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                    }`}>
                      <Megaphone className="w-6 h-6" />
                    </div>
                    
                    <div className={`flex flex-col items-end text-xs font-bold tracking-widest uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(notice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span>
                        {new Date(notice.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 relative z-10">
                    <h3 className={`text-xl font-bold tracking-tight mb-3 line-clamp-2 ${isDark ? 'text-white group-hover:text-indigo-300 transition-colors' : 'text-slate-900 group-hover:text-indigo-700 transition-colors'}`}>
                      {notice.title}
                    </h3>
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {notice.message}
                    </p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div 
              variants={itemVariants} 
              className={`col-span-full p-12 rounded-3xl border text-center ${
                isDark ? 'bg-slate-800/40 border-white/5' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-col items-center justify-center opacity-60">
                <Bell className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>All Caught Up!</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  There are no new announcements from management at this time.
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>

      </div>
    </MemberLayout>
  );
}