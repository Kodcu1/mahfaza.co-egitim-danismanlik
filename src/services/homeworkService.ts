import { supabase } from '../lib/supabase';
import { Homework, HomeworkSubmission, HomeworkStatus } from '../types';

const LOCAL_HOMEWORKS_KEY = 'mahfaza_homeworks';
const LOCAL_SUBMISSIONS_KEY = 'mahfaza_homework_submissions';

// Initial default homeworks to ensure a rich experience when database tables are in migration
const DEFAULT_HOMEWORKS: Homework[] = [
  {
    id: 'hw-mat-101',
    class_id: 'class-1',
    teacher_id: 'teacher-1',
    subject_id: 'sub-mat',
    title: 'Fonksiyonlar ve Grafikleri Alıştırmaları',
    description: 'Bölüm sonundaki 1. ve 2. testlerin tüm sorularını çözüp adımları özetleyin.',
    due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    class_name: '12-A Sayısal',
    subject_name: 'Matematik',
    teacher_name: 'Ahmet Yılmaz',
  },
  {
    id: 'hw-fiz-102',
    class_id: 'class-1',
    teacher_id: 'teacher-1',
    subject_id: 'sub-fiz',
    title: 'Newton Hareket Yasaları & Sürtünme Kuvveti',
    description: 'Eğik düzlem ve serbest cisim diyagramları ile ilgili hazırlanan çalışma kağıdı.',
    due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    class_name: '12-A Sayısal',
    subject_name: 'Fizik',
    teacher_name: 'Zeynep Kaya',
  },
  {
    id: 'hw-par-103',
    class_id: 'class-1',
    teacher_id: 'teacher-1',
    subject_id: 'sub-turkce',
    title: 'Paragrafta Anlam ve Hızlı Okuma Analizi',
    description: 'Günlük 30 paragraf sorusu analizi ve yanlış yapılan soruların tespiti.',
    due_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    class_name: '12-A Sayısal',
    subject_name: 'Türkçe',
    teacher_name: 'Murat Demir',
  },
];

function getStoredHomeworks(): Homework[] {
  try {
    const raw = localStorage.getItem(LOCAL_HOMEWORKS_KEY);
    if (!raw) return DEFAULT_HOMEWORKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HOMEWORKS;
  } catch {
    return DEFAULT_HOMEWORKS;
  }
}

