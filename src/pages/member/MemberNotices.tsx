import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase, Notice } from '../../lib/supabase';
import MemberLayout from '../../components/member/MemberLayout';
import { Bell } from 'lucide-react';

export default function MemberNotices() {
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

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
        <p className="text-gray-600 mt-1">Important announcements from management</p>
      </div>

      <div className="space-y-4">
        {notices.map((notice) => (
          <div key={notice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{notice.title}</h3>
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{notice.message}</p>
                <p className="text-sm text-gray-500">
                  Posted on {new Date(notice.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {notices.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            No notices available
          </div>
        )}
      </div>
    </MemberLayout>
  );
}
