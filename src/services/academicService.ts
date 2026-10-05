import { supabase } from '../lib/supabase';
import { AcademicClass, Subject, ScheduleItem } from '../types';

export const academicService = {
  async getClasses(): Promise<AcademicClass[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, grade_level, academic_year, created_at, updated_at')
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as AcademicClass[];
  },

  async createClass(name: string, gradeLevel: number, academicYear: string): Promise<AcademicClass> {
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        grade_level: gradeLevel,
        academic_year: academicYear,
      })
      .select('id, name, grade_level, academic_year, created_at, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return data as AcademicClass;
  },

  async getSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, code, created_at')
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Subject[];
  },

  async createSubject(name: string, code: string): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .insert({ name, code: code.toUpperCase() })
      .select('id, name, code, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data as Subject;
  },

  async getMasterSchedule(classId?: string, teacherId?: string): Promise<ScheduleItem[]> {
    try {
      let query = supabase
        .from('master_schedule')
        .select(`
          id, class_id, teacher_id, subject_id, day_of_week, period, room, academic_year, created_at, updated_at,
          classes:class_id(name),
          profiles:teacher_id(first_name, last_name),
          subjects:subject_id(name)
        `)
        .order('day_of_week', { ascending: true })
        .order('period', { ascending: true });

      if (classId) query = query.eq('class_id', classId);
      if (teacherId) query = query.eq('teacher_id', teacherId);

      const { data, error } = await query;
      if (error) return [];

      return (data || []).map((row: any) => ({
        id: row.id,
        class_id: row.class_id,
        teacher_id: row.teacher_id,
        subject_id: row.subject_id,
        day_of_week: row.day_of_week,
        period: row.period,
        room: row.room,
        academic_year: row.academic_year,
        created_at: row.created_at,
        updated_at: row.updated_at,
        class_name: row.classes?.name,
        teacher_name: row.profiles ? `${row.profiles.first_name || ''} ${row.profiles.last_name || ''}`.trim() : undefined,
        subject_name: row.subjects?.name,
      }));
    } catch {
      return [];
    }
  },

  async createScheduleItem(item: {
    class_id: string;
    teacher_id: string;
    subject_id: string;
    day_of_week: number;
    period: number;
    room?: string;
    academic_year: string;
  }): Promise<void> {
    const { error } = await supabase.from('master_schedule').insert(item);
    if (error) throw new Error(error.message);
  },

  async getClassStudents(classId: string) {
    const { data, error } = await supabase
      .from('class_students')
      .select(`
        student_id,
        created_at,
        profiles:student_id(id, email, first_name, last_name, role)
      `)
      .eq('class_id', classId);

    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => row.profiles);
  },
};