function saveStoredHomeworks(list: Homework[]) {
  try {
    localStorage.setItem(LOCAL_HOMEWORKS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

function getStoredSubmissions(): HomeworkSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredSubmissions(list: HomeworkSubmission[]) {
  try {
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
}

export const homeworkService = {
  async getHomeworks(classId?: string): Promise<Homework[]> {
    let remoteHomeworks: Homework[] = [];
    try {
      let query = supabase
        .from('homeworks')
        .select(`
          id, class_id, teacher_id, subject_id, title, description, due_at, created_at, updated_at,
          classes:class_id(name),
          subjects:subject_id(name),
          profiles:teacher_id(*)
        `)
        .order('due_at', { ascending: false });

      if (classId) query = query.eq('class_id', classId);

      const { data, error } = await query;
      if (!error && data) {
        remoteHomeworks = data.map((row: any) => ({
          id: row.id,
          class_id: row.class_id,
          teacher_id: row.teacher_id,
          subject_id: row.subject_id,
          title: row.title,
          description: row.description,
          due_at: row.due_at,
          created_at: row.created_at,
          updated_at: row.updated_at,
          class_name: row.classes?.name,
          subject_name: row.subjects?.name,
          teacher_name: row.profiles
            ? (row.profiles.first_name ? `${row.profiles.first_name} ${row.profiles.last_name || ''}`.trim() : (row.profiles.full_name || 'Öğretmen'))
            : undefined,
        }));
      }
    } catch {
      // Remote table may not exist; handled via local fallback
    }

    const localList = getStoredHomeworks();
    if (remoteHomeworks.length > 0) {
      const remoteIds = new Set(remoteHomeworks.map((h) => h.id));
      const combined = [...remoteHomeworks];
      for (const loc of localList) {
        if (!remoteIds.has(loc.id)) {
          if (!classId || loc.class_id === classId) {
            combined.push(loc);
          }
        }
      }
      return combined;
    }

    if (classId) {
      return localList.filter((h) => h.class_id === classId);
    }
    return localList;
  },

  async createHomework(payload: {
    class_id: string;
    teacher_id: string;
    subject_id: string;
    title: string;
    description?: string;
    due_at: string;
  }): Promise<Homework> {
    try {
      const { data, error } = await supabase
        .from('homeworks')
        .insert(payload)
        .select('id, class_id, teacher_id, subject_id, title, description, due_at, created_at, updated_at')
        .single();

      if (!error && data) {
        return data as Homework;
      }
    } catch {
      // Table might not exist yet; fallback to local persistence
    }

    const newHw: Homework = {
      id: 'hw-' + Math.random().toString(36).substring(2, 10),
      class_id: payload.class_id,
      teacher_id: payload.teacher_id,
      subject_id: payload.subject_id,
      title: payload.title,
      description: payload.description,
      due_at: payload.due_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = getStoredHomeworks();
    current.unshift(newHw);
    saveStoredHomeworks(current);
    return newHw;
  },

  async getSubmissions(homeworkId: string): Promise<HomeworkSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select(`
          id, homework_id, student_id, content, submitted_at, grade, teacher_feedback, status, created_at, updated_at,
          profiles:student_id(*)
        `)
        .eq('homework_id', homeworkId)
        .order('submitted_at', { ascending: false });

      if (!error && data) {
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
          student: row.profiles,
        }));
      }
    } catch {
      // Fall through to local storage
    }

    const stored = getStoredSubmissions();
    return stored.filter((s) => s.homework_id === homeworkId);
  },

  async getStudentSubmissions(studentId: string): Promise<HomeworkSubmission[]> {
    try {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('id, homework_id, student_id, content, submitted_at, grade, teacher_feedback, status, created_at, updated_at')
        .eq('student_id', studentId);

      if (!error && data) {
        return data as HomeworkSubmission[];
      }
    } catch {
      // Gracefully handle schema cache / table missing
    }

    const stored = getStoredSubmissions();
    return stored.filter((s) => s.student_id === studentId);
  },

  async submitHomework(homeworkId: string, studentId: string, content: string): Promise<void> {
    let remoteSucceeded = false;
    try {
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

      if (!error) {
        remoteSucceeded = true;
      }
    } catch {
      // Table missing or remote unavailable
    }

    // Always keep local storage consistent for instant client-side reactivity
    const stored = getStoredSubmissions();
    const existingIndex = stored.findIndex(
      (s) => s.homework_id === homeworkId && s.student_id === studentId
    );

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      stored[existingIndex] = {
        ...stored[existingIndex],
        content,
        submitted_at: now,
        status: 'submitted',
        updated_at: now,
      };
    } else {
      stored.unshift({
        id: 'sub-' + Math.random().toString(36).substring(2, 10),
        homework_id: homeworkId,
        student_id: studentId,
        content,
        submitted_at: now,
        status: 'submitted',
        created_at: now,
        updated_at: now,
      });
    }

    saveStoredSubmissions(stored);
  },

  async gradeSubmission(
    submissionId: string,
    grade: number,
    feedback?: string
  ): Promise<void> {
    try {
      await supabase
        .from('homework_submissions')
        .update({
          grade,
          teacher_feedback: feedback || null,
          status: 'graded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    } catch {
      // Update local storage
    }

    const stored = getStoredSubmissions();
    const idx = stored.findIndex((s) => s.id === submissionId);
    if (idx >= 0) {
      stored[idx] = {
        ...stored[idx],
        grade,
        teacher_feedback: feedback || null,
        status: 'graded',
        updated_at: new Date().toISOString(),
      };
      saveStoredSubmissions(stored);
    }
  },
};
