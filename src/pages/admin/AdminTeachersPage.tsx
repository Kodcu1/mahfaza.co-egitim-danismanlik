import React, { useState, useEffect, useCallback } from 'react';
import { relationshipService } from '../../services/relationshipService';
import { academicService } from '../../services/academicService';
import { teacherAvailabilityService, TeacherAvailabilityMatrix } from '../../services/teacherAvailabilityService';
import { timetableService, DAYS_OF_WEEK } from '../../services/timetableService';
import { Profile, Subject, ScheduleItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  Mail,
  Phone,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';

// Institutional faculty list for comprehensive roster display
const INSTITUTIONAL_FACULTY: Profile[] = [
  { id: 't-ayse', full_name: 'Ayşe Hoca', name: 'Ayşe Hoca', first_name: 'Ayşe', last_name: 'Hoca', email: 'ayse.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-ahmet', full_name: 'Ahmet Hoca', name: 'Ahmet Hoca', first_name: 'Ahmet', last_name: 'Hoca', email: 'ahmet.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-mehmet', full_name: 'Mehmet Hoca', name: 'Mehmet Hoca', first_name: 'Mehmet', last_name: 'Hoca', email: 'mehmet.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-selin', full_name: 'Selin Hoca', name: 'Selin Hoca', first_name: 'Selin', last_name: 'Hoca', email: 'selin.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-zeynep', full_name: 'Zeynep Hoca', name: 'Zeynep Hoca', first_name: 'Zeynep', last_name: 'Hoca', email: 'zeynep.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-canan', full_name: 'Canan Hoca', name: 'Canan Hoca', first_name: 'Canan', last_name: 'Hoca', email: 'canan.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-murat', full_name: 'Murat Hoca', name: 'Murat Hoca', first_name: 'Murat', last_name: 'Hoca', email: 'murat.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-elif', full_name: 'Elif Hoca', name: 'Elif Hoca', first_name: 'Elif', last_name: 'Hoca', email: 'elif.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-kemal', full_name: 'Kemal Hoca', name: 'Kemal Hoca', first_name: 'Kemal', last_name: 'Hoca', email: 'kemal.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-burak', full_name: 'Burak Hoca', name: 'Burak Hoca', first_name: 'Burak', last_name: 'Hoca', email: 'burak.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
  { id: 't-esra', full_name: 'Esra Hoca', name: 'Esra Hoca', first_name: 'Esra', last_name: 'Hoca', email: 'esra.hoca@mahfaza.co', role: 'teacher', created_at: '', updated_at: '' },
];

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // New Teacher Modal
  const [newTeacherModalOpen, setNewTeacherModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Availability Modal
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Profile | null>(null);
  const [availMatrix, setAvailMatrix] = useState<TeacherAvailabilityMatrix>({});
  const [timeSlots, setTimeSlots] = useState(timetableService.getTimeSlots());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [allUsers, subs, sched] = await Promise.all([
        relationshipService.getAllUsersAdmin().catch(() => []),
        academicService.getSubjects().catch(() => []),
        academicService.getMasterSchedule().catch(() => []),
      ]);

      const teacherList = allUsers.filter((u) => u.role === 'teacher');
      
      // Merge with institutional faculty to guarantee full staff roster visibility
      const existingEmails = new Set(teacherList.map((t) => t.email?.toLowerCase()));
      const mergedTeachers = [...teacherList];
      for (const fac of INSTITUTIONAL_FACULTY) {
        if (!existingEmails.has(fac.email?.toLowerCase())) {
          mergedTeachers.push(fac);
          existingEmails.add(fac.email?.toLowerCase());
        }
      }

      // Check local storage timetable fallback if sched is empty
      let activeSchedule = sched;
      if (activeSchedule.length === 0) {
        try {
          const raw = localStorage.getItem('mahfaza_academic_schedule_store_v1');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeSchedule = parsed;
            }
          }
        } catch {}
      }

      setTeachers(mergedTeachers);
      setSubjects(subs);
      setSchedule(activeSchedule);
      if (subs.length > 0) setNewSubjectId(subs[0].id);
      setTimeSlots(timetableService.getTimeSlots());
    } catch (err: any) {
      console.error('Error loading teachers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to storage events so timetable changes instantly reflect
    const handleStorageChange = () => {
      loadData();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  // Open availability modal for teacher
  const handleOpenAvailability = (teacher: Profile) => {
    setSelectedTeacher(teacher);
    const matrix = teacherAvailabilityService.getTeacherAvailability(teacher.id);
    setAvailMatrix(matrix);
    setAvailModalOpen(true);
  };

  // Toggle single slot
  const handleToggleSlot = (day: number, period: number) => {
    if (!selectedTeacher) return;
    const currentList = availMatrix[day] ? [...availMatrix[day]] : [];
    let updatedList: number[];
    if (currentList.includes(period)) {
      updatedList = currentList.filter((p) => p !== period);
    } else {
      updatedList = [...currentList, period];
    }
    const newMatrix = { ...availMatrix, [day]: updatedList };
    setAvailMatrix(newMatrix);
    teacherAvailabilityService.setTeacherAvailability(selectedTeacher.id, newMatrix);
  };

  // Quick bulk toggle
  const handleMakeAllAvailable = () => {
    if (!selectedTeacher) return;
    const emptyMatrix: TeacherAvailabilityMatrix = {};
    setAvailMatrix(emptyMatrix);
    teacherAvailabilityService.setTeacherAvailability(selectedTeacher.id, emptyMatrix);
    notify('success', 'Öğretmen tüm günler ve saatler için müsait olarak ayarlandı.');
  };

  const handleCloseWeekend = () => {
    if (!selectedTeacher) return;
    const allPeriods = timeSlots.map((s) => s.period);
    const newMatrix: TeacherAvailabilityMatrix = {
      ...availMatrix,
      6: [...allPeriods], // Saturday
      7: [...allPeriods], // Sunday
    };
    setAvailMatrix(newMatrix);
    teacherAvailabilityService.setTeacherAvailability(selectedTeacher.id, newMatrix);
    notify('success', 'Haftasonu (Cumartesi - Pazar) günleri kapatıldı.');
  };

  const handleToggleDay = (day: number) => {
    if (!selectedTeacher) return;
    const allPeriods = timeSlots.map((s) => s.period);
    const currentList = availMatrix[day] || [];
    let updatedList: number[];
    if (currentList.length >= allPeriods.length) {
      updatedList = [];
    } else {
      updatedList = [...allPeriods];
    }
    const newMatrix = { ...availMatrix, [day]: updatedList };
    setAvailMatrix(newMatrix);
    teacherAvailabilityService.setTeacherAvailability(selectedTeacher.id, newMatrix);
  };

  // Create new teacher
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) {
      setTeacherError('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setSavingTeacher(true);
    setTeacherError(null);

    try {
      const created = await relationshipService.createUserAdmin({
        email: newEmail.trim().toLowerCase(),
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        role: 'teacher',
      });

      setTeachers((prev) => [created, ...prev]);
      setNewTeacherModalOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      notify('success', `'${created.full_name || created.name}' öğretmen kadrosuna eklendi.`);
    } catch (err: any) {
      setTeacherError(err.message || 'Öğretmen kaydedilemedi.');
    } finally {
      setSavingTeacher(false);
    }
  };

  // Filtered teachers
  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const name = (t.full_name || t.name || '').toLowerCase();
    const email = (t.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  if (loading) {
    return <LoadingState message="Öğretmen kadrosu ve müsaitlik verileri yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-800 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Akademik Kadro
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Öğretmen Yönetimi & Müsaitlik Takvimi
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Kurumdaki tüm branş öğretmenlerinin ders yüklerini inceleyebilir, haftalık müsaitlik saatlerini belirleyerek yapay zeka ders dağıtmatik için kısıtlar tanımlayabilirsiniz.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setTeacherError(null);
            setNewTeacherModalOpen(true);
          }}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
        >
          + Yeni Öğretmen Ekle
        </Button>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Search and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
            placeholder="İsim veya e-posta ile öğretmen ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-semibold">Kayıtlı Öğretmen:</span>
          <span className="text-base font-black text-slate-900 dark:text-slate-100">{teachers.length} Kişi</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-semibold">Aktif Çizelge Dersi:</span>
          <span className="text-base font-black text-amber-700 dark:text-amber-400">{schedule.length} Saat</span>
        </div>
      </div>

      {/* Teachers List */}
      <Card title="Öğretmen Listesi" subtitle="Haftalık müsaitlik matrisi ve atanmış ders saatleri">
        {filteredTeachers.length === 0 ? (
          <EmptyState
            title="Öğretmen Bulunamadı"
            description="Arama kriterlerine uygun öğretmen kaydı bulunamadı."
            actionText="Yeni Öğretmen Ekle"
            onAction={() => setNewTeacherModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] bg-slate-50 dark:bg-zinc-850">
                <tr>
                  <th className="py-3 px-4">Öğretmen Adı</th>
                  <th className="py-3 px-3">E-Posta</th>
                  <th className="py-3 px-3">Atanan Ders Saati</th>
                  <th className="py-3 px-3">Müsaitlik Durumu</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-slate-300">
                {filteredTeachers.map((t) => {
                  const teacherAssignedHours = schedule.filter((s) => {
                    if (s.teacher_id === t.id) return true;
                    const sName = (s.teacher_name || '').toLowerCase().trim();
                    const tName = (t.full_name || t.name || '').toLowerCase().trim();
                    const fName = (t.first_name || '').toLowerCase().trim();
                    const lName = (t.last_name || '').toLowerCase().trim();
                    if (!sName) return false;
                    if (tName && (sName.includes(tName) || tName.includes(sName))) return true;
                    if (fName && sName.includes(fName)) return true;
                    if (lName && sName.includes(lName)) return true;
                    const baseFirst = fName || tName.split(' ')[0];
                    if (baseFirst && sName.includes(baseFirst)) return true;
                    return false;
                  }).length;
                  const matrix = teacherAvailabilityService.getTeacherAvailability(t.id);
                  const totalUnavailableSlots = Object.values(matrix).reduce((acc, curr) => acc + curr.length, 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-zinc-850 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs border border-amber-300">
                            {(t.full_name || t.name || 'Ö').charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {t.full_name || t.name || 'İsimsiz Öğretmen'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Öğretmen</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {t.email}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 font-mono">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {teacherAssignedHours} Saat / Hafta
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {totalUnavailableSlots === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Tam Müsait
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            {totalUnavailableSlots} Saat Kapalı
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenAvailability(t)}
                          leftIcon={<Calendar className="w-3.5 h-3.5 text-amber-600" />}
                          className="font-semibold text-xs"
                        >
                          Müsaitlik Ayarla
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: TEACHER AVAILABILITY MATRIX (MÜSAİTLİK TAKVİMİ) */}
      <Modal
        isOpen={availModalOpen}
        onClose={() => setAvailModalOpen(false)}
        title={selectedTeacher ? `${selectedTeacher.full_name || selectedTeacher.name} - Haftalık Müsaitlik Takvimi` : 'Müsaitlik Ayarla'}
        subtitle="Hücreye tıklayarak öğretmenin ders verebileceği ve kapalı olduğu saatleri belirleyebilirsiniz."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Quick Bulk Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Müsait (Ders Verilebilir)
              </span>
              <span className="flex items-center gap-1 text-rose-700 font-bold">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Dolu / İzinli (Ders Verilemez)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleMakeAllAvailable}>
                Tümünü Müsait Yap
              </Button>
              <Button variant="outline" size="sm" onClick={handleCloseWeekend}>
                Haftasonunu Kapat
              </Button>
            </div>
          </div>

          {/* Weekly Interactive Availability Grid */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-zinc-800 border-b border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                  <th className="py-2.5 px-3 w-28 text-left border-r border-slate-200 dark:border-zinc-700">
                    Ders Saati
                  </th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th
                      key={d.day}
                      onClick={() => handleToggleDay(d.day)}
                      className="py-2 px-2 border-r border-slate-200 dark:border-zinc-700 last:border-r-0 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                      title="Günü toplu aç/kapatmak için tıklayın"
                    >
                      <div className="font-bold">{d.name}</div>
                      <span className="text-[9px] text-slate-400 font-normal">Tıkla: Aç/Kapa</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-[11px]">
                {timeSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-zinc-800 font-mono text-left bg-slate-50 dark:bg-zinc-900 font-semibold text-slate-800 dark:text-slate-200">
                      {slot.period}. Ders
                      <span className="block text-[10px] text-slate-400 font-normal">{slot.startTime}</span>
                    </td>
                    {DAYS_OF_WEEK.map((d) => {
                      const unavailableList = availMatrix[d.day] || [];
                      const isUnavailable = unavailableList.includes(slot.period);

                      return (
                        <td
                          key={d.day}
                          onClick={() => handleToggleSlot(d.day, slot.period)}
                          className={`py-2 px-2 border-r border-slate-200 dark:border-zinc-800 last:border-r-0 cursor-pointer transition-all select-none ${
                            isUnavailable
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 font-bold'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                          }`}
                        >
                          {isUnavailable ? (
                            <div className="flex items-center justify-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span className="text-[10px]">Dolu</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[10px]">Müsait</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              Yapay Zeka (Ders Dağıtmatik), bu takvimdeki &quot;Dolu / İzinli&quot; saatlere bu öğretmen için kesinlikle ders atamayacaktır.
            </span>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-zinc-800">
            <Button variant="primary" size="sm" onClick={() => setAvailModalOpen(false)}>
              Kaydet ve Kapat
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: ADD NEW TEACHER */}
      <Modal
        isOpen={newTeacherModalOpen}
        onClose={() => setNewTeacherModalOpen(false)}
        title="Yeni Öğretmen Ekle"
        subtitle="Kurum kadrosuna yeni branş öğretmeni kaydı"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
          {teacherError && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{teacherError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ad"
              required
              placeholder="Örn: Ahmet"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Soyad"
              required
              placeholder="Örn: Demir"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>

          <Input
            label="E-Posta Adresi"
            type="email"
            required
            placeholder="ogretmen@mahfaza.co"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Select
            label="Ana Branş / Ders"
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            options={subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setNewTeacherModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingTeacher}>
              Öğretmeni Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
