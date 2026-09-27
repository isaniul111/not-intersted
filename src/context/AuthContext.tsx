import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import { User } from '@supabase/supabase-js';

import {
  supabase,
  Admin,
  Member,
} from '../lib/supabase';

type UserRole = 'admin' | 'member' | null;

type AuthContextType = {
  user: User | null;
  role: UserRole;
  profile: Admin | Member | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({
  children,
}: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);

  const [role, setRole] =
    useState<UserRole>(null);

  const [profile, setProfile] =
    useState<Admin | Member | null>(null);

  const [loading, setLoading] =
    useState(true);

  // ==========================================
  // FETCH USER PROFILE
  // ==========================================
  const fetchProfile = async (
    currentUser: User
  ) => {
    try {
      // ----------------------------------------
      // Check Admin
      // ----------------------------------------
      const {
        data: adminData,
        error: adminError,
      } = await supabase
        .from('admins')
        .select('*')
        .eq('auth_id', currentUser.id)
        .maybeSingle();

      if (adminError) {
        console.error(
          'Error fetching admin profile:',
          adminError
        );
      }

      if (adminData) {
        setRole('admin');
        setProfile(adminData as Admin);
        return;
      }

      // ----------------------------------------
      // Check Member
      // ----------------------------------------
      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from('members')
        .select('*')
        .eq('auth_id', currentUser.id)
        .maybeSingle();

      if (memberError) {
        console.error(
          'Error fetching member profile:',
          memberError
        );
      }

      if (memberData) {
        setRole('member');
        setProfile(memberData as Member);
        return;
      }

      // ----------------------------------------
      // No matching profile
      // ----------------------------------------
      setRole(null);
      setProfile(null);

    } catch (error) {
      console.error(
        'Error fetching profile:',
        error
      );

      setRole(null);
      setProfile(null);
    }
  };

  // ==========================================
  // REFRESH PROFILE
  // ==========================================
  const refreshProfile = async () => {
    if (!user) return;

    await fetchProfile(user);
  };

  // ==========================================
  // INITIAL SESSION RESTORE
  // ==========================================
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            'Error restoring session:',
            error
          );

          if (mounted) {
            setUser(null);
            setRole(null);
            setProfile(null);
          }

          return;
        }

        if (!mounted) return;

        // --------------------------------------
        // Existing session found
        // --------------------------------------
        if (session?.user) {
          setUser(session.user);

          await fetchProfile(session.user);
        } else {
          // ------------------------------------
          // No existing session
          // ------------------------------------
          setUser(null);
          setRole(null);
          setProfile(null);
        }

      } catch (error) {
        console.error(
          'Session restore error:',
          error
        );

        if (!mounted) return;

        setUser(null);
        setRole(null);
        setProfile(null);

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    // ========================================
    // AUTH STATE LISTENER
    // ========================================
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        console.log(
          'Auth state changed:',
          event
        );

        // ------------------------------------
        // Logged in / session restored
        // ------------------------------------
        if (session?.user) {
          setUser(session.user);

          /*
           * Important:
           * Don't await fetchProfile() directly
           * inside onAuthStateChange.
           *
           * We run it after the auth callback
           * finishes to avoid blocking Supabase
           * auth initialization.
           */
          setTimeout(async () => {
            if (!mounted) return;

            await fetchProfile(session.user);

            if (mounted) {
              setLoading(false);
            }
          }, 0);

        } else {
          // ----------------------------------
          // Logged out
          // ----------------------------------
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // ========================================
    // CLEANUP
    // ========================================
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // SIGN OUT
  // ==========================================
  const signOut = async () => {
    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      setRole(null);
      setProfile(null);

    } catch (error) {
      console.error(
        'Sign out error:',
        error
      );

      throw error;
    }
  };

  // ==========================================
  // AUTH PROVIDER
  // ==========================================
  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};