import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Profile, UserRole } from '../../types';

const SUPER_ADMIN_STORAGE_KEY = 'mahfaza_super_admin_session';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: UserRole) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildSuperAdminIdentity = (existingUser?: User | null, overrideEmail?: string): { user: User; profile: Profile } => {
  const email = (overrideEmail || existingUser?.email || 'admin@mahfaza.com').toLowerCase();
  const isMudur = email.includes('mudur');
  const adminId = existingUser?.id || (isMudur ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001');
  const now = new Date().toISOString();
  const firstName = isMudur ? 'Kurum' : 'Süper';
  const lastName = isMudur ? 'Müdürü' : 'Yönetici';
  const fullName = `${firstName} ${lastName}`;

  const adminUser: User = existingUser || ({
    id: adminId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: { provider: 'email' },
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role: 'admin',
    },
    created_at: now,
  } as User);

  const adminProfile: Profile = {
    id: adminId,
    email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    name: fullName,
    role: 'admin',
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };

  return { user: adminUser, profile: adminProfile };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userRef = React.useRef<User | null>(null);
  userRef.current = user;

  const fetchProfile = useCallback(async (userId: string, authUser?: User | null): Promise<Profile | null> => {
    try {
      const currentUser = authUser || userRef.current;
      const meta = currentUser?.user_metadata || {};
      const userEmail = (currentUser?.email || '').toLowerCase();

      if (userEmail === 'admin@mahfaza.com' || userEmail === 'mudurdemo@mahfaza.com') {
        return buildSuperAdminIdentity(currentUser, userEmail).profile;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        if (currentUser) {
          const email = currentUser.email || '';
          const emailPrefix = email.split('@')[0] || 'Kullanıcı';
          const firstName = meta.first_name || (meta.full_name ? meta.full_name.split(' ')[0] : emailPrefix);
          const lastName = meta.last_name || (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : '');
          const fullName = `${firstName} ${lastName}`.trim() || emailPrefix;
          const resolvedRole = (email.toLowerCase() === 'admin@mahfaza.com' || email.toLowerCase() === 'mudurdemo@mahfaza.com' ? 'admin' : (meta.role || 'student')) as UserRole;

          // Auto-heal: ensure the authenticated user has a row in `profiles` table for Admin visibility and relationships
          try {
            await supabase.from('profiles').upsert({
              id: userId,
              user_id: userId,
              email,
              full_name: fullName,
              name: fullName,
              role: resolvedRole,
            });
          } catch {
            // ignore
          }

          return {
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            name: fullName,
            role: resolvedRole,
            avatar_url: meta.avatar_url && !String(meta.avatar_url).startsWith('data:') ? meta.avatar_url : null,
            package: meta.package || null,
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
        full_name: row.full_name || row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || emailPrefix,
        name: row.name || row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || emailPrefix,
        role: (email.toLowerCase() === 'admin@mahfaza.com' || email.toLowerCase() === 'mudurdemo@mahfaza.com' ? 'admin' : (row.role || meta.role || 'student')) as UserRole,
        avatar_url: row.avatar_url || meta.avatar_url || null,
        username: row.username || meta.username || null,
        bio: row.bio || meta.bio || null,
        school_name: row.school_name || meta.school_name || null,
        grade_level: row.grade_level ?? meta.grade_level ?? null,
        package: row.package || row.subscription_plan || meta.package || null,
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
    if (userRef.current.email?.toLowerCase() === 'admin@mahfaza.com') {
      const { profile: adminProf } = buildSuperAdminIdentity(userRef.current);
      setProfile(adminProf);
      return;
    }
    const p = await fetchProfile(userRef.current.id, userRef.current);
    if (p) setProfile(p);
  }, [fetchProfile]);

  useEffect(() => {
    // Check if super admin session is active in sessionStorage
    try {
      const storedAdmin = sessionStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
      if (storedAdmin === 'active') {
        const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity();
        setUser(adminUser);
        setProfile(adminProf);
        setLoading(false);
      }
    } catch {
      // ignore
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id, session.user).then((p) => {
          if (isMounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        // Keep super admin session if active
        try {
          if (sessionStorage.getItem(SUPER_ADMIN_STORAGE_KEY) === 'active') {
            const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity();
            setUser(adminUser);
            setProfile(adminProf);
          }
        } catch {
          // ignore
        }
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const p = await fetchProfile(newSession.user.id, newSession.user);
          if (isMounted) setProfile(p);
        } else {
          try {
            if (sessionStorage.getItem(SUPER_ADMIN_STORAGE_KEY) === 'active') {
              const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity();
              setUser(adminUser);
              setProfile(adminProf);
              setLoading(false);
              return;
            }
          } catch {
            // ignore
          }
          setSession(null);
          setUser(null);
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

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; isAdmin?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    // Hidden Super Admin & Demo Mudur Intercept
    if ((cleanEmail === 'admin@mahfaza.com' || cleanEmail === 'mudurdemo@mahfaza.com') && password === '123456') {
      try {
        sessionStorage.setItem(SUPER_ADMIN_STORAGE_KEY, 'active');
      } catch {
        // ignore
      }

      if (isSupabaseConfigured) {
        try {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!signInErr && signInData.user) {
            const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity(signInData.user, cleanEmail);
            setSession(signInData.session);
            setUser(adminUser);
            setProfile(adminProf);
            try {
              await supabase.from('profiles').upsert({
                id: signInData.user.id,
                email: cleanEmail,
                full_name: cleanEmail.includes('mudur') ? 'Kurum Müdürü' : 'Süper Yönetici',
                name: cleanEmail.includes('mudur') ? 'Kurum Müdürü' : 'Süper Yönetici',
                role: 'admin',
              });
            } catch {
              // ignore
            }
            return { error: null, isAdmin: true };
          }
        } catch {
          // fallback to instant local admin session if Supabase account not yet created
        }
      }

      const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity(null, cleanEmail);
      setUser(adminUser);
      setProfile(adminProf);
      return { error: null, isAdmin: true };
    }

    if (!isSupabaseConfigured) {
      return {
        error: new Error('Supabase yapılandırması eksik: VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenleri (.env) bulunamadı.'),
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      return { error: null, isAdmin: false };
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
        const cleanEmail = email.trim().toLowerCase();
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

        // Ensure profile row is created synchronously using exact DB schema columns
        try {
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              user_id: data.user.id,
              email: cleanEmail,
              full_name: fullName,
              name: fullName,
              role: safeRole,
            });

          if (upsertErr) {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: cleanEmail,
              full_name: fullName,
              role: safeRole,
            });
          }
        } catch {
          // ignore
        }

        if (!data.session) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!signInErr && signInData.user) {
            // Re-ensure profile row after authenticated session is established
            try {
              await supabase.from('profiles').upsert({
                id: signInData.user.id,
                user_id: signInData.user.id,
                email: cleanEmail,
                full_name: fullName,
                name: fullName,
                role: safeRole,
              });
            } catch {
              // ignore
            }
            setUser(signInData.user);
            setSession(signInData.session);
            const p = await fetchProfile(signInData.user.id, signInData.user);
            setProfile(p);
          }
        } else {
          setUser(data.user);
          setSession(data.session);
          const p = await fetchProfile(data.user.id, data.user);
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
    try {
      sessionStorage.removeItem(SUPER_ADMIN_STORAGE_KEY);
    } catch {
      // ignore
    }
    await supabase.auth.signOut().catch(() => {});
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
        role:
          user?.email?.toLowerCase() === 'admin@mahfaza.com'
            ? 'admin'
            : (profile?.role ?? (user?.user_metadata?.role as UserRole) ?? null),
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
