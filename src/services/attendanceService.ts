import { supabase } from '../lib/supabase';
import { AttendanceSession, AttendanceRecord, AttendanceStatus } from '../types';

const LOCAL_ATTENDANCE_SESSIONS_KEY = 'mahfaza_attendance_sessions_store_v1';
const LOCAL_ATTENDANCE_RECORDS_KEY = 'mahfaza_attendance_records_store_v1';

function getLocalSessions(classId?: string, date?: string): AttendanceSession[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_SESSIONS_KEY);
    if (raw) {
      const parsed: AttendanceSession[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let filtered = parsed;
        if (classId) filtered = filtered.filter((s) => s.class_id === classId);
        if (date) filtered = filtered.filter((s) => s.date === date);
        return filtered;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalSession(session: AttendanceSession) {
  try {
    const current = getLocalSessions();
    const filtered = current.filter((s) => s.id !== session.id);
    localStorage.setItem(LOCAL_ATTENDANCE_SESSIONS_KEY, JSON.stringify([session, ...filtered]));
  } catch {
    // ignore
  }
}

function getLocalRecords(sessionId?: string, studentId?: string): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_RECORDS_KEY);
    if (raw) {
      const parsed: AttendanceRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let filtered = parsed;
        if (sessionId) filtered = filtered.filter((r) => r.session_id === sessionId);
        if (studentId) filtered = filtered.filter((r) => r.student_id === studentId);
        return filtered;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalRecords(records: AttendanceRecord[]) {
  try {
    const current = getLocalRecords();
    const map = new Map(current.map((r) => [r.id, r]));
    records.forEach((r) => map.set(r.id, r));
    localStorage.setItem(LOCAL_ATTENDANCE_RECORDS_KEY, JSON.stringify(Array.from(map.values())));
  } catch {
    // ignore
  }
}

export const attendanceService = {
  async getSessions(classId?: string, date?: string): Promise<AttendanceSession[]> {
    try {
      let query = supabase
        .from('attendance_sessions')
        .select(`
          id, class_id, teacher_id, date, period, status, created_at, updated_at,
          classes:class_id(name)
        `)
        .order('date', { ascending: false })
        .order('period', { ascending: true });

      if (classId) query = query.eq('class_id', classId);
      if (date) query = query.eq('date', date);

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return getLocalSessions(classId, date);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        class_id: row.class_id,
        teacher_id: row.teacher_id,
        date: row.date,
        period: row.period,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        class_name: row.classes?.name,
      }));
    } catch {
      return getLocalSessions(classId, date);
    }
  },

  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, session_id, student_id, status, note, created_at, updated_at,
          profiles:student_id(id, email, full_name, name, role)
        `)
        .eq('session_id', sessionId);

      if (error || !data || data.length === 0) {
        return getLocalRecords(sessionId);
      }

      return (data || []).map((row: any) => {
        const p = row.profiles;
        return {
          id: row.id,
          session_id: row.session_id,
          student_id: row.student_id,
          status: row.status as AttendanceStatus,
          note: row.note,
          created_at: row.created_at,
          updated_at: row.updated_at,
          student: p
            ? {
                ...p,
                first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
                last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
              }
            : undefined,
        };
      });
    } catch {
      return getLocalRecords(sessionId);
    }
  },

  async getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, session_id, student_id, status, note, created_at, updated_at,
          attendance_sessions:session_id(date, period, class_id, classes:class_id(name))
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        return getLocalRecords(undefined, studentId);
      }
      return (data || []) as AttendanceRecord[];
    } catch {
      return getLocalRecords(undefined, studentId);
    }
  },

  async saveAttendanceSession(
    classId: string,
    teacherId: string,
    date: string,
    period: number,
    records: { student_id: string; status: AttendanceStatus; note?: string }[]
  ): Promise<string> {
    const fallbackSessionId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess-${Date.now()}`;
    let sessionId = fallbackSessionId;

    try {
      // 1. Try Create or get session on Supabase
      const { data: sessionData, error: sessionError } = await supabase
        .from('attendance_sessions')
        .upsert(
          {
            class_id: classId,
            teacher_id: teacherId,
            date,
            period,
            status: 'completed',
          },
          { onConflict: 'class_id,date,period' }
        )
        .select('id')
        .single();

      if (!sessionError && sessionData?.id) {
        sessionId = sessionData.id;

        // 2. Insert records on Supabase
        const recordPayload = records.map((r) => ({
          session_id: sessionId,
          student_id: r.student_id,
          status: r.status,
          note: r.note || null,
        }));

        await supabase
          .from('attendance_records')
          .upsert(recordPayload, { onConflict: 'session_id,student_id' });
      }
    } catch {
      // ignore
    }

    // Save locally
    const sessionObj: AttendanceSession = {
      id: sessionId,
      class_id: classId,
      teacher_id: teacherId,
      date,
      period,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalSession(sessionObj);

    const recordObjs: AttendanceRecord[] = records.map((r) => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}-${r.student_id}`,
      session_id: sessionId,
      student_id: r.student_id,
      status: r.status,
      note: r.note,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    saveLocalRecords(recordObjs);

    return sessionId;
  },
};
