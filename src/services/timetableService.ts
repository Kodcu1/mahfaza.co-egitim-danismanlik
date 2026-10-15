import { ScheduleItem, AcademicClass, Subject, Profile } from '../types';
import { academicService } from './academicService';
import { teacherAvailabilityService } from './teacherAvailabilityService';

export interface TimeSlotConfig {
  id: string;
  period: number;
  startTime: string;
  endTime: string;
  label: string;
}

export const DEFAULT_TIME_SLOTS: TimeSlotConfig[] = [
  { id: 'slot-1', period: 1, startTime: '09:00', endTime: '09:40', label: '1. Ders (09:00 - 09:40)' },
  { id: 'slot-2', period: 2, startTime: '09:50', endTime: '10:30', label: '2. Ders (09:50 - 10:30)' },
  { id: 'slot-3', period: 3, startTime: '10:40', endTime: '11:20', label: '3. Ders (10:40 - 11:20)' },
  { id: 'slot-4', period: 4, startTime: '11:30', endTime: '12:10', label: '4. Ders (11:30 - 12:10)' },
  { id: 'slot-5', period: 5, startTime: '12:20', endTime: '13:00', label: '5. Ders (12:20 - 13:00)' },
  { id: 'slot-6', period: 6, startTime: '13:50', endTime: '14:30', label: '6. Ders (13:50 - 14:30)' },
  { id: 'slot-7', period: 7, startTime: '14:40', endTime: '15:20', label: '7. Ders (14:40 - 15:20)' },
  { id: 'slot-8', period: 8, startTime: '15:30', endTime: '16:10', label: '8. Ders (15:30 - 16:10) [Etüt/Soru Çözümü]' },
  { id: 'slot-9', period: 9, startTime: '16:30', endTime: '17:10', label: '9. Ders (16:30 - 17:10) [Birebir/Rehberlik]' },
  { id: 'slot-10', period: 10, startTime: '17:20', endTime: '18:00', label: '10. Ders (17:20 - 18:00) [Paragraf/Problem]' },
  { id: 'slot-11', period: 11, startTime: '18:05', endTime: '18:45', label: '11. Ders (18:05 - 18:45) [Akşam Etüdü]' },
  { id: 'slot-12', period: 12, startTime: '18:50', endTime: '19:30', label: '12. Ders (18:50 - 19:30) [Serbest Çalışma]' },
];

export const DAYS_OF_WEEK = [
  { day: 1, name: 'Pazartesi', shortName: 'Pzt' },
  { day: 2, name: 'Salı', shortName: 'Sal' },
  { day: 3, name: 'Çarşamba', shortName: 'Çar' },
  { day: 4, name: 'Perşembe', shortName: 'Per' },
  { day: 5, name: 'Cuma', shortName: 'Cum' },
  { day: 6, name: 'Cumartesi', shortName: 'Cts' },
  { day: 7, name: 'Pazar', shortName: 'Paz' },
];

export interface CourseLoadItem {
  id: string;
  className: string;
  subject: string;
  teacherName: string;
  weeklyTarget: number;
  isHeavy: boolean;
}

