import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

// In-memory / persistent pairing cache to handle database pairing gracefully
const LOCAL_PAIRINGS_KEY = 'mahfaza_coach_student_pairings';

function getStoredPairings(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LOCAL_PAIRINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredPairings(pairings: Record<string, string[]>) {
  try {
    localStorage.setItem(LOCAL_PAIRINGS_KEY, JSON.stringify(pairings));
  } catch {
    // ignore
  }
}

// Ensure demo coach is paired with demo student
const DEMO_COACH_ID = '1672a9db-3296-4583-b226-11ac5d1eb5cf';
const DEMO_STUDENT_ID = '06cf9897-7ef1-440f-9a1d-4703d4d66816';

export const relationshipService = {
  async getProfilesByRole(role: string): Promise<Profile[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      ...p,
      first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
      last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
    })) as Profile[];
  },

  async getAllUsersAdmin(): Promise<Profile[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((p: any) => ({
      ...p,
      first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name || 'Kullanıcı')),
      last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : ''),
    })) as Profile[];
  },

  /**
   * Get students assigned to a coach with full profile resolution and demo pairing
   */
  async getCoachAssignedStudents(coachId: string): Promise<Profile[]> {
    let studentIds: string[] = [];

    // 1. Try remote database table coach_students
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('coach_students')
          .select('student_id')
          .eq('coach_id', coachId);

        if (!error && data) {
          studentIds = data.map((d: any) => d.student_id);
        }
      } catch {
        // Table may be in migration process
      }
    }

    // 2. Include stored local pairings
    const stored = getStoredPairings();
    if (stored[coachId]) {
      studentIds = Array.from(new Set([...studentIds, ...stored[coachId]]));
    }

    // 3. For Demo Coach (demo.koc@mahfaza.co or DEMO_COACH_ID), ensure Demo Student is linked in database and included
    if (isSupabaseConfigured) {
      try {
        let isDemoCoach = coachId === DEMO_COACH_ID;
        if (!isDemoCoach) {
          const { data: coachProf } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', coachId)
            .maybeSingle();
          if (coachProf?.email === 'demo.koc@mahfaza.co') {
            isDemoCoach = true;
          }
        }

        if (isDemoCoach) {
          const { data: studentProf } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', 'demo.ogrenci@mahfaza.co')
            .maybeSingle();

          const realDemoStudentId = studentProf?.id || DEMO_STUDENT_ID;
          if (!studentIds.includes(realDemoStudentId)) {
            studentIds.push(realDemoStudentId);
          }

          // Ensure real database relationship row exists in coach_students table
          await supabase
            .from('coach_students')
            .upsert({ coach_id: coachId, student_id: realDemoStudentId }, { onConflict: 'coach_id,student_id' });
        }
      } catch {
        if (coachId === DEMO_COACH_ID && !studentIds.includes(DEMO_STUDENT_ID)) {
          studentIds.push(DEMO_STUDENT_ID);
        }
      }
    } else {
      if (coachId === DEMO_COACH_ID && !studentIds.includes(DEMO_STUDENT_ID)) {
        studentIds.push(DEMO_STUDENT_ID);
      }
    }

    if (studentIds.length === 0) {
      return [];
    }

    // 4. Fetch real profiles for all studentIds from Supabase profiles table
    if (isSupabaseConfigured) {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      if (!pError && profiles && profiles.length > 0) {
        return profiles.map((p: any) => ({
          ...p,
          first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
          last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
        })) as Profile[];
      }
    }

    return studentIds.map((id) => ({
      id,
      email: id === DEMO_STUDENT_ID ? 'demo.ogrenci@mahfaza.co' : `student-${id.substring(0, 6)}@mahfaza.co`,
      first_name: id === DEMO_STUDENT_ID ? 'Demo' : 'Öğrenci',
      last_name: id === DEMO_STUDENT_ID ? 'Öğrenci' : id.substring(0, 4),
      role: 'student' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  },

  /**
   * Check if a student is assigned to a coach (authoritative access check for Student 360)
   */
  async isStudentAssignedToCoach(coachId: string, studentId: string): Promise<boolean> {
    const students = await this.getCoachAssignedStudents(coachId);
    return students.some((s) => s.id === studentId);
  },

  /**
   * Pair a student with coach using Email or Invitation Code
   */
  async pairStudentWithCoach(coachId: string, emailOrCode: string): Promise<Profile> {
    if (!emailOrCode.trim()) {
      throw new Error('Lütfen öğrenci e-posta adresini veya davet kodunu girin.');
    }

    const term = emailOrCode.trim().toLowerCase();

    // 1. Fetch coach's capacity limit
    const currentStudents = await this.getCoachAssignedStudents(coachId);
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status, plan:subscription_plans(student_capacity)')
      .eq('user_id', coachId)
      .eq('status', 'active')
      .maybeSingle();

    const maxCapacity = (subData?.plan as any)?.student_capacity || 10;
    if (currentStudents.length >= maxCapacity) {
      throw new Error(
        `Koçluk lisans paketinizin öğrenci kapasitesi (${maxCapacity} öğrenci) dolmuştur. Yeni öğrenci eklemek için lütfen paketinizi yükseltin.`
      );
    }

    // 2. Find target student in Supabase profiles table
    const { data: foundStudents, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.${term},id.eq.${term}`)
      .limit(1);

    if (findError || !foundStudents || foundStudents.length === 0) {
      throw new Error(
        `'${emailOrCode}' adresine sahip bir öğrenci hesabı bulunamadı. Lütfen öğrencinin kayıtlı e-posta adresini kontrol edin.`
      );
    }

    const student = foundStudents[0];
    if (student.role !== 'student') {
      throw new Error('Belirtilen kullanıcı bir öğrenci hesabı değildir.');
    }

    // 3. Prevent duplicate relationship
    if (currentStudents.some((s) => s.id === student.id)) {
      throw new Error('Bu öğrenci zaten koçluk portföyünüzde kayıtlıdır.');
    }

    // 4. Try remote insert into coach_students
    try {
      await supabase.from('coach_students').insert({
        coach_id: coachId,
        student_id: student.id,
      });
    } catch {
      // ignore if migration not executed
    }

    // 5. Persist pairing in stored pairings
    const stored = getStoredPairings();
    const existing = stored[coachId] || [];
    if (!existing.includes(student.id)) {
      existing.push(student.id);
      stored[coachId] = existing;
      saveStoredPairings(stored);
    }

    return {
      ...student,
      first_name: student.first_name || (student.full_name ? student.full_name.split(' ')[0] : 'Öğrenci'),
      last_name: student.last_name || (student.full_name ? student.full_name.split(' ').slice(1).join(' ') : ''),
    } as Profile;
  },

  /**
   * Remove student from coach portfolio
   */
  async unlinkCoachStudent(coachId: string, studentId: string): Promise<void> {
    try {
      await supabase
        .from('coach_students')
        .delete()
        .eq('coach_id', coachId)
        .eq('student_id', studentId);
    } catch {
      // ignore
    }

    const stored = getStoredPairings();
    if (stored[coachId]) {
      stored[coachId] = stored[coachId].filter((id) => id !== studentId);
      saveStoredPairings(stored);
    }
  },

  async getParentLinkedChildren(parentId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('parent_students')
      .select(`
        student_id, created_at,
        profiles:student_id(id, email, first_name, last_name, role, avatar_url, created_at, updated_at)
      `)
      .eq('parent_id', parentId);

    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => row.profiles);
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
