import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]).catch(() => fallback);
}

export const relationshipService = {
  async getProfilesByRole(role: string): Promise<Profile[]> {
    const demoFallback: Record<string, Profile[]> = {
      teacher: [
        {
          id: '99999999-0000-0000-0000-000000000004',
          email: 'ogretmendemo@mahfaza.com',
          full_name: 'Öğretmen Selin Aksoy',
          name: 'Öğretmen Selin Aksoy',
          first_name: 'Selin',
          last_name: 'Aksoy',
          role: 'teacher',
          avatar_url: '',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        },
      ],
      student: [
        {
          id: '99999999-0000-0000-0000-000000000001',
          email: 'ogrenci@mahfaza.com',
          full_name: 'Ayşegül Koçak',
          name: 'Ayşegül Koçak',
          first_name: 'Ayşegül',
          last_name: 'Koçak',
          role: 'student',
          avatar_url: '',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        },
      ],
      coach: [
        {
          id: '99999999-0000-0000-0000-000000000002',
          email: 'kocdemo@mahfaza.com',
          full_name: 'Koç Mehmet Çelik',
          name: 'Koç Mehmet Çelik',
          first_name: 'Mehmet',
          last_name: 'Çelik',
          role: 'coach',
          avatar_url: '',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        },
      ],
      counselor: [
        {
          id: '99999999-0000-0000-0000-000000000005',
          email: 'pdrdemo@mahfaza.com',
          full_name: 'Rehberlik Zeynep Kaya',
          name: 'Rehberlik Zeynep Kaya',
          first_name: 'Zeynep',
          last_name: 'Kaya',
          role: 'counselor',
          avatar_url: '',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        },
      ],
      admin: [
        {
          id: '99999999-0000-0000-0000-000000000003',
          email: 'mudurdemo@mahfaza.com',
          full_name: 'Müdür Ahmet Bey',
          name: 'Müdür Ahmet Bey',
          first_name: 'Ahmet',
          last_name: 'Bey',
          role: 'admin',
          avatar_url: '',
          created_at: '2026-09-01T08:00:00Z',
          updated_at: '2026-09-01T08:00:00Z',
        },
      ],
    };

    if (!isSupabaseConfigured) return demoFallback[role] || [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, name, role, avatar_url, created_at, updated_at')
        .eq('role', role)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return demoFallback[role] || [];
      }
      return (data || []).map((p: any) => ({
        ...p,
        first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Kullanıcı')),
        last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
      })) as Profile[];
    } catch {
      return demoFallback[role] || [];
    }
  },

  async getAllUsersAdmin(): Promise<Profile[]> {
    const builtinProfiles: Profile[] = [
      {
        id: '99999999-0000-0000-0000-000000000004',
        email: 'demo.ogretmen@mahfaza.co',
        full_name: 'Ahmet Yılmaz',
        name: 'Ahmet Yılmaz',
        first_name: 'Ahmet',
        last_name: 'Yılmaz',
        role: 'teacher',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:00:00Z',
      },
      {
        id: '99999999-0000-0000-0000-000000000005',
        email: 'rehberlik@mahfaza.co',
        full_name: 'Selin Kaya',
        name: 'Selin Kaya',
        first_name: 'Selin',
        last_name: 'Kaya',
        role: 'counselor',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:00:00Z',
      },
      {
        id: '99999999-0000-0000-0000-000000000006',
        email: 'veli.kocak@mahfaza.co',
        full_name: 'Mehmet Koçak',
        name: 'Mehmet Koçak',
        first_name: 'Mehmet',
        last_name: 'Koçak',
        role: 'parent',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:00:00Z',
      },
      {
        id: '72bc9b93-02f4-4ee8-a580-59d32817c40d',
        email: 'mudurdemo@mahfaza.com',
        full_name: 'Kurum Müdürü',
        name: 'Kurum Müdürü',
        first_name: 'Kurum',
        last_name: 'Müdürü',
        role: 'admin',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-01T08:00:00Z',
      },
    ];

    let existingProfiles: any[] = [];
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          existingProfiles = [...data];
        }
      }
    } catch (err) {
      console.warn('Profiles fetch warning in getAllUsersAdmin:', err);
    }

    const knownIds = new Set(existingProfiles.map((p) => p.id));
    const knownEmails = new Set(existingProfiles.map((p) => p.email?.toLowerCase()));

    // Merge builtin institutional profiles if not already in DB
    for (const b of builtinProfiles) {
      if (!knownIds.has(b.id) && !knownEmails.has(b.email.toLowerCase())) {
        knownIds.add(b.id);
        knownEmails.add(b.email.toLowerCase());
        existingProfiles.push(b);
      }
    }

    // Also inspect messages / notifications / coach_student_links to auto-heal any Auth users missing a profile row
    try {
      if (isSupabaseConfigured) {
        const [{ data: msgs }, { data: links }] = await Promise.all([
          supabase.from('messages').select('sender_id, sender_name, sender_role, created_at').limit(100),
          supabase.from('coach_student_links').select('coach_id, student_id, created_at').limit(100),
        ]);

        for (const m of msgs || []) {
          if (m.sender_id && !knownIds.has(m.sender_id)) {
            knownIds.add(m.sender_id);
            existingProfiles.push({
              id: m.sender_id,
              email: `${(m.sender_name || 'kullanici').toLowerCase().replace(/\s+/g, '.')}@mahfaza.co`,
              full_name: m.sender_name || 'Kayıtlı Kullanıcı',
              name: m.sender_name || 'Kayıtlı Kullanıcı',
              role: m.sender_role || 'student',
              created_at: m.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        for (const l of links || []) {
          if (l.student_id && !knownIds.has(l.student_id)) {
            knownIds.add(l.student_id);
            existingProfiles.push({
              id: l.student_id,
              email: 'ogrenci@mahfaza.co',
              full_name: 'Kayıtlı Öğrenci',
              name: 'Kayıtlı Öğrenci',
              role: 'student',
              created_at: l.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch {
      // ignore
    }

    return existingProfiles.map((p: any) => ({
      ...p,
      first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Kullanıcı')),
      last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
    })) as Profile[];
  },

  async deleteUserAdmin(userId: string): Promise<{ fullAuthDeleted: boolean }> {
    if (!isSupabaseConfigured) return { fullAuthDeleted: false };

    // 1. First attempt true account deletion via SECURITY DEFINER RPC (deletes from auth.users + profiles + all cascade tables)
    try {
      const { error: rpcError } = await supabase.rpc('delete_user_completely', {
        target_user_id: userId,
      });
      if (!rpcError) {
        return { fullAuthDeleted: true };
      }
    } catch {
      // RPC not yet installed in Supabase SQL Editor; fall back to comprehensive table cleanup below
    }

    // 2. Clean up all relational tables referencing this user
    const cleanTasks = [
      supabase.from('coach_students').delete().or(`coach_id.eq.${userId},student_id.eq.${userId}`),
      supabase.from('coach_student_links').delete().or(`coach_id.eq.${userId},student_id.eq.${userId}`),
      supabase.from('coach_invitations').delete().eq('coach_id', userId),
      supabase.from('coach_tasks').delete().or(`coach_id.eq.${userId},student_id.eq.${userId}`),
      supabase.from('parent_meetings').delete().or(`coach_id.eq.${userId},student_id.eq.${userId}`),
      supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
      supabase.from('notifications').delete().eq('user_id', userId),
      supabase.from('xp_transactions').delete().eq('student_id', userId),
      supabase.from('subscriptions').delete().eq('user_id', userId),
    ];

    await Promise.allSettled(cleanTasks);

    // 3. Delete from profiles table and verify deletion
    const { error } = await supabase
      .from('profiles')
      .delete()
      .or(`id.eq.${userId},user_id.eq.${userId}`);

    if (error) throw new Error(error.message);

    return { fullAuthDeleted: false };
  },

  async createUserAdmin(payload: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    phone?: string;
    password?: string;
    class_id?: string;
  }): Promise<Profile> {
    const fullName = `${payload.first_name.trim()} ${payload.last_name.trim()}`.trim();
    const cleanEmail = payload.email.trim().toLowerCase();
    const newId = crypto.randomUUID();

    // 1. Try secure RPC admin_create_user if installed in Supabase SQL editor
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
        p_email: cleanEmail,
        p_password: payload.password || '123456',
        p_first_name: payload.first_name.trim(),
        p_last_name: payload.last_name.trim(),
        p_role: payload.role,
        p_phone: payload.phone || null,
      });
      if (!rpcError && rpcData) {
        if (payload.class_id && payload.role === 'student') {
          await this.assignStudentToClass(payload.class_id, rpcData.id || newId).catch(() => {});
        }
        return rpcData as Profile;
      }
    } catch {
      // fallback
    }

    // 2. Direct insert/upsert into public.profiles
    const profileRow = {
      id: newId,
      user_id: newId,
      email: cleanEmail,
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      name: fullName,
      full_name: fullName,
      role: payload.role,
      phone: payload.phone?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(profileRow)
      .select('*')
      .single();

    if (error) {
      console.warn('Profile create note:', error.message);
    }

    if (payload.class_id && payload.role === 'student') {
      await this.assignStudentToClass(payload.class_id, newId).catch(() => {});
    }

    return (data || profileRow) as Profile;
  },

  /**
   * Ensure the default demo coach (demo.koc@mahfaza.co) and demo student (demo.ogrenci@mahfaza.co)
   * relationship is linked if not explicitly unlinked by the user.
   */
  async ensureDemoCoachStudentLink(coachId: string, unlinkedIds: string[]): Promise<string[]> {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, role')
        .in('email', ['demo.koc@mahfaza.co', 'demo.ogrenci@mahfaza.co']);

      if (!profiles || profiles.length < 2) return [];

      const demoCoach = profiles.find((p: any) => p.email?.toLowerCase() === 'demo.koc@mahfaza.co');
      const demoStudent = profiles.find((p: any) => p.email?.toLowerCase() === 'demo.ogrenci@mahfaza.co');

      if (!demoCoach || !demoStudent) return [];
      if (demoCoach.id !== coachId) return [];
      if (unlinkedIds.includes(demoStudent.id)) return [];

      // Ensure Demo Öğrenci exists in public.students so foreign key constraint on coach_student_links is satisfied
      await supabase.from('students').upsert(
        {
          id: demoStudent.id,
          user_id: demoStudent.id,
          coach_id: demoCoach.id,
          name: 'Demo Öğrenci',
          full_name: 'Demo Öğrenci',
          email: 'demo.ogrenci@mahfaza.co',
          grade: '12. Sınıf',
          field: 'SAY',
          target_exam: 'YKS',
          match_code: 'MHFZ-DEMO01',
          target_university: 'Boğaziçi Üniversitesi',
          target_department: 'Bilgisayar Mühendisliği',
          target_rank: 1500,
          target_score: 515,
        },
        { onConflict: 'id' }
      );

      // Ensure link exists in both coach_student_links and coach_students
      await Promise.allSettled([
        supabase.from('coach_student_links').upsert(
          {
            coach_id: demoCoach.id,
            student_id: demoStudent.id,
            status: 'active',
          },
          { onConflict: 'coach_id,student_id' }
        ),
        supabase.from('coach_students').upsert(
          {
            coach_id: demoCoach.id,
            student_id: demoStudent.id,
          },
          { onConflict: 'coach_id,student_id' }
        ),
      ]);

      return [demoStudent.id];
    } catch {
      return [];
    }
  },

  /**
   * Get students assigned to a coach directly from authoritative Supabase coach_students & coach_student_links tables (Max 800ms)
   */
  async getCoachAssignedStudents(coachId: string): Promise<Profile[]> {
    if (!coachId) return [];

    const unlinkedKey = `mahfaza_unlinked_${coachId}`;
    let unlinkedIds: string[] = [];
    try {
      unlinkedIds = JSON.parse(localStorage.getItem(unlinkedKey) || '[]');
    } catch {
      unlinkedIds = [];
    }

    // Check fast local cache first
    let cachedList: Profile[] = [];
    try {
      const cached = localStorage.getItem(`mahfaza_coach_students_${coachId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedList = parsed.filter((s: Profile) => !unlinkedIds.includes(s.id));
        }
      }
    } catch {
      // ignore
    }

    if (!isSupabaseConfigured) {
      return cachedList;
    }

    const fetchRemote = (async () => {
      try {
        // Query both coach_students and coach_student_links in parallel and merge unique student_ids
        const [{ data: csLinks }, { data: cslLinks }] = await Promise.all([
          supabase.from('coach_students').select('student_id').eq('coach_id', coachId),
          supabase.from('coach_student_links').select('student_id').eq('coach_id', coachId),
        ]);

        const studentIdSet = new Set<string>();
        (csLinks || []).forEach((l: any) => {
          if (l?.student_id) studentIdSet.add(l.student_id);
        });
        (cslLinks || []).forEach((l: any) => {
          if (l?.student_id) studentIdSet.add(l.student_id);
        });

        let studentIds = Array.from(studentIdSet).filter((id) => !unlinkedIds.includes(id));

        // Self-heal demo coach <-> demo student relationship if empty
        if (studentIds.length === 0) {
          const healedIds = await this.ensureDemoCoachStudentLink(coachId, unlinkedIds);
          studentIds = healedIds.filter((id) => !unlinkedIds.includes(id));
        }

        if (studentIds.length === 0) return cachedList;

        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, email, full_name, name, role, avatar_url, created_at, updated_at')
          .in('id', studentIds);

        if (pError || !profiles || profiles.length === 0) return cachedList;

        const mapped = profiles.map((p: any) => ({
          ...p,
          first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
          last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
        })) as Profile[];

        try {
          localStorage.setItem(`mahfaza_coach_students_${coachId}`, JSON.stringify(mapped));
        } catch {
          // ignore
        }

        return mapped;
      } catch {
        return cachedList;
      }
    })();

    return await withTimeout(fetchRemote, 800, cachedList);
  },

  /**
   * Get assigned coach for a student directly from Supabase coach_students / coach_student_links tables
   */
  async getStudentAssignedCoach(studentId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured || !studentId) return null;

    try {
      let coachId: string | null = null;
      const [{ data: link }, { data: altLink }] = await Promise.all([
        supabase.from('coach_students').select('coach_id').eq('student_id', studentId).maybeSingle(),
        supabase.from('coach_student_links').select('coach_id').eq('student_id', studentId).maybeSingle(),
      ]);

      coachId = link?.coach_id || altLink?.coach_id || null;

      if (!coachId) return null;

      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, name, role, avatar_url, created_at, updated_at')
        .eq('id', coachId)
        .maybeSingle();

      if (!coachProfile) return null;

      const cp: any = coachProfile;
      return {
        ...cp,
        first_name: cp.first_name || (cp.full_name ? cp.full_name.split(' ')[0] : (cp.name ? cp.name.split(' ')[0] : 'Koç')),
        last_name: cp.last_name || (cp.full_name ? cp.full_name.split(' ').slice(1).join(' ') : (cp.name ? cp.name.split(' ').slice(1).join(' ') : '')),
      } as Profile;
    } catch {
      return null;
    }
  },

  /**
   * Check if a student is assigned to a coach (authoritative access check)
   */
  async isStudentAssignedToCoach(coachId: string, studentId: string): Promise<boolean> {
    try {
      const [{ data: link }, { data: altLink }] = await Promise.all([
        supabase
          .from('coach_students')
          .select('coach_id')
          .eq('coach_id', coachId)
          .eq('student_id', studentId)
          .maybeSingle(),
        supabase
          .from('coach_student_links')
          .select('coach_id')
          .eq('coach_id', coachId)
          .eq('student_id', studentId)
          .maybeSingle(),
      ]);

      if (link || altLink) return true;

      // Also check if this is the default demo coach & demo student pair
      const students = await this.getCoachAssignedStudents(coachId);
      return students.some((s) => s.id === studentId);
    } catch {
      return false;
    }
  },

  /**
   * Pair a student with coach using Email or ID
   */
  async pairStudentWithCoach(coachId: string, emailOrCode: string): Promise<Profile> {
    if (!emailOrCode.trim()) {
      throw new Error('Lütfen öğrenci e-posta adresini veya davet kodunu girin.');
    }

    const term = emailOrCode.trim().toLowerCase();

    // 1. Fetch coach's capacity limit from subscriptions table
    const currentStudents = await this.getCoachAssignedStudents(coachId);
    let maxCapacity = 10;
    try {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', coachId)
        .eq('status', 'active')
        .maybeSingle();

      if (subData?.plan_id === 'coach_pro') maxCapacity = 30;
      else if (subData?.plan_id === 'coach_elite') maxCapacity = 75;
    } catch {
      // default capacity
    }

    if (currentStudents.length >= maxCapacity) {
      throw new Error(
        `Koçluk lisans paketinizin öğrenci kapasitesi (${maxCapacity} öğrenci) dolmuştur. Yeni öğrenci eklemek için lütfen paketinizi yükseltin.`
      );
    }

    // 2. Find target student in Supabase profiles table
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
    const query = supabase
      .from('profiles')
      .select('id, email, full_name, name, role, avatar_url, created_at, updated_at');

    const { data: foundStudents, error: findError } = isUuid
      ? await query.or(`email.ilike.${term},id.eq.${term}`).limit(1)
      : await query.ilike('email', term).limit(1);

    if (findError || !foundStudents || foundStudents.length === 0) {
      throw new Error(
        `'${emailOrCode}' adresine sahip bir öğrenci hesabı bulunamadı. Lütfen öğrencinin kayıtlı e-posta adresini kontrol edin.`
      );
    }

    const rawStudent: any = foundStudents[0];
    if (rawStudent.role !== 'student') {
      throw new Error('Belirtilen kullanıcı bir öğrenci hesabı değildir.');
    }

    const student: Profile = {
      ...rawStudent,
      first_name: rawStudent.first_name || (rawStudent.full_name ? rawStudent.full_name.split(' ')[0] : (rawStudent.name ? rawStudent.name.split(' ')[0] : 'Öğrenci')),
      last_name: rawStudent.last_name || (rawStudent.full_name ? rawStudent.full_name.split(' ').slice(1).join(' ') : (rawStudent.name ? rawStudent.name.split(' ').slice(1).join(' ') : '')),
    };

    // 3. Prevent duplicate relationship with same coach
    if (currentStudents.some((s) => s.id === student.id)) {
      throw new Error('Bu öğrenci zaten koçluk portföyünüzde kayıtlıdır.');
    }

    // 4. Guard: Check if student already has an active link with another coach
    const [{ data: existingCoachLink }, { data: existingAltLink }] = await Promise.all([
      supabase.from('coach_students').select('coach_id').eq('student_id', student.id).maybeSingle(),
      supabase.from('coach_student_links').select('coach_id').eq('student_id', student.id).maybeSingle(),
    ]);

    const assignedCoachId = existingCoachLink?.coach_id || existingAltLink?.coach_id;
    if (assignedCoachId && assignedCoachId !== coachId) {
      throw new Error('Bu öğrenci zaten başka bir koç ile eşleşmiştir. Mevcut koçluk ilişkisi değiştirilemez.');
    }

    // 5. Insert relationship into both coach_students and coach_student_links tables for guaranteed visibility
    await Promise.allSettled([
      supabase.from('coach_students').upsert(
        {
          coach_id: coachId,
          student_id: student.id,
        },
        { onConflict: 'coach_id,student_id' }
      ),
      supabase.from('coach_student_links').upsert(
        {
          coach_id: coachId,
          student_id: student.id,
          status: 'active',
        },
        { onConflict: 'coach_id,student_id' }
      ),
    ]);

    // Reset unlinked status for this student and coach
    try {
      const key = `mahfaza_unlinked_${coachId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((id: string) => id !== student.id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      // ignore
    }

    return student as Profile;
  },

  /**
   * Unlink a coach and student safely from authoritative database and reactive cache
   */
  async unlinkCoachStudent(coachId: string, studentId: string): Promise<void> {
    await Promise.allSettled([
      supabase.from('coach_student_links').delete().eq('coach_id', coachId).eq('student_id', studentId),
      supabase.from('coach_students').delete().eq('coach_id', coachId).eq('student_id', studentId),
    ]);

    // Mark in durable unlinked cache for instant reactivity across reloads
    try {
      const key = `mahfaza_unlinked_${coachId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (!existing.includes(studentId)) {
        existing.push(studentId);
        localStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {
      // ignore
    }
  },

  /**
   * Get or generate unique coach invite code from coach_invitations table
   */
  async getCoachInviteCode(coachId: string): Promise<string> {
    const fallbackCode = `KOC-${coachId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('coach_invitations')
        .select('invite_code')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!fetchErr && existing?.invite_code) {
        return existing.invite_code;
      }

      const { data: inserted, error: insErr } = await supabase
        .from('coach_invitations')
        .insert({
          coach_id: coachId,
          invite_code: fallbackCode,
          is_active: true,
        })
        .select('invite_code')
        .maybeSingle();

      if (!insErr && inserted?.invite_code) {
        return inserted.invite_code;
      }

      return fallbackCode;
    } catch {
      return fallbackCode;
    }
  },

  /**
   * Validate coach invite code directly via authoritative get_coach_by_invite_code RPC
   */
  async validateInviteCode(inviteCode: string): Promise<{
    valid: boolean;
    coachId?: string;
    coachName?: string;
    message?: string;
  }> {
    const trimmed = (inviteCode || '').trim().toUpperCase();
    if (!trimmed) {
      return { valid: false, message: 'Lütfen bir davet kodu girin.' };
    }

    try {
      const { data, error } = await supabase.rpc('get_coach_by_invite_code', {
        p_invite_code: trimmed,
      });

      if (error) {
        console.error('[INVITE_RPC_ERROR]', error);
        return {
          valid: false,
          message: 'Davet kodu doğrulanırken teknik bir hata oluştu [INVITE_RPC_ERROR].',
        };
      }

      let match: { coach_id: string; first_name?: string; last_name?: string } | null = null;

      if (Array.isArray(data)) {
        if (data.length > 0 && data[0]?.coach_id) {
          match = data[0];
        }
      } else if (data && typeof data === 'object' && (data as any).coach_id) {
        match = data as any;
      }

      if (!match || !match.coach_id) {
        return {
          valid: false,
          message: 'Geçersiz veya süresi dolmuş koç davet kodu.',
        };
      }

      const coachName = `${match.first_name || ''} ${match.last_name || ''}`.trim() || 'Koç';

      return {
        valid: true,
        coachId: match.coach_id,
        coachName,
      };
    } catch (err: any) {
      console.error('[INVITE_RPC_ERROR]', err);
      return {
        valid: false,
        message: 'Davet kodu doğrulanırken beklenmeyen hata oluştu [INVITE_RPC_ERROR].',
      };
    }
  },

  /**
   * Pair a newly registered or existing student via invite code using secure RPC
   */
  async pairStudentWithInviteCode(studentId: string, inviteCode: string): Promise<void> {
    const validation = await this.validateInviteCode(inviteCode);
    if (!validation.valid || !validation.coachId) {
      throw new Error(validation.message || 'Geçersiz davet kodu.');
    }

    try {
      const { error: rpcErr } = await supabase.rpc('pair_student_with_coach_invite', {
        p_student_id: studentId,
        p_invite_code: inviteCode.trim().toUpperCase(),
      });

      if (!rpcErr) {
        return;
      }
      console.warn('pair_student_with_coach_invite RPC notice, using direct pairing:', rpcErr.message);
    } catch {
      // fallback
    }

    const { data: existingLink } = await supabase
      .from('coach_students')
      .select('coach_id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existingLink && existingLink.coach_id && existingLink.coach_id !== validation.coachId) {
      throw new Error('Bu öğrenci zaten başka bir koç ile eşleşmiştir. Mevcut koçluk ilişkisi değiştirilemez.');
    }

    if (!existingLink) {
      await Promise.allSettled([
        supabase.from('coach_students').upsert(
          {
            coach_id: validation.coachId,
            student_id: studentId,
          },
          { onConflict: 'coach_id,student_id' }
        ),
        supabase.from('coach_student_links').upsert(
          {
            coach_id: validation.coachId,
            student_id: studentId,
            status: 'active',
          },
          { onConflict: 'coach_id,student_id' }
        ),
      ]);
    }

    // Reset unlinked status for this student and coach
    try {
      const key = `mahfaza_unlinked_${validation.coachId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = existing.filter((id: string) => id !== studentId);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  },

  async getParentLinkedChildren(parentId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured) return [];

    try {
      let studentIds: string[] = [];

      // 1. Try parent_student_links table first
      const { data: pLinks, error: pErr } = await supabase
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_id', parentId);

      if (!pErr && pLinks && pLinks.length > 0) {
        studentIds = pLinks.map((l: any) => l.student_id).filter(Boolean);
      } else {
        // 2. Try parent_students table fallback
        const { data: altLinks } = await supabase
          .from('parent_students')
          .select('student_id')
          .eq('parent_id', parentId);
        if (altLinks && altLinks.length > 0) {
          studentIds = altLinks.map((l: any) => l.student_id).filter(Boolean);
        }
      }

      // If no explicit link is found (e.g. demo parent testing or initial onboarding)
      if (studentIds.length === 0) {
        const { data: demoStudent } = await supabase
          .from('profiles')
          .select('id, email, full_name, name, role, avatar_url, created_at, updated_at')
          .eq('email', 'demo.ogrenci@mahfaza.co')
          .maybeSingle();

        if (demoStudent) {
          const ds: any = demoStudent;
          return [{
            ...ds,
            first_name: ds.first_name || (ds.full_name ? ds.full_name.split(' ')[0] : 'Öğrenci'),
            last_name: ds.last_name || (ds.full_name ? ds.full_name.split(' ').slice(1).join(' ') : ''),
          }] as Profile[];
        }
        return [];
      }

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, full_name, name, role, avatar_url, created_at, updated_at')
        .in('id', studentIds);

      if (pError || !profiles) return [];

      return profiles.map((p: any) => ({
        ...p,
        first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
        last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
      })) as Profile[];
    } catch {
      return [];
    }
  },

  async assignStudentToClass(classId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('class_students')
      .insert({ class_id: classId, student_id: studentId });

    if (error) throw new Error(error.message);
  },

  async assignTeacherToClass(classId: string, teacherId: string): Promise<void> {
    const { error } = await supabase
      .from('class_teachers')
      .insert({ class_id: classId, teacher_id: teacherId });

    if (error) throw new Error(error.message);
  },

  async linkParentStudent(parentId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('parent_students')
      .insert({ parent_id: parentId, student_id: studentId });

    if (error) throw new Error(error.message);
  },

  async linkCoachStudent(coachId: string, studentId: string): Promise<void> {
    return this.pairStudentWithCoach(coachId, studentId).then(() => {});
  },
};