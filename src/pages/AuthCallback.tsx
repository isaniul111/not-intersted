import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [message, setMessage] = useState(
    'Completing Google sign-in...'
  );

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        // Get login role from callback URL
        const role = params.get('role');

        if (role !== 'admin' && role !== 'member') {
          throw new Error('Invalid login role.');
        }

        // Get Google OAuth session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          throw new Error(
            'Google session was not created.'
          );
        }

        /*
         * Link the Google account with the existing
         * admin/member account.
         *
         * The Supabase function checks the Google
         * email against the existing database account.
         */
        const { data, error } = await supabase.rpc(
          'link_google_account',
          {
            p_role: role,
          }
        );

        if (error) {
          throw error;
        }

        if (!active) return;

        setMessage(
          'Login successful. Redirecting...'
        );

        window.setTimeout(() => {
          if (!active) return;

          if (data === 'admin') {
            navigate('/admin/dashboard', {
              replace: true,
            });
          } else if (data === 'member') {
            navigate('/dashboard', {
              replace: true,
            });
          } else {
            throw new Error(
              'Account role could not be verified.'
            );
          }
        }, 250);
      } catch (e: any) {
        console.error(
          'Google authentication error:',
          e
        );

        if (!active) return;

        await supabase.auth.signOut();

        setMessage(
          e?.message ||
            'Google login was not authorized for this account.'
        );
      }
    };

    handleCallback();

    return () => {
      active = false;
    };
  }, [navigate, params]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="text-center">

        <Loader2
          className="w-10 h-10 animate-spin mx-auto text-indigo-400"
        />

        <p className="mt-4 text-sm text-slate-300">
          {message}
        </p>

      </div>
    </div>
  );
}