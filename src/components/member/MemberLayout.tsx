import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Bell,
  User,
  LogOut,
  Users,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';

type MemberLayoutProps = {
  children: ReactNode;
};

export default function MemberLayout({ children }: MemberLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('memberTheme') as 'dark' | 'light') || 'dark';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('memberTheme', theme);
  }, [theme]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 🔴 FIX: Removed '/member' from the paths to match App.tsx routes
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: UtensilsCrossed, label: 'Meals', path: '/meals' },
    { icon: Bell, label: 'Notices', path: '/notices' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // --------------------------------------------------------
  // REUSABLE CLEAN SIDEBAR CONTENT
  // --------------------------------------------------------
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      
      {/* 1. Header / Logo Area */}
      <div className={`flex items-center justify-between px-6 py-7 border-b ${isDark ? 'border-white/[0.05]' : 'border-slate-200/60'}`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-2.5 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Users size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Resident Portal
            </h2>
            <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'}`}>
              Member Access
            </p>
          </div>
        </div>

        {/* Mobile Close Button (Inside Sidebar) */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className={`lg:hidden p-2 rounded-xl transition-all duration-200 ${
            isDark ? 'bg-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'
          }`}
        >
          <X size={18} />
        </button>
      </div>

      {/* 2. Main Navigation Links */}
      <div className="px-4 py-8 space-y-1.5">
        <p className={`px-3 text-[10px] font-extrabold uppercase tracking-widest mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Main Menu
        </p>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.includes(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`group flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 text-sm ${
                isActive
                  ? isDark 
                    ? 'bg-indigo-500/10 text-indigo-300 font-bold' 
                    : 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                  : isDark
                    ? 'text-slate-400 font-medium hover:bg-white/[0.04] hover:text-slate-200'
                    : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon 
                  size={18} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${
                    isActive ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : 'text-inherit'
                  }`} 
                />
                {item.label}
              </div>
              
              {isActive && (
                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-600'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Integrated Theme Switcher & Footer */}
      <div className={`mt-auto p-4 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-200/60'}`}>
        
        {/* Premium Segmented Theme Toggle */}
        <div className={`flex items-center p-1 mb-4 rounded-xl border ${
          isDark ? 'bg-slate-900/50 border-white/[0.05]' : 'bg-slate-100/80 border-slate-200/60'
        }`}>
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              !isDark 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Sun size={14} strokeWidth={!isDark ? 2.5 : 2} />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              isDark 
                ? 'bg-slate-800 text-indigo-400 shadow-sm border border-white/[0.05]' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Moon size={14} strokeWidth={isDark ? 2.5 : 2} />
            Dark
          </button>
        </div>

        {/* User Profile Mini-Card */}
        <div className={`flex items-center gap-3 p-3 mb-3 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-slate-50/80'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm uppercase ${
            isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {((profile as any)?.name || 'U').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {(profile as any)?.name || 'Resident'}
            </p>
            <p className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {(profile as any)?.email || 'resident@hostel.com'}
            </p>
          </div>
        </div>

        {/* Clean Logout Button */}
        <button
          onClick={handleSignOut}
          className={`group flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-medium transition-all duration-200 text-sm ${
            isDark 
              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300' 
              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700'
          }`}
        >
          <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
          Sign Out
        </button>
      </div>
    </div>
  );

  // --------------------------------------------------------
  // MAIN LAYOUT WRAPPER
  // --------------------------------------------------------
  return (
    <div className={`min-h-screen w-full flex font-sans transition-colors duration-500 ${
      isDark
        ? 'bg-slate-950 text-slate-200 selection:bg-indigo-500/30'
        : 'bg-slate-50 text-slate-900 selection:bg-indigo-200'
    }`}>

      {/* 📱 MOBILE NAVBAR (Glassmorphic) */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-3.5 backdrop-blur-2xl border-b transition-colors duration-300 ${
        isDark ? 'bg-slate-950/80 border-white/[0.05]' : 'bg-white/80 border-slate-200/60'
      }`}>
        <div className="flex items-center gap-2.5">
          <Users size={20} className="text-indigo-500" strokeWidth={2.5} />
          <h2 className={`font-bold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Resident Portal</h2>
        </div>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* 📱 MOBILE SIDEBAR */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className={`fixed top-0 left-0 z-50 w-[280px] h-[100dvh] shadow-2xl lg:hidden ${
                isDark ? 'bg-slate-900 border-r border-white/5' : 'bg-white border-r border-slate-200'
              }`}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 💻 DESKTOP SIDEBAR */}
      <aside className={`hidden lg:block w-[280px] min-w-[280px] h-screen sticky top-0 border-r transition-colors duration-300 ${
        isDark 
          ? 'border-white/[0.04] bg-slate-900/30 backdrop-blur-2xl' 
          : 'border-slate-200/60 bg-white/60 backdrop-blur-2xl'
      }`}>
        <SidebarContent />
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="flex-1 w-full flex flex-col min-h-screen max-w-full overflow-x-hidden relative">
        
        {/* Extremely Subtle Ambient Glows (Dark Mode Only) */}
        {isDark && (
          <>
             <div className="fixed top-[-20%] left-[10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
             <div className="fixed bottom-[-10%] right-[0%] w-[30%] h-[40%] bg-blue-900/5 rounded-full blur-[100px] pointer-events-none" />
          </>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 w-full mt-16 lg:mt-0 p-5 sm:p-8 lg:p-10 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="max-w-7xl mx-auto w-full h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
    </div>
  );
}