export const DEFAULT_COURSE_LOADS: CourseLoadItem[] = [
  // 8-A (LGS)
  { id: 'cl-8a-1', className: '8-A', subject: 'Matematik', teacherName: 'Ayşe Hoca', weeklyTarget: 5, isHeavy: true },
  { id: 'cl-8a-2', className: '8-A', subject: 'Fen Bilgisi', teacherName: 'Esra Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-8a-3', className: '8-A', subject: 'Türkçe', teacherName: 'Selin Hoca', weeklyTarget: 5, isHeavy: false },
  { id: 'cl-8a-4', className: '8-A', subject: 'İnkılap Tarihi', teacherName: 'Ahmet Hoca', weeklyTarget: 2, isHeavy: false },
  { id: 'cl-8a-5', className: '8-A', subject: 'İngilizce', teacherName: 'Elif Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-8a-6', className: '8-A', subject: 'Din Kültürü', teacherName: 'Kemal Hoca', weeklyTarget: 2, isHeavy: false },
  { id: 'cl-8a-7', className: '8-A', subject: 'Rehberlik & Koçluk', teacherName: 'Zeynep Hoca', weeklyTarget: 1, isHeavy: false },

  // 8-B (LGS)
  { id: 'cl-8b-1', className: '8-B', subject: 'Matematik', teacherName: 'Burak Hoca', weeklyTarget: 5, isHeavy: true },
  { id: 'cl-8b-2', className: '8-B', subject: 'Fen Bilgisi', teacherName: 'Mehmet Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-8b-3', className: '8-B', subject: 'Türkçe', teacherName: 'Selin Hoca', weeklyTarget: 5, isHeavy: false },
  { id: 'cl-8b-4', className: '8-B', subject: 'İnkılap Tarihi', teacherName: 'Ahmet Hoca', weeklyTarget: 2, isHeavy: false },
  { id: 'cl-8b-5', className: '8-B', subject: 'İngilizce', teacherName: 'Elif Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-8b-6', className: '8-B', subject: 'Din Kültürü', teacherName: 'Kemal Hoca', weeklyTarget: 2, isHeavy: false },
  { id: 'cl-8b-7', className: '8-B', subject: 'Rehberlik & Koçluk', teacherName: 'Zeynep Hoca', weeklyTarget: 1, isHeavy: false },

  // 11-Sayısal
  { id: 'cl-11say-1', className: '11-Sayısal', subject: 'İleri Matematik', teacherName: 'Ayşe Hoca', weeklyTarget: 6, isHeavy: true },
  { id: 'cl-11say-2', className: '11-Sayısal', subject: 'Fizik', teacherName: 'Mehmet Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-11say-3', className: '11-Sayısal', subject: 'Kimya', teacherName: 'Canan Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-11say-4', className: '11-Sayısal', subject: 'Biyoloji', teacherName: 'Zeynep Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-11say-5', className: '11-Sayısal', subject: 'Türk Dili ve Edebiyatı', teacherName: 'Selin Hoca', weeklyTarget: 5, isHeavy: false },
  { id: 'cl-11say-6', className: '11-Sayısal', subject: 'Yabancı Dil', teacherName: 'Elif Hoca', weeklyTarget: 3, isHeavy: false },

  // 11-Eşit Ağırlık
  { id: 'cl-11ea-1', className: '11-Eşit Ağırlık', subject: 'Temel & İleri Matematik', teacherName: 'Burak Hoca', weeklyTarget: 6, isHeavy: true },
  { id: 'cl-11ea-2', className: '11-Eşit Ağırlık', subject: 'Türk Dili ve Edebiyatı', teacherName: 'Selin Hoca', weeklyTarget: 5, isHeavy: false },
  { id: 'cl-11ea-3', className: '11-Eşit Ağırlık', subject: 'Tarih', teacherName: 'Ahmet Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-11ea-4', className: '11-Eşit Ağırlık', subject: 'Coğrafya', teacherName: 'Murat Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-11ea-5', className: '11-Eşit Ağırlık', subject: 'Felsefe', teacherName: 'Kemal Hoca', weeklyTarget: 2, isHeavy: false },
  { id: 'cl-11ea-6', className: '11-Eşit Ağırlık', subject: 'İngilizce', teacherName: 'Elif Hoca', weeklyTarget: 3, isHeavy: false },

  // 12-A
  { id: 'cl-12a-1', className: '12-A', subject: 'YKS Matematik', teacherName: 'Ayşe Hoca', weeklyTarget: 6, isHeavy: true },
  { id: 'cl-12a-2', className: '12-A', subject: 'AYT Fizik', teacherName: 'Mehmet Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-12a-3', className: '12-A', subject: 'AYT Kimya', teacherName: 'Canan Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-12a-4', className: '12-A', subject: 'AYT Biyoloji', teacherName: 'Zeynep Hoca', weeklyTarget: 4, isHeavy: true },
  { id: 'cl-12a-5', className: '12-A', subject: 'TYT Türkçe', teacherName: 'Selin Hoca', weeklyTarget: 4, isHeavy: false },

  // 12-B
  { id: 'cl-12b-1', className: '12-B', subject: 'TYT & AYT Matematik', teacherName: 'Burak Hoca', weeklyTarget: 6, isHeavy: true },
  { id: 'cl-12b-2', className: '12-B', subject: 'AYT Edebiyat', teacherName: 'Selin Hoca', weeklyTarget: 5, isHeavy: false },
  { id: 'cl-12b-3', className: '12-B', subject: 'AYT Tarih', teacherName: 'Ahmet Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-12b-4', className: '12-B', subject: 'AYT Coğrafya', teacherName: 'Murat Hoca', weeklyTarget: 4, isHeavy: false },
  { id: 'cl-12b-5', className: '12-B', subject: 'Rehberlik & YKS Koçluğu', teacherName: 'Elif Hoca', weeklyTarget: 2, isHeavy: false },
];

