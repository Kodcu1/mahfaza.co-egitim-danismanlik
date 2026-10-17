import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Profile, UserRole } from '../../types';

const SUPER_ADMIN_STORAGE_KEY = 'mahfaza_super_admin_session';
const LOCAL_SESSION_KEY = 'mahfaza_local_session';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean; targetRole?: UserRole }>;
  loginLocally: (email: string, preferredRole?: UserRole) => { user: User; profile: Profile; targetRole: UserRole };
  signUp: (email: string, password: string, firstName: string, lastName: string, role?: UserRole) => Promise<{ error: Error | null; user?: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const buildSuperAdminIdentity = (existingUser?: User | null, overrideEmail?: string): { user: User; profile: Profile } => {
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

export const buildLocalIdentity = (
  email: string,
  preferredRole?: UserRole
): { user: User; profile: Profile; session: Session } => {
  const cleanEmail = (email || 'kullanici@mahfaza.co').trim().toLowerCase();

  let resolvedRole: UserRole = preferredRole || 'student';
  if (
    cleanEmail === 'admin@mahfaza.com' ||
    cleanEmail === 'mudurdemo@mahfaza.com' ||
    cleanEmail.includes('mudur') ||
    cleanEmail.includes('admin')
  ) {
    resolvedRole = 'admin';
  } else if (cleanEmail.includes('koc') || cleanEmail.includes('coach') || cleanEmail === 'demo.koc@mahfaza.co') {
    resolvedRole = 'coach';
  } else if (cleanEmail.includes('ogretmen') || cleanEmail.includes('teacher') || cleanEmail === 'demo.ogretmen@mahfaza.co') {
    resolvedRole = 'teacher';
  } else if (cleanEmail.includes('pdr') || cleanEmail.includes('counselor') || cleanEmail.includes('rehberlik')) {
    resolvedRole = 'counselor';
  } else if (cleanEmail.includes('veli') || cleanEmail.includes('parent')) {
    resolvedRole = 'parent';
  } else if (cleanEmail.includes('ogrenci') || cleanEmail.includes('student') || cleanEmail === 'demo.ogrenci@mahfaza.co') {
    resolvedRole = 'student';
  }

  // Consistent ID for demo & fallback users
  let userId = 'local-user-' + cleanEmail.replace(/[^a-z0-9]/g, '-');
  if (resolvedRole === 'admin') {
    userId = cleanEmail.includes('mudur') ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001';
  } else if (resolvedRole === 'coach') {
    userId = '99999999-0000-0000-0000-000000000002';
  } else if (resolvedRole === 'student') {
    userId = '99999999-0000-0000-0000-000000000001';
  } else if (resolvedRole === 'teacher') {
    userId = '99999999-0000-0000-0000-000000000004';
  } else if (resolvedRole === 'counselor') {
    userId = '99999999-0000-0000-0000-000000000005';
  } else if (resolvedRole === 'parent') {
    userId = '99999999-0000-0000-0000-000000000006';
  }

  const prefix = cleanEmail.split('@')[0] || 'Kullanıcı';
  let firstName = 'Kullanıcı';
  let lastName = '';
  if (resolvedRole === 'admin') {
    firstName = cleanEmail.includes('mudur') ? 'Kurum' : 'Süper';
    lastName = cleanEmail.includes('mudur') ? 'Müdürü' : 'Yönetici';
  } else if (resolvedRole === 'coach') {
    firstName = 'Koç';
    lastName = 'Serkan Koçak';
  } else if (resolvedRole === 'student') {
    firstName = 'Ayşegül';
    lastName = 'Koçak';
  } else if (resolvedRole === 'teacher') {
    firstName = 'Öğretmen';
    lastName = 'Selin Aksoy';
  } else if (resolvedRole === 'counselor') {
    firstName = 'Rehberlik';
    lastName = 'Zeynep Kaya';
  } else if (resolvedRole === 'parent') {
    firstName = 'Mehmet';
    lastName = 'Koçak';
  } else {
    firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const now = new Date().toISOString();

  const user: User = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: cleanEmail,
    app_metadata: { provider: 'email' },
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      name: fullName,
      role: resolvedRole,
    },
    created_at: now,
  } as User;

  const profile: Profile = {
    id: userId,
    email: cleanEmail,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    name: fullName,
    role: resolvedRole,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };

  const session: Session = {
    access_token: 'local-token-' + userId,
    refresh_token: 'local-refresh-' + userId,
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: 'bearer',
    user,
  };

  return { user, profile, session };
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

      if (error) {
        console.warn('Profile fetch error from Supabase:', error.message);
        return null;
      }

      if (!data) {
        // Authenticated user has no profiles row yet (e.g. freshly registered)
        if (currentUser) {
          const email = currentUser.email || '';
          const emailPrefix = email.split('@')[0] || 'Kullanıcı';
          const firstName = meta.first_name || (meta.full_name ? meta.full_name.split(' ')[0] : emailPrefix);
          const lastName = meta.last_name || (meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : '');
          const fullName = `${firstName} ${lastName}`.trim() || emailPrefix;
          const resolvedRole = (email.toLowerCase() === 'admin@mahfaza.com' || email.toLowerCase() === 'mudurdemo@mahfaza.com' ? 'admin' : (meta.role || 'student')) as UserRole;

          try {
            await supabase.from('profiles').insert({
              id: userId,
              user_id: userId,
              email,
              full_name: fullName,
              name: fullName,
              role: resolvedRole,
            });
          } catch {
            // ignore insert failure if restricted by RLS
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
    } catch (err: any) {
      console.warn('Profile fetch exception:', err?.message);
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

  // Direct, instantaneous local login for explicit demo button exploration
  const loginLocally = useCallback((email: string, preferredRole?: UserRole) => {
    const identity = buildLocalIdentity(email, preferredRole);
    setUser(identity.user);
    setProfile(identity.profile);
    setSession(identity.session);
    setLoading(false);

    try {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ ...identity, isDemo: true }));
      if (identity.profile.role === 'admin') {
        sessionStorage.setItem(SUPER_ADMIN_STORAGE_KEY, 'active');
      }
    } catch {
      // ignore
    }

    return {
      user: identity.user,
      profile: identity.profile,
      targetRole: identity.profile.role,
    };
  }, []);

  useEffect(() => {
    // 1. Check super admin dev session in sessionStorage
    try {
      const storedAdmin = sessionStorage.getItem(SUPER_ADMIN_STORAGE_KEY);
      if (storedAdmin === 'active') {
        const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity();
        setUser(adminUser);
        setProfile(adminProf);
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    // 2. Check explicit demo session in localStorage
    try {
      const storedLocalRaw = localStorage.getItem(LOCAL_SESSION_KEY);
      if (storedLocalRaw) {
        const storedLocal = JSON.parse(storedLocalRaw);
        if (storedLocal?.isDemo && storedLocal?.user && storedLocal?.profile) {
          setUser(storedLocal.user);
          setProfile(storedLocal.profile);
          setSession(storedLocal.session || null);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Safety timeout: Guarantee setLoading(false) within 1.2s max if Supabase network hangs or 504s
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    // 3. Genuine remote Supabase session retrieval with single-flight profile loading
    supabase.auth
      .getSession()
      .then(async ({ data: { session: remoteSession } }) => {
        if (!isMounted) return;
        if (remoteSession?.user) {
          setSession(remoteSession);
          setUser(remoteSession.user);
          const p = await fetchProfile(remoteSession.user.id, remoteSession.user);
          if (isMounted && p) {
            setProfile(p);
          }
        }
        if (isMounted) setLoading(false);
      })
      .catch((err) => {
        console.warn('Supabase getSession network note:', err?.message);
        if (isMounted) setLoading(false);
      });

    // 4. Supabase auth state listener (ignore duplicate INITIAL_SESSION to prevent race condition)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      if (event === 'INITIAL_SESSION') return; // Handled cleanly by getSession

      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        const p = await fetchProfile(newSession.user.id, newSession.user);
        if (isMounted && p) setProfile(p);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; isAdmin?: boolean; targetRole?: UserRole }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Super Admin Dev credentials
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
            return { error: null, isAdmin: true, targetRole: 'admin' };
          }
        } catch {
          // ignore
        }
      }

      const { user: adminUser, profile: adminProf } = buildSuperAdminIdentity(null, cleanEmail);
      setUser(adminUser);
      setProfile(adminProf);
      return { error: null, isAdmin: true, targetRole: 'admin' };
    }

    // 2. Enforce configuration presence
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase kimlik doğrulama servis yapılandırması eksik (VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlanmamış).'
        ),
      };
    }

    // 3. Genuine Supabase signInWithPassword — Strictly report true result without masking errors
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error: error as Error };
      }

      if (!data?.user) {
        return { error: new Error('Giriş başarısız: Kullanıcı bilgisi doğrulanamadı.') };
      }

      // Successful authentic login
      setUser(data.user);
      setSession(data.session);

      const p = await fetchProfile(data.user.id, data.user);
      if (p) {
        setProfile(p);
      }

      const resolvedRole = (p?.role || data.user.user_metadata?.role || 'student') as UserRole;
      return { error: null, isAdmin: resolvedRole === 'admin', targetRole: resolvedRole };
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

        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            user_id: data.user.id,
            email: cleanEmail,
            full_name: fullName,
            name: fullName,
            role: safeRole,
          });
        } catch {
          // ignore
        }

        setUser(data.user);
        setSession(data.session);
        const p = await fetchProfile(data.user.id, data.user);
        setProfile(p);
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
      localStorage.removeItem(LOCAL_SESSION_KEY);
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
        loginLocally,
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
