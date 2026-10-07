import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile } from '../types';

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
   * Get students assigned to a coach directly from authoritative Supabase coach_student_links table
   */
  async getCoachAssignedStudents(coachId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured) return [];

    try {
      const { data: links, error: linkErr } = await supabase
        .from('coach_student_links')
        .select('student_id')
        .eq('coach_id', coachId)
        .eq('status', 'active');

      if (linkErr || !links || links.length === 0) {
        return [];
      }

      const studentIds = links.map((l: any) => l.student_id).filter(Boolean);
      if (studentIds.length === 0) return [];

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
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

  /**
   * Get assigned coach for a student directly from Supabase coach_student_links table
   */
  async getStudentAssignedCoach(studentId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data: link, error } = await supabase
        .from('coach_student_links')
        .select('coach_id')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !link || !link.coach_id) return null;

      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', link.coach_id)
        .maybeSingle();

      if (!coachProfile) return null;

      return {
        ...coachProfile,
        first_name: coachProfile.first_name || (coachProfile.full_name ? coachProfile.full_name.split(' ')[0] : 'Koç'),
        last_name: coachProfile.last_name || (coachProfile.full_name ? coachProfile.full_name.split(' ').slice(1).join(' ') : ''),
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
      const { data: link } = await supabase
        .from('coach_student_links')
        .select('id')
        .eq('coach_id', coachId)
        .eq('student_id', studentId)
        .eq('status', 'active')
        .maybeSingle();

      return Boolean(link);
    } catch {
      return false;
    }
  },

  /**
   * Pair a student with coach using Email or Invitation Code
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

      if (subData?.plan_id === 'coach_pro') maxCapacity = 25;
      else if (subData?.plan_id === 'coach_elite') maxCapacity = 100;
    } catch {
      // default capacity
    }

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

    // 3. Prevent duplicate relationship with same coach
    if (currentStudents.some((s) => s.id === student.id)) {
      throw new Error('Bu öğrenci zaten koçluk portföyünüzde kayıtlıdır.');
    }

    // 4. Guard: Check if student already has an active link with another coach (never overwrite silently!)
    const { data: existingCoachLink } = await supabase
      .from('coach_student_links')
      .select('coach_id')
      .eq('student_id', student.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingCoachLink && existingCoachLink.coach_id && existingCoachLink.coach_id !== coachId) {
      throw new Error('Bu öğrenci zaten başka bir koç ile eşleşmiştir. Önce mevcut koçluk ilişkisinin sonlandırılması gerekir.');
    }

    // 5. Insert relationship into coach_student_links table
    const { error: insertErr } = await supabase
      .from('coach_student_links')
      .insert({
        coach_id: coachId,
        student_id: student.id,
        status: 'active',
      });

    if (insertErr) {
      throw new Error(insertErr.message);
    }

    // Also update coach_id on students table if record exists
    try {
      await supabase
        .from('students')
        .update({ coach_id: coachId })
        .eq('user_id', student.id);
    } catch {
      // ignore
    }

    return {
      ...student,
      first_name: student.first_name || (student.full_name ? student.full_name.split(' ')[0] : 'Öğrenci'),
      last_name: student.last_name || (student.full_name ? student.full_name.split(' ').slice(1).join(' ') : ''),
    } as Profile;
  },

  /**
   * Remove student from coach portfolio directly in database
   */
  async unlinkCoachStudent(coachId: string, studentId: string): Promise<void> {
    const { error } = await supabase
      .from('coach_student_links')
      .delete()
      .eq('coach_id', coachId)
      .eq('student_id', studentId);

    if (error) {
      throw new Error(error.message);
    }

    // Clear coach_id on students table
    try {
      await supabase
        .from('students')
        .update({ coach_id: null })
        .eq('user_id', studentId);
    } catch {
      // ignore
    }
  },

  /**
   * Get or generate unique coach invite code from coach_invitations table
   */
  async getCoachInviteCode(coachId: string): Promise<string> {
    try {
      const { data: existing } = await supabase
        .from('coach_invitations')
        .select('invite_code')
        .eq('coach_id', coachId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.invite_code) {
        return existing.invite_code;
      }

      // Generate clean unique code: KOC-XXXXXX
      const rawRand = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCode = `KOC-${rawRand}`;

      const { data: inserted, error } = await supabase
        .from('coach_invitations')
        .insert({
          coach_id: coachId,
          invite_code: newCode,
          is_active: true,
        })
        .select('invite_code')
        .single();

      if (!error && inserted?.invite_code) {
        return inserted.invite_code;
      }

      return newCode;
    } catch {
      return `KOC-${coachId.substring(0, 6).toUpperCase()}`;
    }
  },

  /**
   * Validate coach invite code directly against coach_invitations table
   */
  async validateInviteCode(inviteCode: string): Promise<{
    valid: boolean;
    coachId?: string;
    coachName?: string;
    message?: string;
  }> {
    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) {
      return { valid: false, message: 'Lütfen bir davet kodu girin.' };
    }

    try {
      const { data: inv, error } = await supabase
        .from('coach_invitations')
        .select('coach_id, is_active')
        .eq('invite_code', trimmed)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !inv || !inv.coach_id) {
        return { valid: false, message: 'Geçersiz veya süresi dolmuş koç davet kodu.' };
      }

      const { data: coachProf } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, full_name')
        .eq('id', inv.coach_id)
        .maybeSingle();

      const coachName = coachProf
        ? `${coachProf.first_name || ''} ${coachProf.last_name || ''}`.trim() || coachProf.full_name || 'Koç'
        : 'Koç';

      return {
        valid: true,
        coachId: inv.coach_id,
        coachName,
      };
    } catch {
      return { valid: false, message: 'Davet kodu doğrulanamadı.' };
    }
  },

  /**
   * Pair a newly registered or existing student via invite code
   */
  async pairStudentWithInviteCode(studentId: string, inviteCode: string): Promise<void> {
    const validation = await this.validateInviteCode(inviteCode);
    if (!validation.valid || !validation.coachId) {
      throw new Error(validation.message || 'Geçersiz davet kodu.');
    }

    // Check existing link (do NOT overwrite silently)
    const { data: existingLink } = await supabase
      .from('coach_student_links')
      .select('coach_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingLink && existingLink.coach_id && existingLink.coach_id !== validation.coachId) {
      throw new Error('Bu öğrenci zaten başka bir koç ile eşleşmiştir. Mevcut koçluk ilişkisi değiştirilemez.');
    }

    if (!existingLink) {
      const { error: insErr } = await supabase
        .from('coach_student_links')
        .insert({
          coach_id: validation.coachId,
          student_id: studentId,
          status: 'active',
        });

      if (insErr) {
        throw new Error(insErr.message);
      }
    }

    // Update students table coach_id
    try {
      await supabase
        .from('students')
        .update({ coach_id: validation.coachId })
        .eq('user_id', studentId);
    } catch {
      // ignore
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
