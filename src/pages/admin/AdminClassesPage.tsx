import React, { useState, useEffect, useCallback } from 'react';
import { academicService } from '../../services/academicService';
import { relationshipService } from '../../services/relationshipService';
import { AcademicClass, Subject, Profile, ScheduleItem } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Plus, Calendar, BookOpen, Clock, AlertTriangle } from 'lucide-react';

export const AdminClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Class Modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState(12);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [savingClass, setSavingClass] = useState(false);

  // New Subject Modal
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  // New Schedule Item Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedClassId, setSchedClassId] = useState('');
  const [schedTeacherId, setSchedTeacherId] = useState('');
  const [schedSubjectId, setSchedSubjectId] = useState('');
  const [schedDay, setSchedDay] = useState(1);
  const [schedPeriod, setSchedPeriod] = useState(1);
  const [schedRoom, setSchedRoom] = useState('Derslik 101');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cls, subs, tch, sched] = await Promise.all([
        academicService.getClasses(),
        academicService.getSubjects(),
        relationshipService.getProfilesByRole('teacher'),
        academicService.getMasterSchedule(),
      ]);
      setClasses(cls);
      setSubjects(subs);
      setTeachers(tch);
      setSchedule(sched);

      if (cls.length > 0) setSchedClassId(cls[0].id);
      if (tch.length > 0) setSchedTeacherId(tch[0].id);
      if (subs.length > 0) setSchedSubjectId(subs[0].id);
    } catch (err) {
      console.error('Error loading academic data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const [operationError, setOperationError] = useState<string | null>(null);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClass(true);
    setOperationError(null);
    try {
      await academicService.createClass(className.trim(), gradeLevel, academicYear.trim());
      setClassModalOpen(false);
      setClassName('');
      await loadAll();
    } catch (err: any) {
      setOperationError(err.message || 'Sınıf oluşturulamadı.');
    } finally {
      setSavingClass(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSubject(true);
    setOperationError(null);
    try {
      await academicService.createSubject(subjectName.trim(), subjectCode.trim());
      setSubjectModalOpen(false);
      setSubjectName('');
      setSubjectCode('');
      await loadAll();
    } catch (err: any) {
      setOperationError(err.message || 'Ders oluşturulamadı.');
    } finally {
      setSavingSubject(false);
    }
  };

  const handleCreateScheduleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setScheduleError(null);

    try {
      await academicService.createScheduleItem({
        class_id: schedClassId,
        teacher_id: schedTeacherId,
        subject_id: schedSubjectId,
        day_of_week: Number(schedDay),
        period: Number(schedPeriod),
        room: schedRoom.trim() || undefined,
        academic_year: academicYear,
      });

      setScheduleModalOpen(false);
      await loadAll();
    } catch (err: any) {
      setScheduleError(
        err.message?.includes('conflict') || err.message?.includes('unique')
          ? 'Çakışma Hatası: Seçilen öğretmen veya sınıf aynı gün ve saatte başka bir derse atanmış!'
          : err.message || 'Ders programına eklenemedi.'
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const dayNames = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  if (loading) {
    return <LoadingState message="Akademik yapı yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Akademik Yapı</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Sınıflar, Dersler & Haftalık Program
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Çakışma önleyici kısıtlar ile donatılmış merkezi haftalık ders çizelgesi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSubjectModalOpen(true)}
            leftIcon={<BookOpen className="w-3.5 h-3.5" />}
          >
            Ders Ekle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClassModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Sınıf Ekle
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setScheduleModalOpen(true)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
          >
            Ders Çizelgesine Ata
          </Button>
        </div>
      </div>

      {/* Grid: Classes & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Tanımlı Şubeler" subtitle="Mevcut sınıflar ve kademeleri">
          {classes.length === 0 ? (
            <EmptyState
              title="Sınıf Yok"
              description="Henüz bir sınıf şubesi oluşturulmamış."
              actionText="Sınıf Ekle"
              onAction={() => setClassModalOpen(true)}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {classes.map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{c.name}</span>
                    <span className="text-zinc-500 ml-2">({c.grade_level}. Sınıf)</span>
                  </div>
                  <span className="text-zinc-400 font-mono text-[11px]">{c.academic_year}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Ders Müfredatı" subtitle="Tanımlı dersler ve branş kodları">
          {subjects.length === 0 ? (
            <EmptyState
              title="Ders Yok"
              description="Veritabanında henüz bir ders tanımlanmamış."
              actionText="Ders Tanımla"
              onAction={() => setSubjectModalOpen(true)}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {subjects.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{s.name}</span>
                  <span className="font-mono text-amber-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px]">
                    {s.code}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Master Schedule Table */}
      <Card
        title="Merkezi Haftalık Ders Çizelgesi"
        subtitle="Öğretmen ve sınıf çakışması engelli haftalık ders akışı"
      >
        {schedule.length === 0 ? (
          <EmptyState
            title="Ders Programı Boş"
            description="Ders ataması yaparak haftalık çizelgeyi oluşturabilirsiniz."
            actionText="Yeni Ders Ata"
            onAction={() => setScheduleModalOpen(true)}
            icon={<Clock className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Gün</th>
                  <th className="py-2.5 px-3">Saat / Ders</th>
                  <th className="py-2.5 px-3">Sınıf</th>
                  <th className="py-2.5 px-3">Ders</th>
                  <th className="py-2.5 px-3">Öğretmen</th>
                  <th className="py-2.5 px-3">Derslik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {schedule.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-3 font-sans font-medium text-zinc-200">
                      {dayNames[item.day_of_week] || `Gün ${item.day_of_week}`}
                    </td>
                    <td className="py-3 px-3 text-amber-400 font-bold tabular-nums">
                      {item.period}. Ders
                    </td>
                    <td className="py-3 px-3 text-zinc-300 font-sans font-semibold">
                      {item.class_name}
                    </td>
                    <td className="py-3 px-3 text-zinc-200 font-sans">
                      {item.subject_name}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-sans">
                      {item.teacher_name || '—'}
                    </td>
                    <td className="py-3 px-3 text-zinc-500">
                      {item.room || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: New Class */}
      <Modal
        isOpen={classModalOpen}
        onClose={() => setClassModalOpen(false)}
        title="Yeni Sınıf Oluştur"
        subtitle="Akademik sınıf şubesi ekle"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <Input
            label="Sınıf Adı"
            required
            placeholder="Örn: 12-A Sayısal"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
          <Input
            label="Kademe (1-12)"
            type="number"
            min={1}
            max={12}
            required
            value={gradeLevel}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
          />
          <Input
            label="Akademik Yıl"
            required
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setClassModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingClass}>
              Sınıfı Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Subject */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title="Yeni Ders Müfredatı"
        subtitle="Ders adı ve benzersiz branş kodu"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
          <Input
            label="Ders Adı"
            required
            placeholder="Örn: Matematik"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
          />
          <Input
            label="Ders Kodu (Benzersiz)"
            required
            placeholder="Örn: MAT-1"
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setSubjectModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingSubject}>
              Dersi Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Schedule Item with Conflict Prevention */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Ders Çizelgesi Ataması"
        subtitle="Öğretmen, sınıf ve ders saat eşleştirmesi"
        maxWidth="md"
      >
        <form onSubmit={handleCreateScheduleItem} className="space-y-4 text-xs">
          {scheduleError && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-900 text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scheduleError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sınıf"
              value={schedClassId}
              onChange={(e) => setSchedClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Ders"
              value={schedSubjectId}
              onChange={(e) => setSchedSubjectId(e.target.value)}
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <Select
            label="Öğretmen"
            value={schedTeacherId}
            onChange={(e) => setSchedTeacherId(e.target.value)}
            options={teachers.map((t) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))}
          />

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Gün"
              value={schedDay.toString()}
              onChange={(e) => setSchedDay(Number(e.target.value))}
              options={[
                { value: '1', label: 'Pazartesi' },
                { value: '2', label: 'Salı' },
                { value: '3', label: 'Çarşamba' },
                { value: '4', label: 'Perşembe' },
                { value: '5', label: 'Cuma' },
                { value: '6', label: 'Cumartesi' },
              ]}
            />
            <Input
              label="Ders Saati (1-12)"
              type="number"
              min={1}
              max={12}
              required
              value={schedPeriod}
              onChange={(e) => setSchedPeriod(Number(e.target.value))}
            />
            <Input
              label="Derslik"
              value={schedRoom}
              onChange={(e) => setSchedRoom(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setScheduleModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingSchedule}>
              Programı Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
