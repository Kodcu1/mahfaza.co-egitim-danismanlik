import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Profile, UserRole } from '../../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: UserRole) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Ref to hold current user for callbacks without triggering re-render cascades
  const userRef = React.useRef<User | null>(null);
  userRef.current = user;

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null): Promise<Profile | null> => {
    try {
      const currentUser = authUser || userRef.current;
      const meta = currentUser?.user_metadata || {};

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        // Safe profile resolution from Auth User metadata (guarantees zero crash if table/column missing)
        if (currentUser) {
          const email = currentUser.email || '';
          const emailPrefix = email.split('@')[0] || 'Kullanıcı';
          return {
            id: userId,
            email,
            first_name: meta.first_name || (meta.full_name ? meta.full_name.split(' ')[0] : emailPrefix),
            last_name: meta.last_name || (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : ''),
            role: (meta.role || 'student') as UserRole,
            avatar_url: meta.avatar_url || null,
            created_at: currentUser.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        return null;
      }

      const row = data as any;
      const email = row.email || currentUser?.email || '';
      const emailPrefix = email.split('@')[0] || 'Kullanıcı';

      return {
        id: row.id || userId,
        email,
        first_name: row.first_name || (row.full_name ? row.full_name.split(' ')[0] : (row.name ? row.name.split(' ')[0] : (meta.first_name || emailPrefix))),
        last_name: row.last_name || (row.full_name ? row.full_name.split(' ').slice(1).join(' ') : (row.name ? row.name.split(' ').slice(1).join(' ') : (meta.last_name || ''))),
        role: (row.role || meta.role || 'student') as UserRole,
        avatar_url: row.avatar_url || meta.avatar_url || null,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      };
    } catch {
      const currentUser = userRef.current;
      if (currentUser) {
        const meta = currentUser.user_metadata || {};
        return {
          id: userId,
          email: currentUser.email || '',
          first_name: meta.first_name || 'Kullanıcı',
          last_name: meta.last_name || '',
          role: (meta.role || 'student') as UserRole,
          avatar_url: meta.avatar_url || null,
          created_at: currentUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userRef.current) return;
    const p = await fetchProfile(userRef.current.id, userRef.current);
    if (p) setProfile(p);
  }, [fetchProfile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial session check (runs once on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user).then((p) => {
          if (isMounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id, newSession.user);
          if (isMounted) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase yapılandırması eksik: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env) bulunamadı.'),
      };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    requestedRole: UserRole = 'student'
  ) => {
    try {
      // Security: Public registration must NEVER allow 'admin' role
      const safeRole: UserRole = requestedRole === 'admin' ? 'student' : requestedRole;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            role: safeRole,
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        // Direct profile upsert ensuring immediate profile availability with fallbacks
        try {
          const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
          await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: email.trim().toLowerCase(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: fullName,
              name: fullName,
              role: safeRole,
            });
        } catch {
          // ignore
        }

        // Instant application entry: If session was not immediately returned by signUp,
        // automatically sign in so email verification is NOT required to enter
        if (!data.session) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
          if (!signInErr && signInData.user) {
            setUser(signInData.user);
            setSession(signInData.session);
            const p = await fetchProfile(signInData.user.id);
            setProfile(p);
          }
        } else {
          setUser(data.user);
          setSession(data.session);
          const p = await fetchProfile(data.user.id);
          setProfile(p);
        }
      }

      return { error: null, user: data?.user || null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? (user?.user_metadata?.role as UserRole) ?? null,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
