import { supabase } from '../lib/supabase';
import { CoachParentMeeting } from '../types';

const LOCAL_MEETINGS_KEY = 'mahfaza_coach_meetings';

function getStoredMeetings(): CoachParentMeeting[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEETINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredMeetings(meetings: CoachParentMeeting[]) {
  try {
    localStorage.setItem(LOCAL_MEETINGS_KEY, JSON.stringify(meetings));
  } catch {
    // ignore
  }
}

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
    student_name: m.student_name || (m.profiles ? `${m.profiles.first_name || ''} ${m.profiles.last_name || ''}`.trim() : null),
    parent_name: m.parent_name || null,
    parent_phone: m.parent_phone || null,
    person_contacted: m.person_contacted || null,
    teacher_opinions: m.teacher_opinions || null,
    academic_evaluation: m.academic_evaluation || null,
    raw_notes: m.raw_notes || m.notes || null,
    refined_notes: m.refined_notes || null,
    psychological_status: m.psychological_status || null,
    coach_recommendations: m.coach_recommendations || null,
    action_plan: m.action_plan || m.action_items || null,
    next_meeting_date: m.next_meeting_date || m.next_followup_date || null,
    status: m.status || 'Planlandı',
    notes: m.raw_notes || m.notes || null,
    action_items: m.action_plan || m.action_items || null,
    created_at: m.created_at,
    updated_at: m.updated_at || m.created_at,
    student: m.profiles || m.student,
  };
}

export const coachMeetingService = {
  /**
   * Get all meetings scheduled by this coach from real Supabase parent_meetings table
   */
  async getMeetingsForCoach(coachId: string): Promise<CoachParentMeeting[]> {
    let meetings: CoachParentMeeting[] = [];

    try {
      const { data, error } = await supabase
        .from('parent_meetings')
        .select('*')
        .eq('coach_id', coachId)
        .order('meeting_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const studentIds = [...new Set(data.map((r: any) => r.student_id).filter(Boolean))];
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, name, full_name, avatar_url')
          .in('id', studentIds);

        const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
        meetings = data.map((row: any) => {
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
        });
      } else if (!error && data) {
        meetings = [];
      }
    } catch {
      // ignore
    }

    // Merge with local persistent storage
    const stored = getStoredMeetings().filter((m) => m.coach_id === coachId);
    const existingIds = new Set(meetings.map((m) => m.id));
    for (const sm of stored) {
      if (!existingIds.has(sm.id)) {
        meetings.push(sm);
      }
    }

    return meetings.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  },

  /**
   * Schedule/create a new parent meeting with structured fields
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
    const newMeeting: CoachParentMeeting = {
      id: meetingId,
      coach_id: payload.coach_id,
      student_id: payload.student_id,
      student_name: payload.student_name || null,
      parent_name: payload.parent_name || null,
      parent_phone: payload.parent_phone || null,
      title: payload.title?.trim() || `Veli Görüşmesi - ${payload.student_name || 'Öğrenci'}`,
      meeting_date: payload.meeting_date,
      meeting_time: payload.meeting_time || null,
      meeting_type: payload.meeting_type,
      status: payload.status || 'Planlandı',
      teacher_opinions: payload.teacher_opinions?.trim() || null,
      academic_evaluation: payload.academic_evaluation?.trim() || null,
      raw_notes: payload.raw_notes?.trim() || null,
      psychological_status: payload.psychological_status?.trim() || null,
      action_plan: payload.action_plan?.trim() || null,
      next_meeting_date: payload.next_meeting_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      student: payload.student,
    };

    // Insert into real Supabase parent_meetings table
    try {
      const { data, error } = await supabase
        .from('parent_meetings')
        .insert({
          id: newMeeting.id,
          coach_id: newMeeting.coach_id,
          student_id: newMeeting.student_id,
          meeting_date: newMeeting.meeting_date,
          meeting_time: newMeeting.meeting_time,
          meeting_type: newMeeting.meeting_type,
          status: newMeeting.status,
          student_name: newMeeting.student_name,
          parent_name: newMeeting.parent_name,
          parent_phone: newMeeting.parent_phone,
          teacher_opinions: newMeeting.teacher_opinions,
          academic_evaluation: newMeeting.academic_evaluation,
          raw_notes: newMeeting.raw_notes,
          psychological_status: newMeeting.psychological_status,
          action_plan: newMeeting.action_plan,
          next_meeting_date: newMeeting.next_meeting_date,
        })
        .select('*')
        .single();

      if (!error && data) {
        newMeeting.id = data.id;
      }
    } catch {
      // fallback to storage
    }

    const all = getStoredMeetings();
    all.unshift(newMeeting);
    saveStoredMeetings(all);

    return newMeeting;
  },

  /**
   * Update an existing parent meeting with new notes, decisions, or status
   */
  async updateMeeting(
    meetingId: string,
    payload: Partial<CoachParentMeeting>
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Update remote database table
    try {
      await supabase
        .from('parent_meetings')
        .update({
          meeting_date: payload.meeting_date,
          meeting_time: payload.meeting_time,
          meeting_type: payload.meeting_type,
          status: payload.status,
          parent_name: payload.parent_name,
          parent_phone: payload.parent_phone,
          teacher_opinions: payload.teacher_opinions,
          academic_evaluation: payload.academic_evaluation,
          raw_notes: payload.raw_notes || payload.notes,
          psychological_status: payload.psychological_status,
          action_plan: payload.action_plan || payload.action_items,
          next_meeting_date: payload.next_meeting_date,
          updated_at: now,
        })
        .eq('id', meetingId);
    } catch {
      // ignore
    }

    // 2. Update local storage
    const all = getStoredMeetings();
    const idx = all.findIndex((m) => m.id === meetingId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        ...payload,
        updated_at: now,
      };
      saveStoredMeetings(all);
    }
  },
};
