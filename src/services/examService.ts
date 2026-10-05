import { supabase } from '../lib/supabase';
import { Exam, ExamResult, ExamType } from '../types';

export const examService = {
  async getExams(classId?: string): Promise<Exam[]> {
    let query = supabase
      .from('exams')
      .select(`
        id, title, exam_type, exam_date, class_id, created_by, created_at,
        classes:class_id(name)
      `)
      .order('exam_date', { ascending: false });

    if (classId) query = query.eq('class_id', classId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      exam_type: row.exam_type as ExamType,
      exam_date: row.exam_date,
      class_id: row.class_id,
      created_by: row.created_by,
      created_at: row.created_at,
      class_name: row.classes?.name,
    }));
  },

  async createExam(payload: {
    title: string;
    exam_type: ExamType;
    exam_date: string;
    class_id?: string;
    created_by: string;
  }): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .insert(payload)
      .select('id, title, exam_type, exam_date, class_id, created_by, created_at')
      .single();

    if (error) throw new Error(error.message);
    return data as Exam;
  },

  async getExamResults(examId: string): Promise<ExamResult[]> {
    const { data, error } = await supabase
      .from('exam_results')
      .select(`
        id, exam_id, student_id, turkish_net, math_net, social_net, science_net, total_net, score, rank, created_at, updated_at,
        profiles:student_id(id, email, first_name, last_name)
      `)
      .eq('exam_id', examId)
      .order('score', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      exam_id: row.exam_id,
      student_id: row.student_id,
      turkish_net: Number(row.turkish_net) || 0,
      math_net: Number(row.math_net) || 0,
      social_net: Number(row.social_net) || 0,
      science_net: Number(row.science_net) || 0,
      total_net: Number(row.total_net) || 0,
      score: Number(row.score) || 0,
      rank: row.rank,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student: row.profiles,
    }));
  },

  async getStudentExamResults(studentId: string): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          id, exam_id, student_id, turkish_net, math_net, social_net, science_net, total_net, score, rank, created_at, updated_at,
          exams:exam_id(title, exam_type, exam_date)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) return [];

      return (data || []).map((row: any) => ({
        id: row.id,
        exam_id: row.exam_id,
        student_id: row.student_id,
        turkish_net: Number(row.turkish_net) || 0,
        math_net: Number(row.math_net) || 0,
        social_net: Number(row.social_net) || 0,
        science_net: Number(row.science_net) || 0,
        total_net: Number(row.total_net) || 0,
        score: Number(row.score) || 0,
        rank: row.rank,
        created_at: row.created_at,
        updated_at: row.updated_at,
        exam: row.exams,
      }));
    } catch {
      return [];
    }
  },

  async recordExamResult(payload: {
    exam_id: string;
    student_id: string;
    turkish_net: number;
    math_net: number;
    social_net: number;
    science_net: number;
    score: number;
    rank?: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('exam_results')
      .upsert(payload, { onConflict: 'exam_id,student_id' });

    if (error) throw new Error(error.message);
  },
};
