import { supabase } from '../lib/supabase';
import { Exam, ExamResult, ExamType } from '../types';

const LOCAL_EXAMS_STORAGE_KEY = 'mahfaza_student_exam_results_store_2026';

function getLocalExamResults(): ExamResult[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAMS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalExamResult(exam: ExamResult) {
  try {
    const current = getLocalExamResults();
    const existingIndex = current.findIndex((item) => item.id === exam.id);
    if (existingIndex >= 0) {
      current[existingIndex] = exam;
      localStorage.setItem(LOCAL_EXAMS_STORAGE_KEY, JSON.stringify(current));
    } else {
      localStorage.setItem(LOCAL_EXAMS_STORAGE_KEY, JSON.stringify([exam, ...current]));
    }
  } catch (e) {
    console.warn('Failed to save exam result locally:', e);
  }
}

const LOCAL_EXAMS_LIST_KEY = 'mahfaza_exams_list_store_2026';

function getLocalExams(classId?: string): Exam[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXAMS_LIST_KEY);
    if (raw) {
      const parsed: Exam[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (classId) return parsed.filter((e) => e.class_id === classId);
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalExams(exams: Exam[]) {
  try {
    localStorage.setItem(LOCAL_EXAMS_LIST_KEY, JSON.stringify(exams));
  } catch {
    // ignore
  }
}

export const examService = {
  async getExams(classId?: string): Promise<Exam[]> {
    try {
      let query = supabase
        .from('exams')
        .select(`
          id, title, exam_type, exam_date, class_id, created_by, created_at,
          classes:class_id(name)
        `)
        .order('exam_date', { ascending: false });

      if (classId) query = query.eq('class_id', classId);

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return getLocalExams(classId);
      }

      const list = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        exam_type: row.exam_type as ExamType,
        exam_date: row.exam_date,
        class_id: row.class_id,
        created_by: row.created_by,
        created_at: row.created_at,
        class_name: row.classes?.name,
      }));
      saveLocalExams(list);
      return list;
    } catch {
      return getLocalExams(classId);
    }
  },

  async createExam(payload: {
    title: string;
    exam_type: ExamType;
    exam_date: string;
    class_id?: string;
    created_by: string;
  }): Promise<Exam> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert(payload)
        .select('id, title, exam_type, exam_date, class_id, created_by, created_at')
        .single();

      if (!error && data) {
        const current = getLocalExams();
        const updated = [data as Exam, ...current.filter((e) => e.id !== data.id)];
        saveLocalExams(updated);
        return data as Exam;
      }
    } catch {
      // ignore
    }

    const fallbackExam: Exam = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exam-${Date.now()}`,
      title: payload.title,
      exam_type: payload.exam_type,
      exam_date: payload.exam_date,
      class_id: payload.class_id,
      created_by: payload.created_by,
      created_at: new Date().toISOString(),
    };
    const current = getLocalExams();
    saveLocalExams([fallbackExam, ...current]);
    return fallbackExam;
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

  async getStudentExamResults(studentId: string, secondaryStudentId?: string): Promise<ExamResult[]> {
    if (!studentId) return [];

    const targetIds = Array.from(new Set([studentId, secondaryStudentId].filter(Boolean))) as string[];
    let remoteResults: ExamResult[] = [];

    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .in('student_id', targetIds)
        .order('exam_date', { ascending: false });

      if (!error && data) {
        remoteResults = data.map((row: any) => {
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

          const fenBranches = branches.filter((b: any) => {
            const n = b.name?.toLowerCase() || '';
            return n.includes('fen') || n.includes('fizik') || n.includes('kimya') || n.includes('biyoloji');
          });
          const calcScienceNet = fenBranches.length > 0
            ? Number(fenBranches.reduce((s: number, b: any) => s + (Number(b.net) || 0), 0).toFixed(2))
            : Number(row.science_net) || 0;

          const sosBranches = branches.filter((b: any) => {
            const n = b.name?.toLowerCase() || '';
            return n.includes('sos') || n.includes('tarih') || n.includes('coğrafya') || n.includes('cografya') || n.includes('felsefe') || n.includes('din') || n.includes('inkılap');
          });
          const calcSocialNet = sosBranches.length > 0
            ? Number(sosBranches.reduce((s: number, b: any) => s + (Number(b.net) || 0), 0).toFixed(2))
            : Number(row.social_net) || 0;

          return {
            id: row.id,
            student_id: row.student_id,
            exam_name: row.exam_name || 'Deneme Sınavı',
            exam_type: row.exam_type || 'TYT',
            exam_date: row.exam_date || row.created_at?.slice(0, 10),
            total_questions: Number(row.total_questions) || 0,
            total_correct: Number(row.total_correct) || 0,
            total_wrong: Number(row.total_wrong) || 0,
            total_empty: Number(row.total_empty) || 0,
            total_net: Number(row.total_net) || 0,
            score: Number(row.score) || 0,
            notes: row.notes,
            created_at: row.created_at,
            branches,
            turkish_net: turkBranch ? turkBranch.net : Number(row.turkish_net) || 0,
            math_net: mathBranch ? mathBranch.net : Number(row.math_net) || 0,
            science_net: calcScienceNet,
            social_net: calcSocialNet,
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
      }
    } catch {
      // ignore
    }

    // Merge with local storage exam records (filter by targetIds, deduplicate by id)
    const localExams = getLocalExamResults().filter((item) => targetIds.includes(item.student_id));
    const combined: ExamResult[] = [...remoteResults];

    for (const le of localExams) {
      if (!combined.some((r) => r.id === le.id)) {
        combined.push(le);
      }
    }

    return combined.sort((a, b) => {
      const dateA = new Date(a.exam_date || a.created_at || '').getTime();
      const dateB = new Date(b.exam_date || b.created_at || '').getTime();
      return dateB - dateA;
    });
  },

  async createStudentExamResult(payload: {
    student_id?: string;
    secondary_student_id?: string;
    exam_type: 'TYT' | 'AYT' | 'LGS';
    exam_name: string;
    exam_date: string;
    branches: { name: string; correct: number; wrong: number; empty: number; net: number }[];
    score?: number;
  }): Promise<ExamResult> {
    let resolvedStudentId = payload.student_id;
    if (!resolvedStudentId) {
      const { data: authData } = await supabase.auth.getUser();
      resolvedStudentId = authData.user?.id;
    }

    if (!resolvedStudentId) {
      throw new Error('Oturum bilgisi doğrulanamadı. Lütfen tekrar giriş yapın.');
    }

    const totalCorrect = payload.branches.reduce((sum, b) => sum + (Number(b.correct) || 0), 0);
    const totalWrong = payload.branches.reduce((sum, b) => sum + (Number(b.wrong) || 0), 0);
    const totalEmpty = payload.branches.reduce((sum, b) => sum + (Number(b.empty) || 0), 0);
    const totalQuestions = totalCorrect + totalWrong + totalEmpty;

    const divisor = payload.exam_type === 'LGS' ? 3 : 4;
    const totalNet = Number(
      payload.branches
        .reduce((sum, b) => {
          const net = Math.max(0, Number(b.correct) - Number(b.wrong) / divisor);
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

    const examId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'exam-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

    const now = new Date().toISOString();

    const turkBranch = payload.branches.find((b: any) => b.name?.toLowerCase().includes('türk'));
    const mathBranch = payload.branches.find((b: any) => b.name?.toLowerCase().includes('mat'));

    const fenBranches = payload.branches.filter((b: any) => {
      const n = b.name?.toLowerCase() || '';
      return n.includes('fen') || n.includes('fizik') || n.includes('kimya') || n.includes('biyoloji');
    });
    const calculatedScienceNet = fenBranches.length > 0
      ? Number(fenBranches.reduce((s: number, b: any) => s + (Number(b.net) || 0), 0).toFixed(2))
      : 0;

    const sosBranches = payload.branches.filter((b: any) => {
      const n = b.name?.toLowerCase() || '';
      return n.includes('sos') || n.includes('tarih') || n.includes('coğrafya') || n.includes('cografya') || n.includes('felsefe') || n.includes('din') || n.includes('inkılap');
    });
    const calculatedSocialNet = sosBranches.length > 0
      ? Number(sosBranches.reduce((s: number, b: any) => s + (Number(b.net) || 0), 0).toFixed(2))
      : 0;

    const completedResult: ExamResult = {
      id: examId,
      student_id: resolvedStudentId,
      exam_name: payload.exam_name.trim(),
      exam_type: payload.exam_type,
      exam_date: payload.exam_date,
      total_questions: totalQuestions,
      total_correct: totalCorrect,
      total_wrong: totalWrong,
      total_empty: totalEmpty,
      total_net: totalNet,
      score,
      turkish_net: turkBranch ? turkBranch.net : 0,
      math_net: mathBranch ? mathBranch.net : 0,
      science_net: calculatedScienceNet,
      social_net: calculatedSocialNet,
      branches: payload.branches,
      notes: JSON.stringify({ branches: payload.branches }),
      created_at: now,
      exam: {
        id: examId,
        title: payload.exam_name.trim(),
        exam_type: payload.exam_type,
        exam_date: payload.exam_date,
        created_by: resolvedStudentId,
        created_at: now,
      },
    };

    // 1. Immediately store in resilient local storage cache
    saveLocalExamResult(completedResult);

    // 2. Attempt remote Supabase insert with fallback for RLS or schema column mismatches
    let remoteSuccess = false;
    try {
      // Try full compatible payload first
      const { data: inserted, error: insertError } = await supabase
        .from('exam_results')
        .insert({
          id: examId,
          student_id: resolvedStudentId,
          exam_type: payload.exam_type,
          exam_name: payload.exam_name.trim(),
          exam_date: payload.exam_date,
          total_questions: totalQuestions,
          total_correct: totalCorrect,
          total_wrong: totalWrong,
          total_empty: totalEmpty,
          total_net: totalNet,
          score,
          turkish_net: turkBranch ? turkBranch.net : 0,
          math_net: mathBranch ? mathBranch.net : 0,
          science_net: calculatedScienceNet,
          social_net: calculatedSocialNet,
          notes: JSON.stringify({ branches: payload.branches }),
          created_at: now,
        })
        .select()
        .maybeSingle();

      if (!insertError && inserted) {
        remoteSuccess = true;
      } else if (insertError) {
        console.warn('First exam_results insert attempt note:', insertError.message);
        
        // Try minimal insert without id in case DB auto-generates or has narrower columns
        const { data: minInserted, error: minError } = await supabase
          .from('exam_results')
          .insert({
            student_id: resolvedStudentId,
            exam_name: payload.exam_name.trim(),
            exam_date: payload.exam_date,
            score,
            notes: JSON.stringify({ branches: payload.branches }),
          })
          .select()
          .maybeSingle();

        if (!minError && minInserted) {
          remoteSuccess = true;
          completedResult.id = minInserted.id;
          saveLocalExamResult(completedResult);
        } else {
          console.warn('Supabase remote insert fallback to local storage (RLS/Schema):', minError?.message || insertError.message);
        }
      }
    } catch (ex: any) {
      console.warn('Supabase remote insert exception handled via local ledger:', ex?.message || ex);
    }

    // 3. Broadcast instant sync event so UI cards, charts, and metrics update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mahfaza:exam-updated', {
          detail: { studentId: resolvedStudentId, exam: completedResult, persistedRemotely: remoteSuccess },
        })
      );
    }

    return completedResult;
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
    try {
      const { error } = await supabase
        .from('exam_results')
        .upsert(payload, { onConflict: 'exam_id,student_id' });

      if (error) {
        console.warn('recordExamResult remote error note:', error.message);
      }
    } catch (e) {
      console.warn('recordExamResult exception handled:', e);
    }
  },
};
