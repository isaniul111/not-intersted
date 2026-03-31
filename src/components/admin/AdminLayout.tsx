import { useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  DollarSign,
  Bell,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Initialize theme from local storage or default to dark
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('adminTheme') as 'dark' | 'light') || 'dark';
  });

  const isDark = theme === 'dark';

  // Save theme changes
  useEffect(() => {
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users, label: 'Members', path: '/admin/members' },
    { icon: UtensilsCrossed, label: 'Meals', path: '/admin/meals' },
    { icon: DollarSign, label: 'Expenses', path: '/admin/expenses' },
    { icon: Bell, label: 'Notices', path: '/admin/notices' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  // Reusable Sidebar Content Component
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      
      {/* HEADER */}
      <div className={`flex items-center justify-between px-6 py-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-100 border border-indigo-200'}`}>
            <Building2 className="text-indigo-500" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className={`font-bold text-sm truncate max-w-[120px] tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {(profile as any)?.hostel_name || 'Hostel System'}
            </h2>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-indigo-500 mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Desktop Theme Toggle (Hidden on mobile as it's in the topnav) */}
        <button
          onClick={toggleTheme}
          className={`hidden lg:flex p-2 rounded-lg transition-all duration-200 ${
            isDark 
              ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white' 
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
          }`}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* MENU ITEMS */}
      <div className="flex-1 px-4 py-6 space-y-1.5">
        <p className={`px-2 text-xs font-semibold uppercase tracking-widest mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Main Menu
        </p>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.includes(item.path);

          return (
            <motion.button
              key={item.path}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.path)}
              className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-colors duration-200 text-sm font-medium ${
                isActive
                  ? isDark 
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
                  : isDark
                    ? 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.label}
              </div>
              {isActive && (
                <ChevronRight size={16} className={isDark ? 'text-indigo-400 opacity-60' : 'text-indigo-500 opacity-60'} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* USER & LOGOUT */}
      <div className={`p-4 border-t mt-auto ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`rounded-xl p-4 mb-4 border ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(profile as any)?.full_name || 'System Admin'}
          </p>
          <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {(profile as any)?.email || 'admin@example.com'}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium transition-colors text-sm border ${
            isDark 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300' 
              : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:text-rose-700'
          }`}
        >
          <LogOut size={16} />
          Secure Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen w-full flex transition-colors duration-500 ${
      isDark
        ? 'bg-slate-950 text-white selection:bg-indigo-500/30'
        : 'bg-slate-50 text-slate-900 selection:bg-indigo-200'
    }`}>

      {/* 📱 MOBILE NAVBAR (Fixed Top) */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 backdrop-blur-xl border-b transition-colors duration-300 ${
        isDark ? 'bg-slate-950/80 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-indigo-500" />
          <h2 className="font-bold text-sm tracking-tight">System Control</h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* 📱 MOBILE SIDEBAR MODAL */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sliding Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className={`fixed top-0 left-0 z-50 w-[280px] h-[100dvh] shadow-2xl lg:hidden ${
                isDark ? 'bg-slate-900 border-r border-white/10' : 'bg-white border-r border-slate-200'
              }`}
            >
              {/* Close button inside mobile menu */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className={`absolute top-6 right-4 p-2 rounded-full lg:hidden ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}
              >
                <X size={16} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 💻 DESKTOP SIDEBAR (Sticky Left) */}
      <aside className={`hidden lg:block w-[280px] min-w-[280px] h-screen sticky top-0 border-r transition-colors duration-300 ${
        isDark 
          ? 'border-white/10 bg-slate-900/50 backdrop-blur-2xl' 
          : 'border-slate-200 bg-white/80 backdrop-blur-2xl shadow-[4px_0_24px_rgba(0,0,0,0.02)]'
      }`}>
        <SidebarContent />
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="flex-1 w-full flex flex-col min-h-screen max-w-full overflow-x-hidden">
        {/* Background Gradients */}
        {isDark && (
          <>
             <div className="fixed top-[-10%] left-[20%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
             <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
          </>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 w-full mt-14 lg:mt-0 p-4 sm:p-6 lg:p-8 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
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