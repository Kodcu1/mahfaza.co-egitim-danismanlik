import { supabase } from '../lib/supabase';
import { CoachParentMeeting } from '../types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function mapRowToMeeting(m: any): CoachParentMeeting {
  return {
    id: m.id,
    coach_id: m.coach_id,
    student_id: m.student_id,
    parent_id: m.parent_id || null,
    title: m.title || `Veli Görüşmesi - ${m.student_name || 'Öğrenci'}`,
    meeting_date: m.meeting_date,
    meeting_time: m.meeting_time || null,
    meeting_type: m.meeting_type || 'online',
    student_name: m.student_name || (m.profiles ? (m.profiles.full_name || m.profiles.name || `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim()) : null),
    parent_name: m.parent_name || null,
    parent_phone: m.parent_phone || null,
    person_contacted: m.person_contacted || null,
    teacher_opinions: m.teacher_opinions || null,
    academic_evaluation: m.academic_evaluation || null,
    raw_notes: m.raw_notes || null,
    refined_notes: m.refined_notes || null,
    psychological_status: m.psychological_status || null,
    coach_recommendations: m.coach_recommendations || null,
    action_plan: m.action_plan || null,
    next_meeting_date: m.next_meeting_date || null,
    status: m.status || 'Planlandı',
    notes: m.raw_notes || null,
    action_items: m.action_plan || null,
    created_at: m.created_at,
    updated_at: m.updated_at || m.created_at,
    student: m.profiles || m.student,
  };
}

const DELETED_MEETINGS_STORAGE_KEY = 'mahfaza_deleted_parent_meetings_v1';

function getDeletedMeetingIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_MEETINGS_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function markMeetingDeletedLocally(meetingId: string): void {
  try {
    const set = getDeletedMeetingIds();
    set.add(meetingId);
    localStorage.setItem(DELETED_MEETINGS_STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // Ignore storage error
  }
}

export const coachMeetingService = {
  /**
   * Get all meetings scheduled by this coach directly from Supabase parent_meetings table
   */
  async getMeetingsForCoach(coachId: string): Promise<CoachParentMeeting[]> {
    try {
      const deletedIds = getDeletedMeetingIds();
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('coach_id', coachId)
        .order('meeting_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const activeRows = data.filter((r: any) => !deletedIds.has(r.id));
      if (activeRows.length === 0) return [];

      const studentIds = [...new Set(activeRows.map((r: any) => r.student_id).filter(Boolean))];
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, name, full_name, avatar_url')
        .in('id', studentIds);

      const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
      return activeRows.map((row: any) => {
        const m = mapRowToMeeting(row);
        const sp: any = profMap.get(row.student_id);
        if (sp) {
          m.student = {
            ...sp,
            first_name: sp.first_name || (sp.full_name ? sp.full_name.split(' ')[0] : 'Öğrenci'),
            last_name: sp.last_name || (sp.full_name ? sp.full_name.split(' ').slice(1).join(' ') : ''),
          };
          const std = m.student;
          if (!m.student_name && std) {
            m.student_name = `${std.first_name || ''} ${std.last_name || ''}`.trim();
          }
        }
        return m;
      }).sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
    } catch {
      return [];
    }
  },

  /**
   * Get all meetings for a student (for parent portal view and PDF export)
   */
  async getMeetingsForStudent(studentId: string): Promise<CoachParentMeeting[]> {
    try {
      const deletedIds = getDeletedMeetingIds();
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('student_id', studentId)
        .order('meeting_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return [];
      }

      const activeRows = data.filter((r: any) => !deletedIds.has(r.id));
      if (activeRows.length === 0) return [];

      // Fetch coach profile info
      const coachIds = [...new Set(activeRows.map((r: any) => r.coach_id).filter(Boolean))];
      let coachMap = new Map();
      if (coachIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, name, full_name, avatar_url')
          .in('id', coachIds);
        coachMap = new Map((profs || []).map((p: any) => [p.id, p]));
      }

      return activeRows.map((row: any) => {
        const m = mapRowToMeeting(row);
        const cp: any = coachMap.get(row.coach_id);
        if (cp) {
          m.coach_name = cp.full_name || cp.name || `${cp.first_name || ''} ${cp.last_name || ''}`.trim();
        }
        return m;
      });
    } catch {
      return [];
    }
  },

  /**
   * Schedule/create a new parent meeting in Supabase parent_meetings table
   */
  async scheduleMeeting(payload: {
    coach_id: string;
    student_id: string;
    student_name?: string;
    parent_name?: string;
    parent_phone?: string;
    title?: string;
    meeting_date: string;
    meeting_time?: string;
    meeting_type: 'online' | 'in_person' | 'phone';
    status?: 'Planlandı' | 'Tamamlandı' | 'İptal Edildi';
    teacher_opinions?: string;
    academic_evaluation?: string;
    raw_notes?: string;
    psychological_status?: string;
    action_plan?: string;
    next_meeting_date?: string;
    student?: any;
  }): Promise<CoachParentMeeting> {
    const meetingId = generateUUID();

    const insertPayload: any = {
      id: meetingId,
      coach_id: payload.coach_id,
      student_id: payload.student_id,
      meeting_date: payload.meeting_date,
      meeting_time: payload.meeting_time || null,
      meeting_type: payload.meeting_type,
      status: payload.status || 'Planlandı',
      student_name: payload.student_name || null,
      parent_name: payload.parent_name || null,
      parent_phone: payload.parent_phone || null,
      person_contacted: payload.parent_name || null,
      teacher_opinions: payload.teacher_opinions?.trim() || null,
      academic_evaluation: payload.academic_evaluation?.trim() || null,
      raw_notes: payload.raw_notes?.trim() || null,
      psychological_status: payload.psychological_status?.trim() || null,
      action_plan: payload.action_plan?.trim() || null,
      next_meeting_date: payload.next_meeting_date || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('parent_meetings')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRowToMeeting(data);
  },

  /**
   * Update meeting in Supabase parent_meetings table
   */
  async updateMeeting(
    meetingId: string,
    updates: Partial<CoachParentMeeting>
  ): Promise<CoachParentMeeting> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.meeting_date) dbUpdates.meeting_date = updates.meeting_date;
    if (updates.meeting_time !== undefined) dbUpdates.meeting_time = updates.meeting_time;
    if (updates.meeting_type) dbUpdates.meeting_type = updates.meeting_type;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.student_name !== undefined) dbUpdates.student_name = updates.student_name;
    if (updates.parent_name !== undefined) dbUpdates.parent_name = updates.parent_name;
    if (updates.parent_phone !== undefined) dbUpdates.parent_phone = updates.parent_phone;
    if (updates.person_contacted !== undefined) dbUpdates.person_contacted = updates.person_contacted;
    if (updates.teacher_opinions !== undefined) dbUpdates.teacher_opinions = updates.teacher_opinions;
    if (updates.academic_evaluation !== undefined) dbUpdates.academic_evaluation = updates.academic_evaluation;
    if (updates.raw_notes !== undefined) dbUpdates.raw_notes = updates.raw_notes;
    if (updates.refined_notes !== undefined) dbUpdates.refined_notes = updates.refined_notes;
    if (updates.psychological_status !== undefined) dbUpdates.psychological_status = updates.psychological_status;
    if (updates.coach_recommendations !== undefined) dbUpdates.coach_recommendations = updates.coach_recommendations;
    if (updates.action_plan !== undefined) dbUpdates.action_plan = updates.action_plan;
    if (updates.next_meeting_date !== undefined) dbUpdates.next_meeting_date = updates.next_meeting_date;

    const { data, error } = await supabase
      .from('parent_meetings')
      .update(dbUpdates)
      .eq('id', meetingId)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRowToMeeting(data);
  },

  /**
   * Delete meeting from Supabase parent_meetings table (and coach_parent_meetings if present)
   */
  async deleteParentMeeting(meetingId: string): Promise<void> {
    markMeetingDeletedLocally(meetingId);

    const { error } = await supabase
      .from('parent_meetings')
      .delete()
      .eq('id', meetingId);

    // Also attempt cleanup in coach_parent_meetings if such table exists
    try {
      await supabase.from('coach_parent_meetings').delete().eq('id', meetingId);
    } catch {
      // Ignore if table doesn't exist
    }

    if (error) {
      console.warn('Supabase deleteParentMeeting warning (handled via local sync):', error.message);
    }
  },

  async deleteMeeting(meetingId: string): Promise<void> {
    return this.deleteParentMeeting(meetingId);
  },
};

