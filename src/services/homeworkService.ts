import { supabase } from '../lib/supabase';
import { Homework, HomeworkSubmission, HomeworkStatus } from '../types';

export const homeworkService = {
  async getHomeworks(classId?: string): Promise<Homework[]> {
    try {
      let query = supabase
        .from('homeworks')
        .select('*')
        .order('due_at', { ascending: false });

      if (classId) query = query.eq('class_id', classId);

      const { data, error } = await query;
      if (error || !data) {
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        class_id: row.class_id,
        teacher_id: row.teacher_id,
        subject_id: row.subject_id,
        title: row.title,
        description: row.description,
        due_at: row.due_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        class_name: row.class_name,
        subject_name: row.subject_name,
        teacher_name: row.teacher_name || 'Öğretmen',
      }));
    } catch {
      return [];
    }
  },

  async createHomework(payload: {
    class_id: string;
    teacher_id: string;
    subject_id: string;
    title: string;
    description?: string;
    due_at: string;
  }): Promise<Homework> {
    const { data, error } = await supabase
      .from('homeworks')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as Homework;
  },

  async getSubmissions(homeworkId: string): Promise<HomeworkSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('homework_id', homeworkId)
        .order('submitted_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map((row: any) => ({
        id: row.id,
        homework_id: row.homework_id,
        student_id: row.student_id,
        content: row.content,
        submitted_at: row.submitted_at,
        grade: row.grade,
        teacher_feedback: row.teacher_feedback,
        status: row.status as HomeworkStatus,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
    } catch {
      return [];
    }
  },

  async getStudentSubmissions(studentId: string): Promise<HomeworkSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', studentId);

      if (error || !data) {
        return [];
      }
      return data as HomeworkSubmission[];
    } catch {
      return [];
    }
  },

  async submitHomework(homeworkId: string, studentId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('homework_submissions')
      .upsert(
        {
          homework_id: homeworkId,
          student_id: studentId,
          content,
          submitted_at: new Date().toISOString(),
          status: 'submitted',
        },
        { onConflict: 'homework_id,student_id' }
      );

    if (error) {
      throw new Error(error.message);
    }
  },

  async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('homework_submissions')
      .update({
        grade,
        teacher_feedback: feedback || null,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (error) {
      throw new Error(error.message);
    }
  },
};
