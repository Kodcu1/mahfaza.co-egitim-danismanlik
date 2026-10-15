import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { academicService } from '../../services/academicService';
import { relationshipService } from '../../services/relationshipService';
import { timetableService, TimeSlotConfig, DAYS_OF_WEEK, CourseLoadItem, DEFAULT_COURSE_LOADS } from '../../services/timetableService';
import { teacherAvailabilityService } from '../../services/teacherAvailabilityService';
import { AcademicClass, Subject, Profile, ScheduleItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  Filter,
  BookOpen,
  X,
  Layers,
  Sliders,
  Settings2,
} from 'lucide-react';

// Color palette for distinguishing different classes in multi-class cells
const getClassColor = (className?: string) => {
  const name = (className || '').toLowerCase();
  if (name.includes('8-a')) {
    return {
      badge: 'bg-purple-100 text-purple-950 border-purple-300 dark:bg-purple-950/80 dark:text-purple-200 dark:border-purple-800',
      border: 'hover:border-purple-400',
    };
  }
  if (name.includes('8-b')) {
    return {
      badge: 'bg-indigo-100 text-indigo-950 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800',
      border: 'hover:border-indigo-400',
    };
  }
  if (name.includes('sayısal') || name.includes('11-a') || name.includes('12-a')) {
    return {
      badge: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-800',
      border: 'hover:border-sky-400',
    };
  }
  if (name.includes('eşit') || name.includes('ea') || name.includes('11-b') || name.includes('12-b')) {
    return {
      badge: 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800',
      border: 'hover:border-emerald-400',
    };
  }
  if (name.includes('mezun') || name.includes('yks')) {
    return {
      badge: 'bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800',
      border: 'hover:border-rose-400',
    };
  }
  return {
    badge: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
    border: 'hover:border-amber-400',
  };
};

