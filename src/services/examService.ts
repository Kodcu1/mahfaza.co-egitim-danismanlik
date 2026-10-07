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
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .order('score', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        exam_id: examId,
        student_id: row.student_id,
        exam_name: row.exam_name || 'Deneme Sınavı',
        exam_type: row.exam_type || 'TYT',
        exam_date: row.exam_date || row.created_at,
        total_questions: Number(row.total_questions) || 0,
        total_correct: Number(row.total_correct) || 0,
        total_wrong: Number(row.total_wrong) || 0,
        total_empty: Number(row.total_empty) || 0,
        total_net: Number(row.total_net) || 0,
        score: Number(row.score) || 0,
        notes: row.notes,
        created_at: row.created_at,
      })) as ExamResult[];
    } catch {
      return [];
    }
  },

  async getStudentExamResults(studentId: string): Promise<ExamResult[]> {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('id, student_id, exam_type, exam_name, exam_date, total_questions, total_correct, total_wrong, total_empty, total_net, score, notes, created_at')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false });

      if (error || !data) return [];

      return data.map((row: any) => {
        let branches: any[] = [];
        try {
          if (row.notes) {
            const parsed = JSON.parse(row.notes);
            if (Array.isArray(parsed.branches)) {
              branches = parsed.branches;
            }
          }
        } catch {
          // not json
        }

        const turkBranch = branches.find((b: any) => b.name?.toLowerCase().includes('türk'));
        const mathBranch = branches.find((b: any) => b.name?.toLowerCase().includes('mat'));
        const fenBranch = branches.find((b: any) => b.name?.toLowerCase().includes('fen'));
        const sosBranch = branches.find((b: any) => b.name?.toLowerCase().includes('sos'));

        return {
          id: row.id,
          student_id: row.student_id,
          exam_name: row.exam_name || 'Deneme Sınavı',
          exam_type: row.exam_type || 'TYT',
          exam_date: row.exam_date || row.created_at,
          total_questions: Number(row.total_questions) || 0,
          total_correct: Number(row.total_correct) || 0,
          total_wrong: Number(row.total_wrong) || 0,
          total_empty: Number(row.total_empty) || 0,
          total_net: Number(row.total_net) || 0,
          score: Number(row.score) || 0,
          notes: row.notes,
          created_at: row.created_at,
          branches,
          turkish_net: turkBranch ? turkBranch.net : 0,
          math_net: mathBranch ? mathBranch.net : 0,
          science_net: fenBranch ? fenBranch.net : 0,
          social_net: sosBranch ? sosBranch.net : 0,
          exam: {
            id: row.id,
            title: row.exam_name || 'Deneme Sınavı',
            exam_type: row.exam_type || 'TYT',
            exam_date: row.exam_date || row.created_at,
            created_by: row.student_id,
            created_at: row.created_at,
          },
        } as ExamResult;
      });
    } catch {
      return [];
    }
  },

  async createStudentExamResult(payload: {
    student_id: string;
    exam_type: 'TYT' | 'AYT' | 'LGS';
    exam_name: string;
    exam_date: string;
    branches: { name: string; correct: number; wrong: number; empty: number; net: number }[];
    score?: number;
  }): Promise<ExamResult> {
    const totalCorrect = payload.branches.reduce((sum, b) => sum + (Number(b.correct) || 0), 0);
    const totalWrong = payload.branches.reduce((sum, b) => sum + (Number(b.wrong) || 0), 0);
    const totalEmpty = payload.branches.reduce((sum, b) => sum + (Number(b.empty) || 0), 0);
    const totalQuestions = totalCorrect + totalWrong + totalEmpty;

    // Net = Doğru - (Yanlış / 4)
    const totalNet = Number(
      payload.branches
        .reduce((sum, b) => {
          const net = Number(b.correct) - Number(b.wrong) / 4;
          return sum + net;
        }, 0)
        .toFixed(2)
    );

    let score = payload.score;
    if (!score || score <= 0) {
      if (payload.exam_type === 'TYT') {
        score = Number((100 + totalNet * 3.33).toFixed(2));
      } else if (payload.exam_type === 'AYT') {
        score = Number((100 + totalNet * 5.0).toFixed(2));
      } else {
        score = Number((100 + totalNet * 4.44).toFixed(2));
      }
    }

    const { data, error } = await supabase
      .from('exam_results')
      .insert({
        student_id: payload.student_id,
        exam_type: payload.exam_type,
        exam_name: payload.exam_name.trim(),
        exam_date: payload.exam_date,
        total_questions: totalQuestions,
        total_correct: totalCorrect,
        total_wrong: totalWrong,
        total_empty: totalEmpty,
        total_net: totalNet,
        score,
        notes: JSON.stringify({ branches: payload.branches }),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      ...data,
      branches: payload.branches,
      exam: {
        id: data.id,
        title: data.exam_name,
        exam_type: data.exam_type,
        exam_date: data.exam_date,
        created_by: data.student_id,
        created_at: data.created_at,
      },
    } as ExamResult;
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
