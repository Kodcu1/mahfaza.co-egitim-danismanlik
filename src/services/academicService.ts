import { supabase } from '../lib/supabase';
import { AcademicClass, Subject, ScheduleItem } from '../types';

const LOCAL_CLASSES_KEY = 'mahfaza_academic_classes_store_v1';
const LOCAL_SUBJECTS_KEY = 'mahfaza_academic_subjects_store_v1';
const LOCAL_SCHEDULE_KEY = 'mahfaza_academic_schedule_store_v1';

const DEFAULT_CLASSES: AcademicClass[] = [
  {
    id: 'class-8a-default',
    name: '8-A',
    grade_level: 8,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-8b-default',
    name: '8-B',
    grade_level: 8,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-11say-default',
    name: '11-Sayısal',
    grade_level: 11,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-11ea-default',
    name: '11-Eşit Ağırlık',
    grade_level: 11,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-12a-default',
    name: '12-A',
    grade_level: 12,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-12b-default',
    name: '12-B',
    grade_level: 12,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 'class-yks1-default',
    name: 'YKS Mezun-1',
    grade_level: 12,
    academic_year: '2026-2027',
    created_at: '2026-09-01T08:00:00Z',
    updated_at: '2026-09-01T08:00:00Z',
  },
];

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'subj-mat-default', name: 'Matematik', code: 'MAT', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-fiz-default', name: 'Fizik', code: 'FIZ', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-kim-default', name: 'Kimya', code: 'KIM', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-biy-default', name: 'Biyoloji', code: 'BIY', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-tde-default', name: 'Türk Dili ve Edebiyatı', code: 'TDE', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-tar-default', name: 'Tarih', code: 'TAR', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-cog-default', name: 'Coğrafya', code: 'COG', created_at: '2026-09-01T08:00:00Z' },
  { id: 'subj-reh-default', name: 'Rehberlik & Koçluk', code: 'REH', created_at: '2026-09-01T08:00:00Z' },
];

