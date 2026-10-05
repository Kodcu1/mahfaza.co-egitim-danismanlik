import { supabase } from '../lib/supabase';
import { AttendanceSession, AttendanceRecord, AttendanceStatus } from '../types';

export const attendanceService = {
  async getSessions(classId?: string, date?: string): Promise<AttendanceSession[]> {
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
    if (error) throw new Error(error.message);

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
  },

  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        id, session_id, student_id, status, note, created_at, updated_at,
        profiles:student_id(id, email, first_name, last_name, role)
      `)
      .eq('session_id', sessionId);

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      session_id: row.session_id,
      student_id: row.student_id,
      status: row.status as AttendanceStatus,
      note: row.note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student: row.profiles,
    }));
  },

  async getStudentAttendance(studentId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        id, session_id, student_id, status, note, created_at, updated_at,
        attendance_sessions:session_id(date, period, class_id, classes:class_id(name))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as AttendanceRecord[];
  },

  async saveAttendanceSession(
    classId: string,
    teacherId: string,
    date: string,
    period: number,
    records: { student_id: string; status: AttendanceStatus; note?: string }[]
  ): Promise<string> {
    // 1. Create or get session
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

    if (sessionError) throw new Error(sessionError.message);
    const sessionId = sessionData.id;

    // 2. Insert records
    const recordPayload = records.map((r) => ({
      session_id: sessionId,
      student_id: r.student_id,
      status: r.status,
      note: r.note || null,
    }));

    const { error: recordsError } = await supabase
      .from('attendance_records')
      .upsert(recordPayload, { onConflict: 'session_id,student_id' });

    if (recordsError) throw new Error(recordsError.message);
    return sessionId;
  },
};
