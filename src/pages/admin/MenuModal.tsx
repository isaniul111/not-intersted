import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sun, Moon, Image as ImageIcon, Trash2, Search,
  Activity, Utensils, Plus, Pencil, Check, AlertTriangle,
  ChevronLeft, Upload
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FoodItem {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  details: string;
}

type MenuType = { name: string; image: string } | null;

// 'list'   → মূল list view
// 'add'    → নতুন food add করার form
// 'edit'   → existing food edit করার form
type ViewMode = 'list' | 'add' | 'edit';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  dayMenu: MenuType;
  setDayMenu: (menu: MenuType) => void;
  nightMenu: MenuType;
  setNightMenu: (menu: MenuType) => void;
  onSave: () => void;
}

// ─── Supabase Config ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://pwlucglqqmjugvzzuiep.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U5T-VIhGN1dh3w3obRxN-Q_SXF1iQN9';

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({
  message, type, onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${
        type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
      }`}
    >
      {type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
      {message}
    </motion.div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function ConfirmDialog({
  food, isDark, onConfirm, onCancel,
}: {
  food: FoodItem;
  isDark: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`relative w-full max-w-sm p-6 rounded-2xl shadow-2xl border ${
          isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <Trash2 size={24} className="text-rose-500" />
          </div>
          <h3
            className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Delete Food Item?
          </h3>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-semibold text-rose-500">{food.name}</span> permanently
            database থেকে delete হয়ে যাবে। এটি আর ফিরে পাওয়া যাবে না।
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            Yes, Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MenuModal({
  isOpen, onClose, isDark,
  dayMenu, setDayMenu,
  nightMenu, setNightMenu,
  onSave,
}: MenuModalProps) {

  // List state
  const [dbFoods, setDbFoods]     = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');

  // View state
  const [viewMode, setViewMode]         = useState<ViewMode>('list');
  const [editingFood, setEditingFood]   = useState<FoodItem | null>(null);
  const [confirmFood, setConfirmFood]   = useState<FoodItem | null>(null);

  // Form state
  const [formName, setFormName]       = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const resetForm = () => {
    setFormName('');
    setFormDetails('');
    setFormImageUrl('');
    setFormError(null);
  };

  const goToList = () => {
    setViewMode('list');
    setEditingFood(null);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setViewMode('add');
  };

  const openEdit = (food: FoodItem) => {
    setEditingFood(food);
    setFormName(food.name);
    setFormDetails(food.details || '');
    setFormImageUrl(food.image_url || '');
    setFormError(null);
    setViewMode('edit');
  };

  // ── Modal open/close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMenuSearch('');
      setViewMode('list');
      resetForm();
      fetchFoods();
    }
  }, [isOpen]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filteredFoods = dbFoods.filter((food) =>
    food.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  // ── API Calls ─────────────────────────────────────────────────────────────────

  // READ
  const fetchFoods = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/food_items?select=*&order=created_at.desc`, {
        headers: supabaseHeaders,
      });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      setDbFoods(await res.json());
    } catch (err) {
      showToast('Foods load করা যায়নি। Retry করুন।', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // CREATE
  const handleAdd = async () => {
    if (!formName.trim()) { setFormError('Food name দিতে হবে।'); return; }
    if (!formImageUrl.trim()) { setFormError('Image URL দিতে হবে।'); return; }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/food_items`, {
        method: 'POST',
        headers: supabaseHeaders,
        body: JSON.stringify({
          name: formName.trim(),
          image_url: formImageUrl.trim(),
          details: formDetails.trim(),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.message || `Add failed: ${res.status}`);
      }
      const [newFood] = await res.json();
      setDbFoods((prev) => [newFood, ...prev]);
      showToast(`"${formName}" successfully add হয়েছে! 🎉`, 'success');
      goToList();
    } catch (err: any) {
      setFormError(err.message || 'Food add করতে সমস্যা হয়েছে।');
    } finally {
      setFormSubmitting(false);
    }
  };

  // UPDATE
  const handleUpdate = async () => {
    if (!editingFood) return;
    if (!formName.trim()) { setFormError('Food name দিতে হবে।'); return; }
    if (!formImageUrl.trim()) { setFormError('Image URL দিতে হবে।'); return; }

    setFormSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/food_items?id=eq.${editingFood.id}`,
        {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify({
            name: formName.trim(),
            image_url: formImageUrl.trim(),
            details: formDetails.trim(),
          }),
        }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.message || `Update failed: ${res.status}`);
      }
      const [updated] = await res.json();
      setDbFoods((prev) =>
        prev.map((f) => (f.id === editingFood.id ? updated : f))
      );
      // Update day/night menu if the edited food is selected
      if (dayMenu?.name === editingFood.name) {
        setDayMenu({ name: updated.name, image: updated.image_url });
      }
      if (nightMenu?.name === editingFood.name) {
        setNightMenu({ name: updated.name, image: updated.image_url });
      }
      showToast(`"${formName}" সফলভাবে update হয়েছে! ✅`, 'success');
      goToList();
    } catch (err: any) {
      setFormError(err.message || 'Update করতে সমস্যা হয়েছে।');
    } finally {
      setFormSubmitting(false);
    }
  };

  // DELETE
  const handleDelete = async (food: FoodItem) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/food_items?id=eq.${food.id}`,
        { method: 'DELETE', headers: supabaseHeaders }
      );
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setDbFoods((prev) => prev.filter((f) => f.id !== food.id));
      // Clear from menu if deleted food was selected
      if (dayMenu?.name === food.name) setDayMenu(null);
      if (nightMenu?.name === food.name) setNightMenu(null);
      showToast(`"${food.name}" delete হয়েছে।`, 'success');
    } catch {
      showToast('Delete করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setConfirmFood(null);
    }
  };

  // ── Shared input style ────────────────────────────────────────────────────────
  const inputCls = `w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium ${
    isDark
      ? 'bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  const labelCls = `block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  // ── Form View (Add / Edit) ────────────────────────────────────────────────────
  const FormView = () => (
    <motion.div
      key="form"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {/* Back button + title */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={goToList}
          className={`p-2 rounded-xl transition-colors ${
            isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {viewMode === 'add' ? '➕ New Food Add করুন' : '✏️ Food Update করুন'}
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {viewMode === 'add'
              ? 'নতুন food item database-এ save হবে'
              : `"${editingFood?.name}" এর তথ্য পরিবর্তন করুন`}
          </p>
        </div>
      </div>

      {/* Image preview */}
      {formImageUrl && (
        <div className="overflow-hidden rounded-2xl h-40 w-full">
          <img
            src={formImageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://placehold.co/400x160?text=Invalid+URL';
            }}
          />
        </div>
      )}

      {/* Image URL */}
      <div>
        <label className={labelCls}>
          <span className="flex items-center gap-1.5"><Upload size={12} /> Image URL *</span>
        </label>
        <input
          type="url"
          value={formImageUrl}
          onChange={(e) => setFormImageUrl(e.target.value)}
          placeholder="https://example.com/food-image.jpg"
          className={inputCls}
        />
      </div>

      {/* Name */}
      <div>
        <label className={labelCls}>
          <span className="flex items-center gap-1.5"><Utensils size={12} /> Food Name *</span>
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="যেমন: Chicken Biryani"
          className={inputCls}
        />
      </div>

      {/* Details */}
      <div>
        <label className={labelCls}>Description (optional)</label>
        <textarea
          value={formDetails}
          onChange={(e) => setFormDetails(e.target.value)}
          placeholder="খাবারের বিবরণ লিখুন..."
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Error */}
      {formError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
          <AlertTriangle size={15} /> {formError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={goToList}
          disabled={formSubmitting}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={viewMode === 'add' ? handleAdd : handleUpdate}
          disabled={formSubmitting}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 ${
            viewMode === 'add'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {formSubmitting ? (
            <>
              <Activity size={15} className="animate-spin" />
              {viewMode === 'add' ? 'Adding...' : 'Updating...'}
            </>
          ) : (
            <>
              {viewMode === 'add' ? <Plus size={15} /> : <Check size={15} />}
              {viewMode === 'add' ? 'Database-এ Save করুন' : 'Update করুন'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );

  // ── List View ─────────────────────────────────────────────────────────────────
  const ListView = () => (
    <motion.div
      key="list"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Search + Add Button */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <input
            type="text"
            value={menuSearch}
            onChange={(e) => setMenuSearch(e.target.value)}
            placeholder="Search foods..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium ${
              isDark
                ? 'bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>

        {/* Reload */}
        <button
          onClick={fetchFoods}
          title="Reload"
          disabled={isLoading}
          className={`px-3 rounded-xl border transition-colors ${
            isDark
              ? 'bg-slate-800/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Activity size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>

        {/* Add New */}
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-500/30 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus size={16} /> New Food
        </button>
      </div>

      {/* Count badge */}
      {!isLoading && dbFoods.length > 0 && (
        <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {filteredFoods.length} / {dbFoods.length} item{dbFoods.length !== 1 ? 's' : ''}
          {menuSearch && ` — "${menuSearch}" এর result`}
        </p>
      )}

      {/* Food Grid */}
      <div
        className={`flex-1 min-h-[340px] max-h-[460px] overflow-y-auto pr-1 grid grid-cols-2 gap-3 ${
          isDark ? 'custom-scrollbar-dark' : 'custom-scrollbar'
        }`}
      >
        {isLoading ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 opacity-50">
            <Activity className="w-8 h-8 animate-spin mb-3" />
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Database থেকে load হচ্ছে...
            </p>
          </div>

        ) : filteredFoods.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-16 opacity-50">
            <Utensils className="w-10 h-10 mb-3" />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {menuSearch ? 'কোনো matching food পাওয়া যায়নি।' : 'Database-এ কোনো food নেই। Add করুন!'}
            </p>
          </div>

        ) : (
          filteredFoods.map((food) => (
            <motion.div
              key={food.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className={`p-3 rounded-2xl border group transition-all duration-200 ${
                isDark
                  ? 'bg-slate-800/80 border-white/10 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'
              }`}
            >
              {/* Image */}
              <div className="overflow-hidden rounded-xl mb-2.5 relative">
                <img
                  src={food.image_url}
                  className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-500"
                  alt={food.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/200x96?text=No+Image';
                  }}
                />
                {/* Edit overlay */}
                <button
                  onClick={() => openEdit(food)}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-black/50 hover:bg-indigo-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              </div>

              {/* Name */}
              <p
                className={`text-xs font-bold truncate mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}
                title={food.name}
              >
                {food.name}
              </p>

              {/* Details */}
              {food.details && (
                <p
                  className={`text-[10px] truncate mb-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                  title={food.details}
                >
                  {food.details}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDayMenu({ name: food.name, image: food.image_url })}
                  className={`flex-1 text-[10px] py-1.5 font-bold rounded-lg transition-colors ${
                    dayMenu?.name === food.name
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  }`}
                >
                  ☀️ Day
                </button>
                <button
                  onClick={() => setNightMenu({ name: food.name, image: food.image_url })}
                  className={`flex-1 text-[10px] py-1.5 font-bold rounded-lg transition-colors ${
                    nightMenu?.name === food.name
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20'
                  }`}
                >
                  🌙 Night
                </button>
                <button
                  onClick={() => setConfirmFood(food)}
                  className="p-1.5 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {confirmFood && (
          <ConfirmDialog
            food={confirmFood}
            isDark={isDark}
            onConfirm={() => handleDelete(confirmFood)}
            onCancel={() => setConfirmFood(null)}
          />
        )}
      </AnimatePresence>

      {/* Main Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`relative w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-3xl shadow-2xl border ${
                isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {viewMode === 'list' && 'Daily Menu'}
                    {viewMode === 'add'  && 'Add New Food'}
                    {viewMode === 'edit' && 'Edit Food'}
                  </h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {viewMode === 'list' && 'Food assign করুন এবং database manage করুন'}
                    {viewMode === 'add'  && 'নতুন food item database-এ যোগ করুন'}
                    {viewMode === 'edit' && 'বিদ্যমান food-এর তথ্য পরিবর্তন করুন'}
                  </p>
                </div>
                <button
                  onClick={viewMode !== 'list' ? goToList : onClose}
                  className={`p-2 rounded-full transition-colors ${
                    isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* ── Body: Left + Right ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* ── LEFT: Selected Menus ── */}
                <div className="space-y-5">
                  {/* Day Meal */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-base font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                      <Sun size={18} /> Day Meal
                    </h3>
                    {dayMenu ? (
                      <div className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <img
                          src={dayMenu.image}
                          alt={dayMenu.name}
                          className="w-16 h-16 rounded-xl object-cover shadow-md"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x64?text=?'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-base leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {dayMenu.name}
                          </p>
                          <button
                            onClick={() => setDayMenu(null)}
                            className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1 mt-2 font-semibold"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl opacity-50 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        <ImageIcon size={28} className="mb-2" />
                        <p className="text-xs font-medium">Right side থেকে select করুন</p>
                      </div>
                    )}
                  </div>

                  {/* Night Meal */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-base font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                      <Moon size={18} /> Night Meal
                    </h3>
                    {nightMenu ? (
                      <div className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                        <img
                          src={nightMenu.image}
                          alt={nightMenu.name}
                          className="w-16 h-16 rounded-xl object-cover shadow-md"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x64?text=?'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-base leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {nightMenu.name}
                          </p>
                          <button
                            onClick={() => setNightMenu(null)}
                            className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1 mt-2 font-semibold"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl opacity-50 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                        <ImageIcon size={28} className="mb-2" />
                        <p className="text-xs font-medium">Right side থেকে select করুন</p>
                      </div>
                    )}
                  </div>

                  {/* Save Menu Button */}
                  <button
                    onClick={onSave}
                    disabled={!dayMenu && !nightMenu}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 active:scale-95"
                  >
                    Save Menu to Database
                  </button>
                </div>

                {/* ── RIGHT: Food List / Add / Edit ── */}
                <AnimatePresence mode="wait">
                  {viewMode === 'list' ? <ListView key="list" /> : <FormView key="form" />}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}