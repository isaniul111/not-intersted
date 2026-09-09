import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, Loader2, Moon, RefreshCw, Sun, Utensils } from 'lucide-react';
import MemberLayout from '../../components/member/MemberLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type MealRow = {
  id: string;
  date: string;
  day_menu_name: string | null;
  night_menu_name: string | null;
  day_preference: string | null;
  night_preference: string | null;
};

type PublicPreference = {
  id: string;
  meal_id: string;
  member_id: string;
  meal_time: 'day' | 'night';
  preferred_item: string;
  member?: { name: string } | null;
  meal?: { date: string } | null;
};

const formatDate = (date: string) => new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: '2-digit', month: 'short', timeZone: 'Asia/Dhaka'
}).format(new Date(`${date}T00:00:00+06:00`));

const getDhakaNow = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) % 24 };
};

export default function MemberMealPreferences() {
  const { profile } = useAuth();
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [preferences, setPreferences] = useState<PublicPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('memberTheme') !== 'light');

  useEffect(() => {
    const id = window.setInterval(() => setIsDark(localStorage.getItem('memberTheme') !== 'light'), 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => { if (profile) loadData(); }, [profile]);

  const today = useMemo(() => getDhakaNow(), []);
  const isLocked = (date: string, type: 'day' | 'night') => {
    if (date < today.date) return true;
    if (date > today.date) return false;
    return type === 'day' ? today.hour >= 8 : today.hour >= 20;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const hostelId = (profile as any)?.hostel_id;
      const memberId = (profile as any)?.id;
      const start = today.date;
      const [{ data: mealData, error: mealError }, { data: prefData, error: prefError }] = await Promise.all([
        supabase.from('meals').select('id,date,day_menu_name,night_menu_name').eq('hostel_id', hostelId).gte('date', start).order('date').limit(31),
        supabase.from('meal_preferences').select('id,meal_id,member_id,meal_time,preferred_item,member:members(name),meal:meals(date)').eq('hostel_id', hostelId).gte('meal_date', start).order('meal_date').order('meal_time'),
      ]);
      if (mealError) throw mealError;
      if (prefError) throw prefError;

      const prefRows = (prefData || []) as any[];
      setPreferences(prefRows.map(p => ({ ...p, member: Array.isArray(p.member) ? p.member[0] : p.member, meal: Array.isArray(p.meal) ? p.meal[0] : p.meal })));

      const rows = (mealData || []).map((meal: any) => {
        const day = prefRows.find(p => p.meal_id === meal.id && p.member_id === memberId && p.meal_time === 'day');
        const night = prefRows.find(p => p.meal_id === meal.id && p.member_id === memberId && p.meal_time === 'night');
        return { ...meal, day_preference: day?.preferred_item || null, night_preference: night?.preferred_item || null };
      });
      setMeals(rows);
    } catch (e: any) {
      alert(e.message || 'Failed to load meal preferences.');
    } finally { setLoading(false); }
  };

  const savePreference = async (meal: MealRow, time: 'day' | 'night', value: string) => {
    const key = `${meal.id}-${time}`;
    if (isLocked(meal.date, time)) {
      alert(time === 'day' ? 'Day meal preference is locked after 08:00 AM.' : 'Night meal preference is locked after 08:00 PM.');
      return;
    }
    try {
      setSavingKey(key);
      const memberId = (profile as any).id;
      if (!value) {
        const { error } = await supabase.from('meal_preferences').delete().eq('meal_id', meal.id).eq('member_id', memberId).eq('meal_time', time);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meal_preferences').upsert({
          meal_id: meal.id, member_id: memberId, hostel_id: (profile as any).hostel_id,
          meal_date: meal.date, meal_time: time, preferred_item: value,
        }, { onConflict: 'meal_id,member_id,meal_time' });
        if (error) throw error;
      }
      await loadData();
    } catch (e: any) { alert(e.message || 'Could not save preference.'); }
    finally { setSavingKey(null); }
  };

  if (loading) return <MemberLayout><div className="min-h-[70vh] flex items-center justify-center"><Loader2 className="w-9 h-9 animate-spin text-indigo-500" /></div></MemberLayout>;

  return <MemberLayout>
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2"><div className={`p-3 rounded-2xl ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}><Utensils size={24}/></div><h1 className={`text-3xl sm:text-4xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>Meal Preference</h1></div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tell the mess which menu item you prefer for each day and meal time. This is separate from your actual meal count.</p>
        </div>
        <button onClick={loadData} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white text-slate-700'}`}><RefreshCw size={16}/>Refresh</button>
      </div>

      {meals.length === 0 ? <div className={`rounded-3xl border p-12 text-center ${isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200'}`}><CalendarDays className="w-12 h-12 mx-auto mb-4 text-slate-400"/><h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>No meal charts available</h2><p className="mt-1 text-sm text-slate-500">Ask the admin to publish meal menus.</p></div> : <div className="space-y-4">
        {meals.map((meal, index) => <motion.div key={meal.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:index*.02}} className={`rounded-3xl border p-5 sm:p-6 ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-500">{meal.date === today.date ? 'Today' : 'Upcoming'}</p><h2 className={`text-xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{formatDate(meal.date)}</h2></div><p className={`text-xs rounded-xl px-3 py-2 ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>Preference does not change actual meal count.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PreferenceSelect icon={<Sun size={19} className="text-amber-500"/>} label="Day / Lunch" value={meal.day_preference || ''} menu={meal.day_menu_name} locked={isLocked(meal.date,'day')} saving={savingKey===`${meal.id}-day`} dark={isDark} onChange={v=>savePreference(meal,'day',v)}/>
            <PreferenceSelect icon={<Moon size={19} className="text-indigo-500"/>} label="Night / Dinner" value={meal.night_preference || ''} menu={meal.night_menu_name} locked={isLocked(meal.date,'night')} saving={savingKey===`${meal.id}-night`} dark={isDark} onChange={v=>savePreference(meal,'night',v)}/>
          </div>
        </motion.div>)}
      </div>}

      <div className={`mt-8 rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`p-5 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}><h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Everyone's Preferences</h2><p className="text-xs mt-1 text-slate-500">All members can see the preferences submitted for their mess.</p></div>
        {preferences.length===0 ? <div className="p-10 text-center text-sm text-slate-500">No preferences submitted yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className={isDark?'bg-slate-900/50':'bg-slate-50'}><th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Date</th><th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Time</th><th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Member</th><th className="px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Preferred Item</th></tr></thead><tbody className={`divide-y ${isDark?'divide-white/5':'divide-slate-100'}`}>{preferences.map(p=><tr key={p.id}><td className="px-5 py-3 text-sm text-slate-400">{p.meal?.date ? formatDate(p.meal.date) : '-'}</td><td className="px-5 py-3 text-sm font-semibold text-slate-400">{p.meal_time==='day'?'Day':'Night'}</td><td className={`px-5 py-3 text-sm font-semibold ${isDark?'text-white':'text-slate-900'}`}>{p.member?.name || 'Member'}</td><td className={`px-5 py-3 text-sm ${isDark?'text-slate-300':'text-slate-700'}`}><span className="inline-flex items-center gap-2"><Check size={15} className="text-emerald-500"/>{p.preferred_item}</span></td></tr>)}</tbody></table></div>}
      </div>
    </div>
  </MemberLayout>;
}

function PreferenceSelect({icon,label,value,menu,locked,saving,dark,onChange}:{icon:React.ReactNode;label:string;value:string;menu:string|null;locked:boolean;saving:boolean;dark:boolean;onChange:(v:string)=>void}){
  const options = menu ? menu.split(',').map(v=>v.trim()).filter(Boolean) : [];
  if (menu && options.length===0) options.push(menu);
  return <div className={`rounded-2xl border p-4 ${dark?'bg-white/[0.02] border-white/5':'bg-slate-50 border-slate-200'}`}>
    <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><span>{icon}</span><span className={`font-bold ${dark?'text-white':'text-slate-900'}`}>{label}</span></div>{saving?<Loader2 size={17} className="animate-spin text-indigo-500"/>:value?<span className="text-xs font-bold text-emerald-500">SELECTED</span>:null}</div>
    <select disabled={locked||saving||!menu} value={value} onChange={e=>onChange(e.target.value)} className={`w-full rounded-xl border px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 ${dark?'bg-slate-900/60 border-white/10 text-white':'bg-white border-slate-200 text-slate-800'}`}>
      <option value="">{!menu?'Menu not set':locked?'Preference locked':'Select preferred item'}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
    <p className="text-[11px] mt-2 text-slate-500">{locked ? (label.startsWith('Day')?'Locked after 08:00 AM':'Locked after 08:00 PM') : menu ? 'Choose the item you want to tell the mess about.' : 'Admin has not set this menu yet.'}</p>
  </div>
}
