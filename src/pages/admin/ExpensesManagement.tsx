import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Expense } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Trash2, DollarSign, Calendar, FileText, X, Activity } from 'lucide-react';

export default function ExpensesManagement() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
  });

  // Sync theme with AdminLayout
  const [isDark, setIsDark] = useState(() => localStorage.getItem('adminTheme') !== 'light');

  useEffect(() => {
    const checkTheme = () => setIsDark(localStorage.getItem('adminTheme') !== 'light');
    const interval = setInterval(checkTheme, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (profile) {
      fetchExpenses();
    }
  }, [profile]);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('hostel_id', (profile as any).id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('expenses').insert({
        hostel_id: (profile as any).id,
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
      });

      if (error) throw error;

      await fetchExpenses();
      setShowModal(false);
      setFormData({
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

      if (error) throw error;
      await fetchExpenses();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

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
            Loading expenses...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="relative w-full max-w-7xl mx-auto">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Expenses
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Track and manage all hostel operational costs
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          
          {/* TOTAL SUMMARY CARD */}
          <motion.div variants={itemVariants} className={`p-6 rounded-2xl border flex items-center gap-5 transition-all duration-300 ${
            isDark 
              ? 'bg-slate-800/60 border-white/5 hover:border-amber-500/30 shadow-lg' 
              : 'bg-white border-slate-200 hover:border-amber-200 shadow-sm hover:shadow-xl'
          }`}>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <DollarSign className={`w-8 h-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Expenditures
              </p>
              <p className={`text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ৳{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </motion.div>

          {/* EXPENSES TABLE */}
          <motion.div variants={itemVariants} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
            isDark ? 'bg-slate-800/60 border-white/5' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'bg-slate-900/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                    <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Description</th>
                    <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Amount</th>
                    <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                  {expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <tr key={expense.id} className={`group transition-colors ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                      }`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            <Calendar className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                            {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                              <FileText className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                            </div>
                            {expense.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            ৳{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                              isDark 
                                ? 'hover:bg-rose-500/20 text-rose-400' 
                                : 'hover:bg-rose-100 text-rose-600'
                            }`}
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center opacity-50">
                          <FileText className={`w-12 h-12 mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No expenses recorded yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </motion.div>

        {/* ADD EXPENSE MODAL */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* BACKDROP */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* MODAL CONTENT */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Add New Expense
                  </h2>
                  <button 
                    onClick={() => setShowModal(false)}
                    className={`p-2 rounded-full transition-colors ${
                      isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddExpense} className="space-y-5">
                  {/* Description */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Description
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Internet Bill, Groceries, Rent"
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Amount (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      placeholder="0.00"
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' 
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark 
                          ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500 [color-scheme:dark]' 
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
                      Save Expense
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