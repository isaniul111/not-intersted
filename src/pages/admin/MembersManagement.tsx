import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Member } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import { Plus, Pencil, Trash2, Search, X, Activity, UserCircle, Mail, Wallet, CalendarDays, Users } from 'lucide-react';

export default function MembersManagement() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    bazarAmount: 0,
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
      fetchMembers();
    }
  }, [profile]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('hostel_id', (profile as any).id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: insertError } = await supabase.from('members').insert({
          hostel_id: (profile as any).id,
          name: formData.name,
          email: formData.email,
          auth_id: authData.user.id,
          bazar_amount: formData.bazarAmount,
        });

        if (insertError) throw insertError;

        await fetchMembers();
        setShowModal(false);
        setFormData({ name: '', email: '', password: '', bazarAmount: 0 });
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const { error } = await supabase
        .from('members')
        .update({
          name: formData.name,
          email: formData.email,
          bazar_amount: formData.bazarAmount,
        })
        .eq('id', editingMember.id);

      if (error) throw error;

      await fetchMembers();
      setShowModal(false);
      setEditingMember(null);
      setFormData({ name: '', email: '', password: '', bazarAmount: 0 });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteMember = async (memberId: string, authId: string) => {
    if (!confirm('Are you sure you want to remove this member from the system?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;

      // Note: Deleting user from auth requires admin privileges/service role in Supabase
      await supabase.auth.admin.deleteUser(authId);

      await fetchMembers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFormData({ name: '', email: '', password: '', bazarAmount: 0 });
    setShowModal(true);
  };

  const openEditModal = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      password: '', // Hidden/Ignored during edit
      bazarAmount: Number(member.bazar_amount),
    });
    setShowModal(true);
  };

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Activity className={`w-10 h-10 animate-pulse ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <p className={`text-sm font-medium animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading member directory...
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
              Directory
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Manage hostel residents, balances, and access.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus className="w-5 h-5" />
            Add Member
          </button>
        </motion.div>

        {/* MAIN DATA SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
            isDark ? 'bg-slate-800/60 border-white/5 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Search Bar Area */}
          <div className={`p-4 sm:p-6 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <div className="relative max-w-md">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                  isDark 
                    ? 'bg-slate-900/50 border-white/10 text-white placeholder-slate-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={isDark ? 'bg-slate-900/40' : 'bg-slate-50'}>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Resident</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Contact</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Balance</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Joined</th>
                  <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Actions</th>
                </tr>
              </thead>
              <motion.tbody 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}
              >
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <motion.tr 
                      variants={rowVariants}
                      key={member.id} 
                      className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                    >
                      {/* Resident Info */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <UserCircle className="w-5 h-5" />
                          </div>
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{member.name}</span>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          <Mail className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                          {member.email}
                        </div>
                      </td>

                      {/* Bazar Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${
                          Number(member.bazar_amount) > 0 
                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                            : (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                        }`}>
                          <Wallet className="w-3.5 h-3.5" />
                          ৳{Number(member.bazar_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <CalendarDays className="w-4 h-4 opacity-70" />
                          {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => openEditModal(member)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-indigo-500/20 text-indigo-400' : 'hover:bg-indigo-100 text-indigo-600'
                            }`}
                            title="Edit Member"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id, member.auth_id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-600'
                            }`}
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-50">
                        <Users className={`w-12 h-12 mb-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        <p className={`text-base font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {searchTerm ? 'No members found matching your search.' : 'No members registered yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </motion.tbody>
            </table>
          </div>
        </motion.div>

        {/* ADD/EDIT MODAL */}
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
                className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                  isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {editingMember ? 'Update Profile' : 'New Member'}
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

                <form onSubmit={editingMember ? handleUpdateMember : handleAddMember} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                      placeholder="Input Name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                      placeholder="user@gmail.com"
                    />
                  </div>

                  {/* Password (Only on Add) */}
                  {!editingMember && (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Initial Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                          isDark ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {/* Initial Deposit / Bazar Amount */}
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Bazar Deposit (৳)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.bazarAmount || ''}
                      onChange={(e) => setFormData({ ...formData, bazarAmount: Number(e.target.value) })}
                      className={`w-full px-4 py-3.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium ${
                        isDark ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                      placeholder="0.00"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className={`flex-1 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 ${
                        isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {editingMember ? 'Save Changes' : 'Register User'}
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