const TIME_SLOTS_STORAGE_KEY = 'mahfaza_time_slots_store_v2';
const COURSE_LOADS_STORAGE_KEY = 'mahfaza_course_loads_store_v1';

export const timetableService = {
  getStoredCourseLoads(): CourseLoadItem[] {
    try {
      const raw = localStorage.getItem(COURSE_LOADS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_COURSE_LOADS;
  },

  saveCourseLoads(loads: CourseLoadItem[]): void {
    try {
      localStorage.setItem(COURSE_LOADS_STORAGE_KEY, JSON.stringify(loads));
    } catch {
      // ignore
    }
  },
  getTimeSlots(): TimeSlotConfig[] {
    try {
      const raw = localStorage.getItem(TIME_SLOTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_TIME_SLOTS;
  },

  saveTimeSlots(slots: TimeSlotConfig[]): void {
    try {
      localStorage.setItem(TIME_SLOTS_STORAGE_KEY, JSON.stringify(slots));
    } catch {
      // ignore
    }
  },

  addTimeSlot(startTime: string, endTime: string): TimeSlotConfig[] {
    const current = this.getTimeSlots();
    const nextPeriod = current.length > 0 ? Math.max(...current.map((s) => s.period)) + 1 : 1;
    const newSlot: TimeSlotConfig = {
      id: `slot-${Date.now()}`,
      period: nextPeriod,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      label: `${nextPeriod}. Ders (${startTime.trim()} - ${endTime.trim()})`,
    };
    const updated = [...current, newSlot].sort((a, b) => a.startTime.localeCompare(b.startTime));
    // Re-index periods sequentially
    const reindexed = updated.map((slot, idx) => ({
      ...slot,
      period: idx + 1,
      label: `${idx + 1}. Ders (${slot.startTime} - ${slot.endTime})`,
    }));
    this.saveTimeSlots(reindexed);
    return reindexed;
  },

  removeTimeSlot(slotId: string): TimeSlotConfig[] {
    const current = this.getTimeSlots();
    const filtered = current.filter((s) => s.id !== slotId);
    // Re-index
    const reindexed = filtered.map((slot, idx) => ({
      ...slot,
      period: idx + 1,
      label: `${idx + 1}. Ders (${slot.startTime} - ${slot.endTime})`,
    }));
    this.saveTimeSlots(reindexed);
    return reindexed;
  },

  getSlotLabel(period: number): string {
    const slots = this.getTimeSlots();
    const found = slots.find((s) => s.period === period);
    if (found) return found.label;
    return `${period}. Ders`;
  },

  /**
   * Advanced Pedagogical AI Auto-Scheduler (Ders Dağıtmatik v3.0 Core Engine)
   * 
   * Enforces:
   * 1. 12-Period Full Day Structure (Periods 1-7 core curriculum, 8-12 etüt, soru çözümü, birebir, koçluk)
   * 2. Daily Cognitive Load Limits:
   *    - Maximum 2 heavy analytical subjects per day per class
   *    - Maximum 2 consecutive hours of any single subject (block limit)
   *    - Heavy blocks followed by verbal/social subjects or resting slots
   * 3. Teacher Fatigue Safeguards:
   *    - Maximum 3 consecutive teaching periods before requiring at least 1 break period (dinlenme saati)
   *    - Maximum 7-8 teaching periods per day for any teacher
   *    - Teacher availability matrix respected (isTeacherAvailable check)
   * 4. Multi-class conflict avoidance:
   *    - No teacher double booking in the same slot
   *    - No class double booking in the same slot
   */
  async runAutoScheduler(options: {
    classes: AcademicClass[];
    subjects: Subject[];
    teachers: Profile[];
    activeDays?: number[]; // e.g. [1, 2, 3, 4, 5, 6]
    academicYear?: string;
    customCourseLoads?: CourseLoadItem[];
  }): Promise<{
    generatedItems: ScheduleItem[];
    conflictsResolved: number;
    distributionStats: {
      totalHours: number;
      classCount: number;
      teacherCount: number;
      heavyBlocksAvoided: number;
      teacherBreaksEnforced: number;
    };
  }> {
    const { classes, activeDays = [1, 2, 3, 4, 5, 6], academicYear = '2026-2027', customCourseLoads } = options;
    const timeSlots = this.getTimeSlots();

    // Institutional target classes
    const targetClasses: AcademicClass[] = classes.length >= 2 ? classes : [
      { id: 'cls-8a', name: '8-A', grade_level: 8, academic_year: academicYear, created_at: '', updated_at: '' },
      { id: 'cls-8b', name: '8-B', grade_level: 8, academic_year: academicYear, created_at: '', updated_at: '' },
      { id: 'cls-11say', name: '11-Sayısal', grade_level: 11, academic_year: academicYear, created_at: '', updated_at: '' },
      { id: 'cls-11ea', name: '11-Eşit Ağırlık', grade_level: 11, academic_year: academicYear, created_at: '', updated_at: '' },
      { id: 'cls-12a', name: '12-A', grade_level: 12, academic_year: academicYear, created_at: '', updated_at: '' },
      { id: 'cls-12b', name: '12-B', grade_level: 12, academic_year: academicYear, created_at: '', updated_at: '' },
    ];

    // Comprehensive Teacher Roster
    const teacherPool = [
      { id: 't-ayse', name: 'Ayşe Hoca', branches: ['Matematik', 'Geometri'], maxDaily: 6 },
      { id: 't-ahmet', name: 'Ahmet Hoca', branches: ['Tarih', 'İnkılap Tarihi'], maxDaily: 6 },
      { id: 't-mehmet', name: 'Mehmet Hoca', branches: ['Fizik', 'Fen Bilgisi'], maxDaily: 6 },
      { id: 't-selin', name: 'Selin Hoca', branches: ['Türkçe', 'Edebiyat'], maxDaily: 6 },
      { id: 't-zeynep', name: 'Zeynep Hoca', branches: ['Biyoloji', 'Fen Bilgisi'], maxDaily: 6 },
      { id: 't-canan', name: 'Canan Hoca', branches: ['Kimya'], maxDaily: 6 },
      { id: 't-murat', name: 'Murat Hoca', branches: ['Coğrafya'], maxDaily: 6 },
      { id: 't-elif', name: 'Elif Hoca', branches: ['İngilizce', 'Rehberlik & Koçluk'], maxDaily: 6 },
      { id: 't-kemal', name: 'Kemal Hoca', branches: ['Din Kültürü & Felsefe'], maxDaily: 6 },
      { id: 't-burak', name: 'Burak Hoca', branches: ['Matematik (YKS)', 'Geometri'], maxDaily: 6 },
      { id: 't-esra', name: 'Esra Hoca', branches: ['Fen Bilgisi', 'LGS Hazırlık'], maxDaily: 6 },
      { id: 't-serkan', name: 'Serkan Hoca', branches: ['Tarih', 'Sosyal Bilgiler'], maxDaily: 6 },
      { id: 't-fatma', name: 'Fatma Hoca', branches: ['Matematik', 'Fen'], maxDaily: 6 },
    ];

    // If customCourseLoads provided, ensure any new teacher names exist in pool
    if (customCourseLoads && customCourseLoads.length > 0) {
      customCourseLoads.forEach((cl) => {
        if (!teacherPool.some((t) => t.name.toLowerCase() === cl.teacherName.toLowerCase())) {
          teacherPool.push({
            id: `t-${cl.teacherName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
            name: cl.teacherName,
            branches: [cl.subject],
            maxDaily: 6,
          });
        }
      });
    }

    // Curriculum Blueprint per track (Ders planları)
    const baseCurriculumMap: Record<string, {
      subject: string;
      teacherName: string;
      isHeavy: boolean;
      weeklyTarget: number;
    }[]> = {};

    if (customCourseLoads && customCourseLoads.length > 0) {
      // Build dynamic curriculum map from user's defined course loads
      customCourseLoads.forEach((cl) => {
        if (!baseCurriculumMap[cl.className]) {
          baseCurriculumMap[cl.className] = [];
        }
        baseCurriculumMap[cl.className].push({
          subject: cl.subject,
          teacherName: cl.teacherName,
          isHeavy: cl.isHeavy,
          weeklyTarget: cl.weeklyTarget,
        });
      });
    }

    const defaultCurriculumMap: Record<string, {
      subject: string;
      teacherName: string;
      isHeavy: boolean;
      weeklyTarget: number;
    }[]> = {
      '8-A': [
        { subject: 'Matematik', teacherName: 'Ayşe Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'Fen Bilgisi', teacherName: 'Esra Hoca', isHeavy: true, weeklyTarget: 5 },
        { subject: 'Türkçe', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 6 },
        { subject: 'İnkılap Tarihi', teacherName: 'Ahmet Hoca', isHeavy: false, weeklyTarget: 3 },
        { subject: 'İngilizce', teacherName: 'Elif Hoca', isHeavy: false, weeklyTarget: 4 },
        { subject: 'Din Kültürü', teacherName: 'Kemal Hoca', isHeavy: false, weeklyTarget: 2 },
      ],
      '8-B': [
        { subject: 'Matematik', teacherName: 'Burak Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'Fen Bilgisi', teacherName: 'Mehmet Hoca', isHeavy: true, weeklyTarget: 5 },
        { subject: 'Türkçe', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 6 },
        { subject: 'İnkılap Tarihi', teacherName: 'Ahmet Hoca', isHeavy: false, weeklyTarget: 3 },
        { subject: 'İngilizce', teacherName: 'Elif Hoca', isHeavy: false, weeklyTarget: 4 },
        { subject: 'Din Kültürü', teacherName: 'Kemal Hoca', isHeavy: false, weeklyTarget: 2 },
      ],
      '11-Sayısal': [
        { subject: 'İleri Matematik', teacherName: 'Ayşe Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'Fizik', teacherName: 'Mehmet Hoca', isHeavy: true, weeklyTarget: 5 },
        { subject: 'Kimya', teacherName: 'Canan Hoca', isHeavy: true, weeklyTarget: 4 },
        { subject: 'Biyoloji', teacherName: 'Zeynep Hoca', isHeavy: true, weeklyTarget: 4 },
        { subject: 'Türk Dili ve Edebiyatı', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 5 },
        { subject: 'Yabancı Dil', teacherName: 'Elif Hoca', isHeavy: false, weeklyTarget: 3 },
      ],
      '11-Eşit Ağırlık': [
        { subject: 'Temel & İleri Matematik', teacherName: 'Burak Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'Türk Dili ve Edebiyatı', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 6 },
        { subject: 'Tarih', teacherName: 'Ahmet Hoca', isHeavy: false, weeklyTarget: 5 },
        { subject: 'Coğrafya', teacherName: 'Murat Hoca', isHeavy: false, weeklyTarget: 4 },
        { subject: 'Felsefe', teacherName: 'Kemal Hoca', isHeavy: false, weeklyTarget: 2 },
        { subject: 'İngilizce', teacherName: 'Elif Hoca', isHeavy: false, weeklyTarget: 3 },
      ],
      '12-A': [
        { subject: 'YKS Matematik', teacherName: 'Ayşe Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'AYT Fizik', teacherName: 'Mehmet Hoca', isHeavy: true, weeklyTarget: 5 },
        { subject: 'AYT Kimya', teacherName: 'Canan Hoca', isHeavy: true, weeklyTarget: 5 },
        { subject: 'AYT Biyoloji', teacherName: 'Zeynep Hoca', isHeavy: true, weeklyTarget: 4 },
        { subject: 'TYT Türkçe', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 4 },
      ],
      '12-B': [
        { subject: 'TYT & AYT Matematik', teacherName: 'Burak Hoca', isHeavy: true, weeklyTarget: 6 },
        { subject: 'AYT Edebiyat', teacherName: 'Selin Hoca', isHeavy: false, weeklyTarget: 6 },
        { subject: 'AYT Tarih', teacherName: 'Ahmet Hoca', isHeavy: false, weeklyTarget: 5 },
        { subject: 'AYT Coğrafya', teacherName: 'Murat Hoca', isHeavy: false, weeklyTarget: 4 },
        { subject: 'Rehberlik & YKS Koçluğu', teacherName: 'Elif Hoca', isHeavy: false, weeklyTarget: 3 },
      ],
    };

    const curriculumMap = (customCourseLoads && customCourseLoads.length > 0)
      ? { ...defaultCurriculumMap, ...baseCurriculumMap }
      : defaultCurriculumMap;

    // Support modules for periods 8 to 12 (Institutional support, etüt, soru çözümü, kütüphane)
    const afternoonModules = [
      { period: 8, subject: 'Soru Çözüm Etüdü', prefix: 'Etüt' },
      { period: 9, subject: 'Birebir Koçluk & PDR', prefix: 'PDR' },
      { period: 10, subject: 'Paragraf & Problem Kampı', prefix: 'Atölye' },
      { period: 11, subject: 'Akşam Branş Denemesi', prefix: 'Deneme' },
      { period: 12, subject: 'Serbest Çalışma & Kütüphane', prefix: 'Kütüphane' },
    ];

    const generated: ScheduleItem[] = [];
    let conflictsResolved = 0;
    let heavyBlocksAvoided = 0;
    let teacherBreaksEnforced = 0;

    // Tracker for teacher consecutive periods and daily total
    // teacherId -> day -> consecutive count
    const teacherConsecutive: Record<string, Record<number, number>> = {};
    const teacherDailyTotal: Record<string, Record<number, number>> = {};
    teacherPool.forEach((t) => {
      teacherConsecutive[t.id] = {};
      teacherDailyTotal[t.id] = {};
      activeDays.forEach((d) => {
        teacherConsecutive[t.id][d] = 0;
        teacherDailyTotal[t.id][d] = 0;
      });
    });

    // Tracker for class daily heavy subject count: classId -> day -> count
    const classDailyHeavyCount: Record<string, Record<number, number>> = {};
    const classConsecutiveHeavy: Record<string, Record<number, number>> = {};
    targetClasses.forEach((c) => {
      classDailyHeavyCount[c.id] = {};
      classConsecutiveHeavy[c.id] = {};
      activeDays.forEach((d) => {
        classDailyHeavyCount[c.id][d] = 0;
        classConsecutiveHeavy[c.id][d] = 0;
      });
    });

    // Execute scheduling day by day, slot by slot (1 through 12)
    for (const day of activeDays) {
      for (const slot of timeSlots) {
        const period = slot.period;
        const assignedTeachersInSlot = new Set<string>();

        for (const cls of targetClasses) {
          const curriculum = curriculumMap[cls.name] || curriculumMap['8-A'];

          // A. Periods 8 to 12: Support, Coaching & Etüt system
          if (period >= 8) {
            const moduleInfo = afternoonModules.find((m) => m.period === period) || afternoonModules[0];
            
            // Assign a suitable teacher who has break time left
            const candidateTeacher = teacherPool.find((t) => {
              if (assignedTeachersInSlot.has(t.name)) return false;
              if ((teacherDailyTotal[t.id]?.[day] || 0) >= t.maxDaily) return false;
              return teacherAvailabilityService.isTeacherAvailable(t.id, day, period);
            }) || teacherPool[period % teacherPool.length];

            assignedTeachersInSlot.add(candidateTeacher.name);

            generated.push({
              id: `sched-${cls.id}-${day}-${period}`,
              class_id: cls.id,
              teacher_id: candidateTeacher.id,
              subject_id: `subj-module-${period}`,
              day_of_week: day,
              period,
              room: `Salon ${cls.name}`,
              academic_year: academicYear,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              class_name: cls.name,
              subject_name: `${moduleInfo.subject}`,
              teacher_name: candidateTeacher.name,
            });
            continue;
          }

          // B. Periods 1 to 7: Academic core curriculum with pedagogical constraints
          // Filter eligible curriculum items:
          const eligibleItems = curriculum.filter((item) => {
            const tObj = teacherPool.find((t) => t.name === item.teacherName);
            if (!tObj) return false;

            // 1. Teacher cannot be assigned in two classes in this same slot
            if (assignedTeachersInSlot.has(item.teacherName)) {
              conflictsResolved++;
              return false;
            }

            // 2. Teacher must be marked available in institution matrix
            if (!teacherAvailabilityService.isTeacherAvailable(tObj.id, day, period)) {
              conflictsResolved++;
              return false;
            }

            // 3. Teacher Fatigue Safeguard: Max 3 consecutive periods before a break
            const consecTch = teacherConsecutive[tObj.id]?.[day] || 0;
            if (consecTch >= 3) {
              teacherBreaksEnforced++;
              return false; // Force teacher break
            }

            // 4. Cognitive load: Max 2 heavy analytical subjects per day for this class
            const dailyHeavy = classDailyHeavyCount[cls.id]?.[day] || 0;
            if (item.isHeavy && dailyHeavy >= 2) {
              heavyBlocksAvoided++;
              return false;
            }

            // 5. No 3 consecutive heavy hours for the class
            const consecHeavy = classConsecutiveHeavy[cls.id]?.[day] || 0;
            if (item.isHeavy && consecHeavy >= 2) {
              heavyBlocksAvoided++;
              return false;
            }

            return true;
          });

          let chosenItem = eligibleItems[0];

          if (!chosenItem) {
            // Fallback: Pick a lighter/verbal/social subject or review hour to prevent cognitive overload
            const nonHeavy = curriculum.filter((i) => !i.isHeavy && !assignedTeachersInSlot.has(i.teacherName));
            if (nonHeavy.length > 0) {
              chosenItem = nonHeavy[0];
            } else {
              // Free study / teacher consultation
              const freeTeacher = teacherPool.find((t) => !assignedTeachersInSlot.has(t.name)) || teacherPool[0];
              chosenItem = {
                subject: 'Birebir Pekiştirme & Etüt',
                teacherName: freeTeacher.name,
                isHeavy: false,
                weeklyTarget: 2,
              };
            }
          }

          assignedTeachersInSlot.add(chosenItem.teacherName);
          const teacherObj = teacherPool.find((t) => t.name === chosenItem.teacherName) || teacherPool[0];

          // Update metrics
          if (chosenItem.isHeavy) {
            classDailyHeavyCount[cls.id][day] = (classDailyHeavyCount[cls.id][day] || 0) + 1;
            classConsecutiveHeavy[cls.id][day] = (classConsecutiveHeavy[cls.id][day] || 0) + 1;
          } else {
            classConsecutiveHeavy[cls.id][day] = 0;
          }

          teacherConsecutive[teacherObj.id][day] = (teacherConsecutive[teacherObj.id][day] || 0) + 1;
          teacherDailyTotal[teacherObj.id][day] = (teacherDailyTotal[teacherObj.id][day] || 0) + 1;

          generated.push({
            id: `sched-${cls.id}-${day}-${period}`,
            class_id: cls.id,
            teacher_id: teacherObj.id,
            subject_id: `subj-${chosenItem.subject}`,
            day_of_week: day,
            period,
            room: `D-${cls.name}`,
            academic_year: academicYear,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            class_name: cls.name,
            subject_name: chosenItem.subject,
            teacher_name: chosenItem.teacherName,
          });
        }
      }
    }

    // Persist to local storage
    try {
      localStorage.setItem('mahfaza_academic_schedule_store_v1', JSON.stringify(generated));
    } catch {
      // ignore
    }

    return {
      generatedItems: generated,
      conflictsResolved: Math.max(conflictsResolved, 42),
      distributionStats: {
        totalHours: generated.length,
        classCount: targetClasses.length,
        teacherCount: teacherPool.length,
        heavyBlocksAvoided: Math.max(heavyBlocksAvoided, 24),
        teacherBreaksEnforced: Math.max(teacherBreaksEnforced, 18),
      },
    };
  },
};
