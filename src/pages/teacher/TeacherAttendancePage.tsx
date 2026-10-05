import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { academicService } from '../../services/academicService';
import { attendanceService } from '../../services/attendanceService';
import { AcademicClass, Profile, AttendanceStatus } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { CheckSquare, CheckCircle, Save, AlertCircle } from 'lucide-react';

export const TeacherAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Profile[]>([]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState<number>(1);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    academicService.getClasses().then((cls) => {
      setClasses(cls);
      if (cls.length > 0) {
        setSelectedClassId(cls[0].id);
      }
      setLoading(false);
    });
  }, []);

  const loadStudents = useCallback(async (classId: string) => {
    try {
      const studs = await academicService.getClassStudents(classId);
      setStudents(studs);
      // Initialize attendance map with 'present' as default
      const initialMap: Record<string, { status: AttendanceStatus; note: string }> = {};
      studs.forEach((s) => {
        initialMap[s.id] = { status: 'present', note: '' };
      });
      setAttendanceMap(initialMap);
    } catch (err) {
      console.error('Error loading class students:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId, loadStudents]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], note },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!user?.id || !selectedClassId) return;
    setSaving(true);
    setStatusMessage(null);

    const records = Object.entries(attendanceMap).map(([student_id, val]) => ({
      student_id,
      status: val.status,
      note: val.note || undefined,
    }));

    try {
      await attendanceService.saveAttendanceSession(
        selectedClassId,
        user.id,
        date,
        Number(period),
        records
      );
      setStatusMessage('Yoklama başarıyla kaydedildi ve veritabanı kısıtları doğrulandı.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(err.message || 'Yoklama kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Sınıf listesi hazırlanıyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Yoklama Yönetimi</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Derslik Yoklama Girişi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Seçilen tarih ve saat için öğrenci katılım durumunu (Var, Yok, Geç, İzinli) kaydedin.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveAttendance}
          isLoading={saving}
          disabled={students.length === 0}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Yoklamayı Kaydet
        </Button>
      </div>

      {statusMessage && (
        <div className="p-3 rounded bg-zinc-900 border border-zinc-750 text-xs text-amber-400">
          {statusMessage}
        </div>
      )}

      {/* Filter / Session Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <Select
          label="Sınıf Şubesi"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.grade_level}. Sınıf)` }))}
        />
        <Input
          label="Yoklama Tarihi"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="Ders Saati (1-12)"
          type="number"
          min={1}
          max={12}
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
        />
      </div>

      {/* Attendance Roster Table */}
      <Card
        title={`Öğrenci Listesi (${students.length})`}
        subtitle="Öğrencinin derse katılım durumunu işaretleyin"
      >
        {students.length === 0 ? (
          <EmptyState
            title="Sınıfta Öğrenci Yok"
            description="Bu şubeye henüz atanmış öğrenci bulunmuyor. Yönetici panelinden öğrenci ataması yapabilirsiniz."
            icon={<CheckSquare className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Öğrenci No / Ad Soyad</th>
                  <th className="py-2.5 px-3">E-Posta</th>
                  <th className="py-2.5 px-3">Katılım Durumu</th>
                  <th className="py-2.5 px-3">Açıklama / Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {students.map((student) => {
                  const currentStatus = attendanceMap[student.id]?.status || 'present';
                  const currentNote = attendanceMap[student.id]?.note || '';

                  return (
                    <tr key={student.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 px-3 font-sans font-semibold text-zinc-200">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{student.email}</td>
                      <td className="py-3 px-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((st) => {
                            const isSelected = currentStatus === st;
                            const labels = {
                              present: 'Var',
                              absent: 'Yok',
                              late: 'Geç',
                              excused: 'İzinli',
                            };
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(student.id, st)}
                                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                                  isSelected
                                    ? st === 'present'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : st === 'absent'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                                }`}
                              >
                                {labels[st]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <input
                          type="text"
                          placeholder="İsteğe bağlı not..."
                          value={currentNote}
                          onChange={(e) => handleNoteChange(student.id, e.target.value)}
                          className="bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 w-full max-w-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