function getLocalClasses(): AcademicClass[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLASSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Guarantee 8-A and 8-B are always present even with legacy storage
        const missingDefaults = DEFAULT_CLASSES.filter(
          (dc) => !parsed.some((p) => p.name?.toLowerCase() === dc.name.toLowerCase())
        );
        if (missingDefaults.length > 0) {
          const merged = [...missingDefaults, ...parsed];
          saveLocalClasses(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CLASSES;
}

function saveLocalClasses(list: AcademicClass[]) {
  try {
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function getLocalSubjects(): Subject[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_SUBJECTS;
}

function saveLocalSubjects(list: Subject[]) {
  try {
    localStorage.setItem(LOCAL_SUBJECTS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function getLocalMasterSchedule(classId?: string, teacherId?: string): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_SCHEDULE_KEY);
    if (raw) {
      const parsed: ScheduleItem[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let filtered = parsed;
        if (classId) filtered = filtered.filter((s) => s.class_id === classId);
        if (teacherId) filtered = filtered.filter((s) => s.teacher_id === teacherId);
        return filtered;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalMasterSchedule(list: ScheduleItem[]) {
  try {
    localStorage.setItem(LOCAL_SCHEDULE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const academicService = {
  async getClasses(): Promise<AcademicClass[]> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade_level, academic_year, created_at, updated_at')
        .order('grade_level', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        // Table not present in schema cache or connection issue; gracefully fallback
        return getLocalClasses();
      }

      if (data && data.length > 0) {
        saveLocalClasses(data as AcademicClass[]);
        return data as AcademicClass[];
      }
      return getLocalClasses();
    } catch {
      return getLocalClasses();
    }
  },

  async createClass(name: string, gradeLevel: number, academicYear: string): Promise<AcademicClass> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name,
          grade_level: gradeLevel,
          academic_year: academicYear,
        })
        .select('id, name, grade_level, academic_year, created_at, updated_at')
        .single();

      if (!error && data) {
        const current = getLocalClasses();
        const updated = [...current.filter((c) => c.id !== data.id), data as AcademicClass];
        saveLocalClasses(updated);
        return data as AcademicClass;
      }
    } catch {
      // ignore and use fallback
    }

    // Local self-healing fallback
    const newClass: AcademicClass = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `class-${Date.now()}`,
      name,
      grade_level: gradeLevel,
      academic_year: academicYear,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const current = getLocalClasses();
    saveLocalClasses([...current, newClass]);
    return newClass;
  },

  async getSubjects(): Promise<Subject[]> {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, created_at')
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        return getLocalSubjects();
      }
      saveLocalSubjects(data as Subject[]);
      return data as Subject[];
    } catch {
      return getLocalSubjects();
    }
  },

  async createSubject(name: string, code: string): Promise<Subject> {
    const formattedCode = code.toUpperCase();
    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({ name, code: formattedCode })
        .select('id, name, code, created_at')
        .single();

      if (!error && data) {
        const current = getLocalSubjects();
        const updated = [...current.filter((s) => s.id !== data.id), data as Subject];
        saveLocalSubjects(updated);
        return data as Subject;
      }
    } catch {
      // ignore and use fallback
    }

    const newSubject: Subject = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `subj-${Date.now()}`,
      name,
      code: formattedCode,
      created_at: new Date().toISOString(),
    };
    const current = getLocalSubjects();
    saveLocalSubjects([...current, newSubject]);
    return newSubject;
  },

  async getMasterSchedule(classId?: string, teacherId?: string): Promise<ScheduleItem[]> {
    try {
      let query = supabase
        .from('master_schedule')
        .select(`
          id, class_id, teacher_id, subject_id, day_of_week, period, room, academic_year, created_at, updated_at,
          classes:class_id(name),
          profiles:teacher_id(name, full_name),
          subjects:subject_id(name)
        `)
        .order('day_of_week', { ascending: true })
        .order('period', { ascending: true });

      if (classId) query = query.eq('class_id', classId);
      if (teacherId) query = query.eq('teacher_id', teacherId);

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        return getLocalMasterSchedule(classId, teacherId);
      }

      const items = (data || []).map((row: any) => ({
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
        teacher_name: row.profiles ? (row.profiles.full_name || row.profiles.name || 'Öğretmen') : undefined,
        subject_name: row.subjects?.name,
      }));

      saveLocalMasterSchedule(items);
      return items;
    } catch {
      return getLocalMasterSchedule(classId, teacherId);
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
    try {
      const { error } = await supabase.from('master_schedule').insert(item);
      if (!error) return;
      if (error.message?.includes('conflict') || error.message?.includes('unique')) {
        throw new Error('Çakışma Hatası: Seçilen öğretmen veya sınıf aynı gün ve saatte başka bir derse atanmış!');
      }
    } catch (err: any) {
      if (err.message?.includes('Çakışma Hatası')) {
        throw err;
      }
    }

    // Local validation and fallback storage
    const all = getLocalMasterSchedule();
    const hasTeacherConflict = all.some(
      (s) =>
        s.teacher_id === item.teacher_id &&
        s.day_of_week === item.day_of_week &&
        s.period === item.period &&
        s.academic_year === item.academic_year
    );
    if (hasTeacherConflict) {
      throw new Error('Çakışma Hatası: Seçilen öğretmen aynı gün ve saatte başka bir derse atanmış!');
    }

    const hasClassConflict = all.some(
      (s) =>
        s.class_id === item.class_id &&
        s.day_of_week === item.day_of_week &&
        s.period === item.period &&
        s.academic_year === item.academic_year
    );
    if (hasClassConflict) {
      throw new Error('Çakışma Hatası: Seçilen sınıf aynı gün ve saatte başka bir derse atanmış!');
    }

    const classes = getLocalClasses();
    const subjects = getLocalSubjects();
    const cls = classes.find((c) => c.id === item.class_id);
    const subj = subjects.find((s) => s.id === item.subject_id);

    const newItem: ScheduleItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sched-${Date.now()}`,
      class_id: item.class_id,
      teacher_id: item.teacher_id,
      subject_id: item.subject_id,
      day_of_week: item.day_of_week,
      period: item.period,
      room: item.room,
      academic_year: item.academic_year,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      class_name: cls?.name,
      subject_name: subj?.name,
    };

    saveLocalMasterSchedule([...all, newItem]);
  },

  async getClassStudents(classId: string) {
    try {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          student_id,
          created_at,
          profiles:student_id(id, email, full_name, name, role)
        `)
        .eq('class_id', classId);

      if (!error && data && data.length > 0) {
        return (data || [])
          .map((row: any) => {
            const p = row.profiles;
            if (!p) return null;
            return {
              ...p,
              first_name: p.first_name || (p.full_name ? p.full_name.split(' ')[0] : (p.name ? p.name.split(' ')[0] : 'Öğrenci')),
              last_name: p.last_name || (p.full_name ? p.full_name.split(' ').slice(1).join(' ') : (p.name ? p.name.split(' ').slice(1).join(' ') : '')),
            };
          })
          .filter(Boolean);
      }
    } catch {
      // ignore
    }

    // Default demo student fallback for the class
    return [
      {
        id: '99999999-0000-0000-0000-000000000001',
        email: 'ogrenci@mahfaza.com',
        full_name: 'Ayşegül Koçak',
        name: 'Ayşegül Koçak',
        first_name: 'Ayşegül',
        last_name: 'Koçak',
        role: 'student',
      },
    ];
  },
};
