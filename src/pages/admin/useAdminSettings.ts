import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export function useAdminSettings() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // প্রোফাইল আপডেট করার ফাংশন
  const updateProfile = async (hostelName: string, fullName: string) => {
    setLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('admins')
        .update({
          hostel_name: hostelName,
          full_name: fullName,
        })
        .eq('id', (profile as any).id);

      if (error) throw error;

      await refreshProfile();
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
      
      setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // পাসওয়ার্ড পরিবর্তন করার ফাংশন
  const changePassword = async (newPassword: string, confirmPassword: string) => {
    setPasswordMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return false; // ফর্ম ক্লিয়ার না করার জন্য false রিটার্ন
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return false;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000);
      return true; // সাকসেস হলে true রিটার্ন, যাতে ফর্ম ক্লিয়ার করা যায়
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    profileMessage,
    passwordMessage,
    updateProfile,
    changePassword,
  };
}