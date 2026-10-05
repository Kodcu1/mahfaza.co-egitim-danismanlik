import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { examService } from '../../services/examService';
import { academicService } from '../../services/academicService';
import { Exam, ExamType, AcademicClass, Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Plus, Target, Check, Award } from 'lucide-react';

export const TeacherExamsPage: React.FC = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);

  // New Exam Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [examType, setExamType] = useState<ExamType>('TYT');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [classId, setClassId] = useState('');
  const [savingExam, setSavingExam] = useState(false);

  // Record Result Modal
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [turkishNet, setTurkishNet] = useState(30);
  const [mathNet, setMathNet] = useState(25);
  const [socialNet, setSocialNet] = useState(15);
  const [scienceNet, setScienceNet] = useState(15);
  const [score, setScore] = useState(410);
  const [recording, setRecording] = useState(false);
  const [resultFeedback, setResultFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [exList, cls] = await Promise.all([
        examService.getExams(),
        academicService.getClasses(),
      ]);
      setExams(exList);
      setClasses(cls);
      if (cls.length > 0) setClassId(cls[0].id);
    } catch (err) {
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingExam(true);
    try {
      await examService.createExam({
        title: title.trim(),
        exam_type: examType,
        exam_date: examDate,
        class_id: classId || undefined,
        created_by: user.id,
      });
      setCreateModalOpen(false);
      setTitle('');
      await loadData();
    } catch (err: any) {
      setResultFeedback(err.message || 'Sınav oluşturulamadı.');
    } finally {
      setSavingExam(false);
    }
  };

  const openRecordModal = async (exam: Exam) => {
    setSelectedExam(exam);
    setResultFeedback(null);
    if (exam.class_id) {
      const studs = await academicService.getClassStudents(exam.class_id);
      setStudents(studs);
      if (studs.length > 0) setSelectedStudentId(studs[0].id);
    }
  };

  const handleSaveResult = async () => {
    if (!selectedExam || !selectedStudentId) return;
    setRecording(true);
    setResultFeedback(null);

    try {
      await examService.recordExamResult({
        exam_id: selectedExam.id,
        student_id: selectedStudentId,
        turkish_net: Number(turkishNet),
        math_net: Number(mathNet),
        social_net: Number(socialNet),
        science_net: Number(scienceNet),
        score: Number(score),
      });

      setResultFeedback('Öğrenci sınav netleri ve puanı başarıyla kaydedildi.');
      setTimeout(() => {
        setSelectedExam(null);
        setResultFeedback(null);
      }, 1500);
    } catch (err: any) {
      setResultFeedback(err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setRecording(false);
    }
  };

  if (loading) {
    return <LoadingState message="Sınavlar yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Sınav & Net Takibi</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Deneme Sınavları & Net Girişi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            TYT, AYT ve LGS denemeleri tanımlayın ve öğrenci netlerini kaydedin.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Yeni Sınav Oluştur
        </Button>
      </div>

      <Card
        title={`Tanımlı Deneme Sınavları (${exams.length})`}
        subtitle="Kurum genelinde veya sınıfa özel tanımlanmış sınavlar"
      >
        {exams.length === 0 ? (
          <EmptyState
            title="Sınav Bulunmuyor"
            description="Henüz bir deneme sınavı tanımlanmadı."
            actionText="Yeni Sınav Tanımla"
            onAction={() => setCreateModalOpen(true)}
            icon={<Target className="w-8 h-8 text-zinc-500" />}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {exams.map((ex) => (
              <div key={ex.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-amber-400 font-bold">{ex.exam_type}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400">{new Date(ex.exam_date).toLocaleDateString('tr-TR')}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-500">Sınıf: {ex.class_name || 'Tüm Kurum'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 mt-1">{ex.title}</h4>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openRecordModal(ex)}
                  leftIcon={<Award className="w-3.5 h-3.5" />}
                >
                  Net Girişi Yap
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: New Exam */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yeni Deneme Sınavı"
        subtitle="Sınav türü ve uygulama tarihi"
        maxWidth="sm"
      >
        <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
          <Input
            label="Sınav Başlığı"
            required
            placeholder="Örn: Türkiye Geneli Özdebir TYT-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <Select
            label="Sınav Formatı"
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamType)}
            options={[
              { value: 'TYT', label: 'TYT (Temel Yeterlilik Testi)' },
              { value: 'AYT', label: 'AYT (Alan Yeterlilik Testi)' },
              { value: 'LGS', label: 'LGS (Liselere Giriş Sınavı)' },
            ]}
          />

          <Input
            label="Uygulama Tarihi"
            type="date"
            required
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />

          <Select
            label="Hedef Sınıf (İsteğe Bağlı)"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[
              { value: '', label: 'Tüm Kurum' },
              ...classes.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingExam}>
              Sınavı Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Record Results */}
      <Modal
        isOpen={Boolean(selectedExam)}
        onClose={() => setSelectedExam(null)}
        title="Öğrenci Net Girişi"
        subtitle={selectedExam?.title}
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <Select
            label="Öğrenci"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Türkçe Net"
              type="number"
              step="0.25"
              min={0}
              value={turkishNet}
              onChange={(e) => setTurkishNet(Number(e.target.value))}
            />
            <Input
              label="Matematik Net"
              type="number"
              step="0.25"
              min={0}
              value={mathNet}
              onChange={(e) => setMathNet(Number(e.target.value))}
            />
            <Input
              label="Sosyal Net"
              type="number"
              step="0.25"
              min={0}
              value={socialNet}
              onChange={(e) => setSocialNet(Number(e.target.value))}
            />
            <Input
              label="Fen Net"
              type="number"
              step="0.25"
              min={0}
              value={scienceNet}
              onChange={(e) => setScienceNet(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            <Input
              label="Hesaplanan Puan"
              type="number"
              step="0.5"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
            />
            <div className="flex flex-col justify-end">
              <span className="text-zinc-500 text-[10px]">Otomatik Toplam Net:</span>
              <span className="text-base font-bold font-mono text-amber-400">
                {(Number(turkishNet) + Number(mathNet) + Number(socialNet) + Number(scienceNet)).toFixed(2)} Net
              </span>
            </div>
          </div>

          {resultFeedback && (
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400 font-medium text-center">
              {resultFeedback}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedExam(null)}>
              Kapat
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveResult}
              isLoading={recording}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Sonucu Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
