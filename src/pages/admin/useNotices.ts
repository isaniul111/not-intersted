import { useState, useEffect } from 'react';
import { supabase, Notice } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export function useNotices() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

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

  const addNotice = async (title: string, message: string) => {
    try {
      const { error } = await supabase.from('notices').insert({
        hostel_id: (profile as any).id,
        title,
        message,
      });

      if (error) throw error;
      await fetchNotices();
    } catch (error: any) {
      alert(error.message);
      throw error; // Modal-এ error ধরতে throw করা হলো
    }
  };

  const deleteNotice = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice? It will be removed for all members.')) return;

    try {
      const { error } = await supabase.from('notices').delete().eq('id', noticeId);

      if (error) throw error;
      await fetchNotices();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return { notices, loading, addNotice, deleteNotice };
}