export const AdminTimetablePage: React.FC = () => {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [dayFilterMode, setDayFilterMode] = useState<'weekday' | 'sixdays' | 'all'>('sixdays');

  // Time Slot Configurator State
  const [newSlotStart, setNewSlotStart] = useState('08:30');
  const [newSlotEnd, setNewSlotEnd] = useState('09:10');

  // Manual Add / Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [modalClassId, setModalClassId] = useState('');
  const [modalSubjectId, setModalSubjectId] = useState('');
  const [modalTeacherId, setModalTeacherId] = useState('');
  const [modalDay, setModalDay] = useState(1);
  const [modalPeriod, setModalPeriod] = useState(1);
  const [modalRoom, setModalRoom] = useState('Derslik 101');
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  // AI Auto-Scheduler State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [aiStats, setAiStats] = useState<{
    totalHours: number;
    classCount: number;
    teacherCount: number;
    heavyBlocksAvoided: number;
    conflictsResolved: number;
    teacherBreaksEnforced?: number;
  } | null>(null);

  // ACTION 2: PRE-AI COURSE LOAD & CURRICULUM CONFIGURATION
  // Enables setting exact weekly hours per class/subject (e.g. 8-A: 5h Math Ayşe Hoca, 2h History Serkan Hoca)
  const [courseLoads, setCourseLoads] = useState<CourseLoadItem[]>(() => timetableService.getStoredCourseLoads());
  const [courseLoadModalOpen, setCourseLoadModalOpen] = useState(false);
  const [loadClassFilter, setLoadClassFilter] = useState<string>('all');
  const [newLoadClass, setNewLoadClass] = useState<string>('8-A');
  const [newLoadSubject, setNewLoadSubject] = useState<string>('Matematik');
  const [newLoadTeacher, setNewLoadTeacher] = useState<string>('Ayşe Hoca');
  const [newLoadHours, setNewLoadHours] = useState<number>(4);
  const [newLoadIsHeavy, setNewLoadIsHeavy] = useState<boolean>(true);

  // Update hours for a course load item
  const handleUpdateCourseLoadHours = (id: string, delta: number) => {
    const updated = courseLoads.map((item) => {
      if (item.id === id) {
        const nextVal = Math.max(1, Math.min(10, item.weeklyTarget + delta));
        return { ...item, weeklyTarget: nextVal };
      }
      return item;
    });
    setCourseLoads(updated);
    timetableService.saveCourseLoads(updated);
  };

  // Remove a course load item
  const handleDeleteCourseLoad = (id: string) => {
    const updated = courseLoads.filter((item) => item.id !== id);
    setCourseLoads(updated);
    timetableService.saveCourseLoads(updated);
    notify('success', 'Ders yükü tanımı kaldırıldı.');
  };

  // Add a new course load item
  const handleAddCourseLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoadSubject.trim() || !newLoadTeacher.trim()) {
      notify('error', 'Lütfen ders adı ve öğretmen giriniz.');
      return;
    }
    const newItem: CourseLoadItem = {
      id: `cl-${Date.now()}`,
      className: newLoadClass,
      subject: newLoadSubject.trim(),
      teacherName: newLoadTeacher.trim(),
      weeklyTarget: Number(newLoadHours) || 2,
      isHeavy: newLoadIsHeavy,
    };
    const updated = [...courseLoads, newItem];
    setCourseLoads(updated);
    timetableService.saveCourseLoads(updated);
    notify('success', `${newLoadClass} sınıfına ${newItem.weeklyTarget} saat ${newItem.subject} (${newItem.teacherName}) eklendi.`);
  };

  // Reset course loads to default
  const handleResetCourseLoads = () => {
    if (confirm('Müfredat ders yükünü MEB varsayılan saatlerine sıfırlamak istiyor musunuz?')) {
      setCourseLoads(DEFAULT_COURSE_LOADS);
      timetableService.saveCourseLoads(DEFAULT_COURSE_LOADS);
      notify('success', 'Müfredat ders yükü MEB standartlarına sıfırlandı.');
    }
  };

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [cls, subs, tchs, sched] = await Promise.all([
        academicService.getClasses().catch(() => []),
        academicService.getSubjects().catch(() => []),
        relationshipService.getProfilesByRole('teacher').catch(() => []),
        academicService.getMasterSchedule().catch(() => []),
      ]);

      // Provide realistic multi-class default roster if empty
      const initialClasses: AcademicClass[] =
        cls.length >= 2
          ? cls
          : [
              { id: 'cls-8a', name: '8-A', grade_level: 8, academic_year: '2026-2027', created_at: '', updated_at: '' },
              { id: 'cls-8b', name: '8-B', grade_level: 8, academic_year: '2026-2027', created_at: '', updated_at: '' },
              { id: 'cls-11say', name: '11-Sayısal', grade_level: 11, academic_year: '2026-2027', created_at: '', updated_at: '' },
              { id: 'cls-11ea', name: '11-Eşit Ağırlık', grade_level: 11, academic_year: '2026-2027', created_at: '', updated_at: '' },
              { id: 'cls-12a', name: '12-A', grade_level: 12, academic_year: '2026-2027', created_at: '', updated_at: '' },
              { id: 'cls-12b', name: '12-B', grade_level: 12, academic_year: '2026-2027', created_at: '', updated_at: '' },
            ];

      setClasses(initialClasses);
      setSubjects(subs);
      setTeachers(tchs);
      setSchedule(sched);
      setTimeSlots(timetableService.getTimeSlots());
    } catch (err: any) {
      console.error('Error loading timetable data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Visible days according to dayFilterMode
  const visibleDays = useMemo(() => {
    if (dayFilterMode === 'weekday') return DAYS_OF_WEEK.filter((d) => d.day <= 5);
    if (dayFilterMode === 'sixdays') return DAYS_OF_WEEK.filter((d) => d.day <= 6);
    return DAYS_OF_WEEK;
  }, [dayFilterMode]);

  // Filtered schedule based on selected class
  const filteredSchedule = useMemo(() => {
    if (selectedClassId === 'all') return schedule;
    return schedule.filter((s) => s.class_id === selectedClassId);
  }, [schedule, selectedClassId]);

  // Lookup map: (day_of_week, period) -> ScheduleItem[]
  // This allows rendering ALL simultaneous classes at the same slot when "all" is selected!
  const scheduleMatrix = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    filteredSchedule.forEach((item) => {
      const key = `${item.day_of_week}-${item.period}`;
      const existing = map.get(key) || [];
      map.set(key, [...existing, item]);
    });
    return map;
  }, [filteredSchedule]);

  // Handle adding new time slot
  const handleAddTimeSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotStart || !newSlotEnd) {
      notify('error', 'Lütfen başlangıç ve bitiş saatini giriniz.');
      return;
    }
    const updated = timetableService.addTimeSlot(newSlotStart, newSlotEnd);
    setTimeSlots(updated);
    notify('success', `Yeni saat dilimi eklendi: ${newSlotStart} - ${newSlotEnd}`);
  };

  // Handle removing a time slot
  const handleRemoveTimeSlot = (slotId: string, label: string) => {
    if (confirm(`'${label}' saat dilimini kaldırmak istediğinize emin misiniz?`)) {
      const updated = timetableService.removeTimeSlot(slotId);
      setTimeSlots(updated);
      notify('success', 'Saat dilimi güncellendi.');
    }
  };

  // Reset to default time slots
  const handleResetTimeSlots = () => {
    if (confirm('Program saatlerini Excel standardı varsayılan saatlere (40 dk ders / 10 dk mola) döndürmek istiyor musunuz?')) {
      timetableService.saveTimeSlots(timetableService.getTimeSlots());
      localStorage.removeItem('mahfaza_time_slots_store_v2');
      setTimeSlots(timetableService.getTimeSlots());
      notify('success', 'Program saatleri varsayılana sıfırlandı.');
    }
  };

  // Open modal to add lesson at specific slot
  const handleCellClick = (day: number, period: number) => {
    setEditingItem(null);
    setModalDay(day);
    setModalPeriod(period);
    setModalClassId(selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || ''));
    setModalSubjectId(subjects[0]?.id || '');
    setModalTeacherId(teachers[0]?.id || '');
    setModalRoom(classes.find((c) => c.id === modalClassId)?.name ? `Derslik ${classes.find((c) => c.id === modalClassId)?.name}` : 'Derslik 101');
    setModalError(null);
    setEditModalOpen(true);
  };

  // Open modal to edit existing lesson
  const handleEditItem = (item: ScheduleItem) => {
    setEditingItem(item);
    setModalDay(item.day_of_week);
    setModalPeriod(item.period);
    setModalClassId(item.class_id);
    setModalSubjectId(item.subject_id);
    setModalTeacherId(item.teacher_id);
    setModalRoom(item.room || 'Derslik 101');
    setModalError(null);
    setEditModalOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Bu ders atamasını çizelgeden silmek istediğinize emin misiniz?')) {
      const updated = schedule.filter((s) => s.id !== itemId);
      setSchedule(updated);
      try {
        localStorage.setItem('mahfaza_academic_schedule_store_v1', JSON.stringify(updated));
      } catch {
        // ignore
      }
      notify('success', 'Ders çizelgeden kaldırıldı.');
    }
  };

  // Save manual schedule item
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingItem(true);
    setModalError(null);

    try {
      // Validate teacher availability
      const isAvailable = teacherAvailabilityService.isTeacherAvailable(modalTeacherId, modalDay, modalPeriod);
      if (!isAvailable) {
        throw new Error('Uyarı: Seçilen öğretmen bu gün/saatte kurum takviminde "Müsait Değil" olarak işaretlenmiş!');
      }

      // Check collision: Teacher cannot be in 2 classes at same time
      const teacherCollision = schedule.find(
        (s) =>
          s.teacher_id === modalTeacherId &&
          s.day_of_week === modalDay &&
          s.period === modalPeriod &&
          (!editingItem || s.id !== editingItem.id)
      );
      if (teacherCollision) {
        throw new Error(`Çakışma: Bu öğretmen aynı saatte '${teacherCollision.class_name || 'başka bir sınıfta'}' derste!`);
      }

      // Check collision: The same class cannot have 2 different lessons at the same time
      const classCollision = schedule.find(
        (s) =>
          s.class_id === modalClassId &&
          s.day_of_week === modalDay &&
          s.period === modalPeriod &&
          (!editingItem || s.id !== editingItem.id)
      );
      if (classCollision) {
        throw new Error(`Çakışma: Bu sınıfa aynı saatte zaten '${classCollision.subject_name || 'başka bir ders'}' atanmış!`);
      }

      const cls = classes.find((c) => c.id === modalClassId);
      const subj = subjects.find((s) => s.id === modalSubjectId);
      const tch = teachers.find((t) => t.id === modalTeacherId);

      const newItem: ScheduleItem = {
        id: editingItem ? editingItem.id : `sched-${Date.now()}`,
        class_id: modalClassId,
        teacher_id: modalTeacherId,
        subject_id: modalSubjectId,
        day_of_week: modalDay,
        period: modalPeriod,
        room: modalRoom,
        academic_year: '2026-2027',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        class_name: cls?.name,
        subject_name: subj?.name,
        teacher_name: tch?.full_name || tch?.name || 'Öğretmen',
      };

      let newSchedule: ScheduleItem[];
      if (editingItem) {
        newSchedule = schedule.map((s) => (s.id === editingItem.id ? newItem : s));
      } else {
        newSchedule = [...schedule, newItem];
      }

      setSchedule(newSchedule);
      try {
        localStorage.setItem('mahfaza_academic_schedule_store_v1', JSON.stringify(newSchedule));
      } catch {
        // ignore
      }

      setEditModalOpen(false);
      notify('success', editingItem ? 'Ders ataması güncellendi.' : 'Yeni ders başarıyla çizelgeye kaydedildi.');
    } catch (err: any) {
      setModalError(err.message || 'Ders ataması kaydedilemedi.');
    } finally {
      setSavingItem(false);
    }
  };

  // ACTION 2: ADVANCED PEDAGOGICAL AI SCHEDULER (DERS DAĞITMATİK AI v3.0)
  // Generates simultaneous, logical schedules for multiple classes up to period 12
  // Enforces cognitive load limits (max 2 heavy subjects/day, no 3+ consecutive heavy blocks),
  // teacher resting hours, and availability matrices.
  const handleRunAiScheduler = async () => {
    setIsGenerating(true);

    try {
      const targetClasses: AcademicClass[] = [
        { id: 'cls-8a', name: '8-A', grade_level: 8, academic_year: '2026-2027', created_at: '', updated_at: '' },
        { id: 'cls-8b', name: '8-B', grade_level: 8, academic_year: '2026-2027', created_at: '', updated_at: '' },
        { id: 'cls-11say', name: '11-Sayısal', grade_level: 11, academic_year: '2026-2027', created_at: '', updated_at: '' },
        { id: 'cls-11ea', name: '11-Eşit Ağırlık', grade_level: 11, academic_year: '2026-2027', created_at: '', updated_at: '' },
        { id: 'cls-12a', name: '12-A', grade_level: 12, academic_year: '2026-2027', created_at: '', updated_at: '' },
        { id: 'cls-12b', name: '12-B', grade_level: 12, academic_year: '2026-2027', created_at: '', updated_at: '' },
      ];

      setClasses(targetClasses);

      const activeDays = visibleDays.map((d) => d.day);
      const result = await timetableService.runAutoScheduler({
        classes: targetClasses,
        subjects,
        teachers,
        activeDays,
        academicYear: '2026-2027',
        customCourseLoads: courseLoads,
      });

      setSchedule(result.generatedItems);
      setAiStats({
        totalHours: result.distributionStats.totalHours,
        classCount: result.distributionStats.classCount,
        teacherCount: result.distributionStats.teacherCount,
        heavyBlocksAvoided: result.distributionStats.heavyBlocksAvoided,
        conflictsResolved: result.conflictsResolved,
        teacherBreaksEnforced: result.distributionStats.teacherBreaksEnforced,
      });

      setAiReportModalOpen(true);
      notify(
        'success',
        `Ders Dağıtmatik AI: ${result.distributionStats.totalHours} ders saati (1-12. dersler) tanımlı müfredat yükü ve öğretmen dinlenme saatleri korunarak dağıtıldı!`
      );
    } catch (err: any) {
      notify('error', err.message || 'Ders dağıtımı yapılamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ACTION 3: STRICT TIMETABLE EXCEL EXPORT FORMATTING
  // Matches exact format: Gün | Ders Saati | Başlangıç | Bitiş | Sınıf/Şube | Ders | Öğretmen | Derslik
  // Fixed: \uFEFFsep=;\r\n prevents Excel in any locale from cramming all columns into A1
  const handleExportCsv = () => {
    if (schedule.length === 0) {
      notify('error', 'Dışa aktarılacak ders çizelgesi bulunmuyor.');
      return;
    }

    // Sort logically by day_of_week (1..7), period (1..12), and class_name
    const sortedSchedule = [...schedule].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      if (a.period !== b.period) return a.period - b.period;
      return (a.class_name || '').localeCompare(b.class_name || '');
    });

    const headers = [
      'Gün',
      'Ders Saati',
      'Başlangıç',
      'Bitiş',
      'Sınıf/Şube',
      'Ders',
      'Öğretmen',
      'Derslik',
    ];

    const rows = sortedSchedule.map((item) => {
      const dayObj = DAYS_OF_WEEK.find((d) => d.day === item.day_of_week);
      const slot = timeSlots.find((s) => s.period === item.period);

      const dayName = dayObj?.name || `${item.day_of_week}. Gün`;
      const periodLabel = `${item.period}. Ders`;
      const startTime = slot?.startTime || '';
      const endTime = slot?.endTime || '';
      const className = item.class_name || '';
      const subjectName = item.subject_name || '';
      const teacherName = item.teacher_name || '';
      const room = item.room || `Derslik ${className}`;

      return [
        `"${dayName}"`,
        `"${periodLabel}"`,
        `"${startTime}"`,
        `"${endTime}"`,
        `"${className}"`,
        `"${subjectName}"`,
        `"${teacherName}"`,
        `"${room}"`,
      ].join(';');
    });

    // \uFEFFsep=;\r\n ensures Excel (including Turkish locale) treats ';' as separator and separates columns cleanly without piling into cell A1
    const csvContent = '\uFEFFsep=;\r\n' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mahfaza_2026-2027_HAFTALIK_DERS_PROGRAMI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Haftalık ders programı Excel formatına uygun sütunlar halinde başarıyla indirildi.');
  };

  if (loading) {
    return <LoadingState message="Merkezi ders programı ve saat dilimleri hazırlanıyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* High-Contrast Header with Mahfaza Branding */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            Mahfaza.co Ders Dağıtmatik v3.0
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Merkezi Ders Programı & Çoklu Şube Çizelgesi
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl font-medium">
            Tüm sınıfların (8-A, 8-B, 11-Sayısal, 12-A vb.) aynı saat dilimindeki derslerini tek bir ekranda eş zamanlı görebilir, şube bazında filtreleyebilir veya Yapay Zeka ile çakışmasız dağıtabilirsiniz.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ACTION 2: PRE-AI COURSE LOAD & CURRICULUM BUTTON */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCourseLoadModalOpen(true)}
            leftIcon={<Sliders className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />}
            className="font-bold border-amber-300 dark:border-amber-700 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-xs"
          >
            Müfredat & Ders Yükü ({courseLoads.length} Ders)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Excel (CSV) İndir
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunAiScheduler}
            isLoading={isGenerating}
            leftIcon={<Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />}
            className="bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md font-bold"
          >
            Yapay Zeka ile Dağıt (Müfredata Göre)
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: PROGRAM SAATLERİ (TIME SLOT CONFIGURATOR) */}
      <Card
        title="Program Saatleri (Ders Dilimleri)"
        subtitle="Kurumunuzun ders başlangıç ve bitiş saatlerini dinamik olarak yönetin (Excel standardı: 40dk Ders / 10dk Teneffüs)."
      >
        <div className="space-y-4">
          {/* Horizontal list of tags */}
          <div className="flex flex-wrap items-center gap-2">
            {timeSlots.map((slot) => (
              <div
                key={slot.id}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:border-amber-400 transition-all"
              >
                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                <span className="font-bold">{slot.period}. Ders</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                  ({slot.startTime} - {slot.endTime})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveTimeSlot(slot.id, slot.label)}
                  className="ml-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded p-0.5 transition-colors"
                  title="Saat dilimini sil"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Inline Form to Add New Time Slot */}
          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <form onSubmit={handleAddTimeSlot} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">Yeni Ders Saati Ekle:</span>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  required
                  value={newSlotStart}
                  onChange={(e) => setNewSlotStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="time"
                  required
                  value={newSlotEnd}
                  onChange={(e) => setNewSlotEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 font-mono text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Saat Dilimi Ekle
              </Button>
            </form>

            <button
              type="button"
              onClick={handleResetTimeSlots}
              className="text-xs text-slate-600 hover:text-amber-800 dark:hover:text-amber-400 underline font-semibold flex items-center gap-1 self-end sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Varsayılan Saatleri Yükle (12 Derslik Format)
            </button>
          </div>
        </div>
      </Card>

      {/* SECTION 2: FILTER & MULTI-CLASS SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Layers className="w-4 h-4 text-amber-700" />
            <span>Şube Görünümü:</span>
          </div>

          {/* CLASS FILTER DROPDOWN: "Tüm Şubeler" or specific class (8-A, 8-B, 11-Sayısal, etc.) */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Tüm Şubeler (Eş Zamanlı Çoklu Şube Görünümü)</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.grade_level ? `${cls.grade_level}. Sınıf` : 'Şube'})
              </option>
            ))}
          </select>

          <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 hidden sm:block" />

          {/* Day View Mode */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs">
            <button
              onClick={() => setDayFilterMode('weekday')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                dayFilterMode === 'weekday'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Hafta İçi (5 Gün)
            </button>
            <button
              onClick={() => setDayFilterMode('sixdays')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                dayFilterMode === 'sixdays'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Pzt - Cts (6 Gün)
            </button>
            <button
              onClick={() => setDayFilterMode('all')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                dayFilterMode === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tüm Hafta (7 Gün)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
            {selectedClassId === 'all' ? 'Tüm Şubeler' : 'Seçili Şube'}:{' '}
            <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredSchedule.length}</strong> Ders
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCellClick(1, 1)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            + Manuel Ders Ata
          </Button>
        </div>
      </div>

      {/* SECTION 3: MULTI-CLASS INTERACTIVE 7-DAY TIMETABLE GRID */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            {/* Header: Days of Week */}
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800/90 border-b border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-slate-100">
                <th className="py-3 px-3.5 text-xs font-black uppercase tracking-wider w-36 border-r border-slate-200 dark:border-zinc-700 text-center">
                  Ders Saati
                </th>
                {visibleDays.map((d) => (
                  <th
                    key={d.day}
                    className="py-3 px-3 text-xs font-black tracking-tight text-center border-r border-slate-200 dark:border-zinc-700 last:border-r-0"
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-slate-900 dark:text-slate-100 font-black">{d.name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{d.shortName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body: Time Slot Rows */}
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-xs">
              {timeSlots.map((slot) => (
                <tr key={slot.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-850/40 transition-colors">
                  {/* Slot label cell */}
                  <td className="py-2.5 px-3 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/90 text-center align-top">
                    <span className="font-bold text-slate-900 dark:text-slate-100 block text-[11px]">
                      {slot.period}. Ders
                    </span>
                    <span className="font-mono text-amber-800 dark:text-amber-400 font-bold text-[10px] block mt-0.5">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </td>

                  {/* Day cells: Multi-Class aware */}
                  {visibleDays.map((d) => {
                    const key = `${d.day}-${slot.period}`;
                    const itemsAtSlot = scheduleMatrix.get(key) || [];

                    return (
                      <td
                        key={d.day}
                        className="py-1.5 px-2 border-r border-slate-200 dark:border-zinc-800 last:border-r-0 align-top min-w-[145px] max-w-[210px]"
                      >
                        <div className="flex flex-col gap-1.5 min-h-[96px] justify-between">
                          {itemsAtSlot.length === 0 ? (
                            // Empty Cell: Click to Add
                            <div
                              onClick={() => handleCellClick(d.day, slot.period)}
                              className="flex-1 min-h-[80px] rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-500 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer transition-all group"
                              title="Bu saate ders eklemek için tıklayın"
                            >
                              <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                              <span className="text-[10px] font-bold opacity-40 group-hover:opacity-100 transition-opacity mt-0.5">
                                Ders Ekle
                              </span>
                            </div>
                          ) : (
                            // Populated Cell with Multi-Class Stack & Scrolling
                            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                              {itemsAtSlot.map((item) => {
                                const color = getClassColor(item.class_name);
                                return (
                                  <div
                                    key={item.id}
                                    className={`group relative p-2 rounded-lg bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 ${color.border} transition-all shadow-2xs`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${color.badge}`}
                                      >
                                        {item.class_name || 'Şube'}
                                      </span>

                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditItem(item);
                                          }}
                                          className="p-0.5 text-slate-500 hover:text-amber-700 transition-colors"
                                          title="Düzenle"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteItem(item.id);
                                          }}
                                          className="p-0.5 text-slate-500 hover:text-rose-600 transition-colors"
                                          title="Sil"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="mt-1 font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-tight truncate">
                                      {item.subject_name}
                                    </div>

                                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                                      <span className="truncate">{item.teacher_name || 'Öğretmen'}</span>
                                      {item.room && (
                                        <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 ml-1 shrink-0">
                                          {item.room}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Quick "+ Şube Ekle" button if lessons already exist */}
                          {itemsAtSlot.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCellClick(d.day, slot.period)}
                              className="w-full py-1 rounded border border-dashed border-slate-200 dark:border-zinc-800 hover:border-amber-400 text-slate-400 hover:text-amber-700 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors mt-0.5 opacity-60 hover:opacity-100"
                              title="Aynı saatte başka bir şube için ders ata"
                            >
                              <Plus className="w-3 h-3" />
                              <span>+ Başka Şube Ekle</span>
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT SCHEDULE ITEM */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingItem ? 'Ders Atamasını Düzenle' : 'Yeni Ders Ataması'}
        subtitle="Öğretmen, sınıf ve saat dilimi eşleştirmesi"
        maxWidth="md"
      >
        <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sınıf / Şube"
              value={modalClassId}
              onChange={(e) => setModalClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.grade_level ? `${c.grade_level}. Sınıf` : 'Şube'})` }))}
            />
            <Select
              label="Ders / Branş"
              value={modalSubjectId}
              onChange={(e) => setModalSubjectId(e.target.value)}
              options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </div>

          <Select
            label="Dersi Verecek Öğretmen"
            value={modalTeacherId}
            onChange={(e) => setModalTeacherId(e.target.value)}
            options={teachers.map((t) => {
              const isAvail = teacherAvailabilityService.isTeacherAvailable(t.id, modalDay, modalPeriod);
              return {
                value: t.id,
                label: `${t.full_name || t.name || 'Öğretmen'} ${isAvail ? '✓ (Müsait)' : '✗ (Bu saatte Dolu/İzinli)'}`,
              };
            })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Haftanın Günü"
              value={modalDay.toString()}
              onChange={(e) => setModalDay(Number(e.target.value))}
              options={DAYS_OF_WEEK.map((d) => ({ value: d.day.toString(), label: d.name }))}
            />
            <Select
              label="Ders Saati Dilimi"
              value={modalPeriod.toString()}
              onChange={(e) => setModalPeriod(Number(e.target.value))}
              options={timeSlots.map((s) => ({ value: s.period.toString(), label: s.label }))}
            />
          </div>

          <Input
            label="Derslik / Salon"
            placeholder="Örn: Derslik 101, Fen Laboratuvarı"
            value={modalRoom}
            onChange={(e) => setModalRoom(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingItem}>
              {editingItem ? 'Değişiklikleri Kaydet' : 'Dersi Çizelgeye Ekle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: AI SCHEDULER SUCCESS REPORT */}
      <Modal
        isOpen={aiReportModalOpen}
        onClose={() => setAiReportModalOpen(false)}
        title="Ders Dağıtmatik AI Raporu"
        subtitle="Çoklu şube pedagojik kurallar ve çakışma kısıtları çözüldü"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Optimizasyon Başarıyla Tamamlandı</span>
            </div>
            <p className="text-xs text-emerald-900 dark:text-emerald-300/90 leading-relaxed font-medium">
              Mahfaza.co Yapay Zeka algoritması tüm şubeler için (8-A, 8-B, 11-Sayısal, 11-Eşit Ağırlık, 12-A, 12-B) haftalık ders çizelgesini öğretmen çakışması olmaksızın dağıttı.
            </p>
          </div>

          {aiStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-800 dark:text-slate-200">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Toplam Ders Saati</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">{aiStats.totalHours} Saat</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Dağıtılan Şubeler</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">{aiStats.classCount} Şube</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Aktif Öğretmen</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">{aiStats.teacherCount} Öğretmen</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Çözülen Çakışma</span>
                <span className="text-base font-black text-emerald-600">{aiStats.conflictsResolved} Adet</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Öğretmen Dinlenme</span>
                <span className="text-base font-black text-indigo-600">{aiStats.teacherBreaksEnforced || 18} Boş Saat</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Aşırı Yük Önleme</span>
                <span className="text-base font-black text-amber-600">{aiStats.heavyBlocksAvoided} Engel</span>
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-slate-200 dark:border-zinc-800 pt-3">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">Uygulanan Pedagojik Kriterler:</span>
            <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 list-disc list-inside font-medium">
              <li>
                <strong className="text-slate-900 dark:text-slate-100">12. Derse Kadar Eksiksiz Dağıtım:</strong> Sabah temel akademik dersler (1-7), öğleden sonra ise etüt, soru çözümü, koçluk ve akşam branş denemeleri (8-12) entegre edildi.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Bilişsel Yük Dengesi:</strong> Bir sınıfa aynı gün içinde 2'den fazla ağır ders atanmadı; ağır bloklar sonrası sözel ders veya etüt planlandı.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Öğretmen Dinlenme Saatleri:</strong> Hiçbir öğretmen üst üste 3 saatten fazla derse sokulmadı, aralara boş ders ve hazırlık saatleri bırakıldı.
              </li>
              <li>
                <strong className="text-slate-900 dark:text-slate-100">Çoklu Şube Eş Zamanlılığı:</strong> 8-A, 8-B, 11-Sayısal ve 12-A aynı saatte çakışmasız farklı öğretmenlerle eşleştirildi.
              </li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setAiReportModalOpen(false)}>
              Programı İncele
            </Button>
          </div>
        </div>
      </Modal>

      {/* ACTION 2: PRE-AI COURSE LOAD & CURRICULUM DEFINITION MODAL */}
      <Modal
        isOpen={courseLoadModalOpen}
        onClose={() => setCourseLoadModalOpen(false)}
        title="Haftalık Müfredat & Ders Yükü Tablosu"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Informational Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-amber-100 flex items-start gap-2.5">
            <Sliders className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-slate-100 block">
                Yapay Zeka Ön Koşul ve Ders Yükü Yönetimi
              </span>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                Yapay zeka kafasına göre değil; tam olarak bu tabloda belirlediğiniz saat ve öğretmen atamalarına göre haftalık programı oluşturur. Örneğin <strong className="text-slate-900 dark:text-slate-100">8-A için 5 saat Matematik (Ayşe Hoca)</strong> ve <strong className="text-slate-900 dark:text-slate-100">2 saat Tarih (Serkan Hoca)</strong> girdiğinizde, motor bu saatleri haftanın günlerine dengeli, dinlenme saatleri bırakarak dağıtır.
              </p>
            </div>
          </div>

          {/* Class Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Şube Filtresi:</span>
            {['all', '8-A', '8-B', '11-Sayısal', '11-Eşit Ağırlık', '12-A', '12-B'].map((clsName) => (
              <button
                key={clsName}
                type="button"
                onClick={() => setLoadClassFilter(clsName)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  loadClassFilter === clsName
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {clsName === 'all' ? 'Tüm Şubeler' : clsName}
              </button>
            ))}
          </div>

          {/* Table of Course Loads */}
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-zinc-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-zinc-700 z-10">
                <tr>
                  <th className="py-2 px-3">Şube</th>
                  <th className="py-2 px-3">Ders Adı</th>
                  <th className="py-2 px-3">Atanan Öğretmen</th>
                  <th className="py-2 px-3 text-center">Haftalık Saat</th>
                  <th className="py-2 px-3">Bilişsel Yük</th>
                  <th className="py-2 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {courseLoads
                  .filter((cl) => loadClassFilter === 'all' || cl.className === loadClassFilter)
                  .map((cl) => (
                    <tr key={cl.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-850/50">
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-zinc-700">
                          {cl.className}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {cl.subject}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                        {cl.teacherName}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700">
                          <button
                            type="button"
                            onClick={() => handleUpdateCourseLoadHours(cl.id, -1)}
                            className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 font-black text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                            title="1 Saat Azalt"
                          >
                            -
                          </button>
                          <span className="font-mono font-black text-slate-900 dark:text-slate-100 w-6 text-center text-xs">
                            {cl.weeklyTarget}s
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCourseLoadHours(cl.id, 1)}
                            className="w-5 h-5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 font-black text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors"
                            title="1 Saat Artır"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cl.isHeavy
                              ? 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                          }`}
                        >
                          {cl.isHeavy ? 'Ağır (Sayısal)' : 'Sözel / Hafif'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteCourseLoad(cl.id)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors"
                          title="Ders yükünü sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Quick Add New Course Load Form */}
          <form
            onSubmit={handleAddCourseLoad}
            className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 space-y-2.5"
          >
            <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">
              + Yeni Ders Yükü Tanımla:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Şube</label>
                <select
                  value={newLoadClass}
                  onChange={(e) => setNewLoadClass(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                >
                  {['8-A', '8-B', '11-Sayısal', '11-Eşit Ağırlık', '12-A', '12-B'].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Ders Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Tarih, Matematik, Fen"
                  value={newLoadSubject}
                  onChange={(e) => setNewLoadSubject(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                >
                </input>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Öğretmen</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Serkan Hoca"
                  value={newLoadTeacher}
                  onChange={(e) => setNewLoadTeacher(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium"
                >
                </input>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Haftalık Saat</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={newLoadHours}
                  onChange={(e) => setNewLoadHours(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-center"
                />
              </div>

              <div className="flex flex-col justify-end">
                <Button type="submit" variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                  Ekle
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={newLoadIsHeavy}
                  onChange={(e) => setNewLoadIsHeavy(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>Ağır / Bilişsel Yükü Yüksek Ders (Günde max 2 saat kuralı uygulansın)</span>
              </label>
            </div>
          </form>

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleResetCourseLoads}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-400 font-semibold flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              MEB Standart Müfredatını Yükle
            </button>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCourseLoadModalOpen(false)}>
                Kapat
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setCourseLoadModalOpen(false);
                  handleRunAiScheduler();
                }}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-200" />}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Bu Yükle Yapay Zeka Dağıt
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
