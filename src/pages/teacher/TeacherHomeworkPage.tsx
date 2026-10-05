import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { homeworkService } from '../../services/homeworkService';
import { academicService } from '../../services/academicService';
import { Homework, HomeworkSubmission, AcademicClass, Subject } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Plus, BookOpen, CheckCircle, FileText } from 'lucide-react';

export const TeacherHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // New Homework Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [savingHw, setSavingHw] = useState(false);

  // Grade Submissions Modal
  const [selectedHw, setSelectedHw] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(85);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [homeworkError, setHomeworkError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hws, cls, subs] = await Promise.all([
        homeworkService.getHomeworks(),
        academicService.getClasses(),
        academicService.getSubjects(),
      ]);
      setHomeworks(hws);
      setClasses(cls);
      setSubjects(subs);
      if (cls.length > 0) setClassId(cls[0].id);
      if (subs.length > 0) setSubjectId(subs[0].id);
    } catch (err) {
      console.error('Error loading homeworks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingHw(true);
    try {
      await homeworkService.createHomework({
        class_id: classId,
        teacher_id: user.id,
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        due_at: new Date(dueAt).toISOString(),
      });
      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setDueAt('');
      await loadData();
    } catch (err: any) {
      setHomeworkError(err.message || 'Ödev oluşturulamadı.');
    } finally {
      setSavingHw(false);
    }
  };

  const openSubmissionsModal = async (hw: Homework) => {
    setSelectedHw(hw);
    setLoadingSubmissions(true);
    try {
      const subs = await homeworkService.getSubmissions(hw.id);
      setSubmissions(subs);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleGrade = async (subId: string) => {
    try {
      await homeworkService.gradeSubmission(subId, Number(gradeScore), gradeFeedback);
      if (selectedHw) {
        const subs = await homeworkService.getSubmissions(selectedHw.id);
        setSubmissions(subs);
      }
      setGradingSubmissionId(null);
      setGradeFeedback('');
    } catch (err: any) {
      setHomeworkError(err.message || 'Not kaydedilemedi.');
    }
  };

  if (loading) {
    return <LoadingState message="Ödevler yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Ödev Yönetimi & Değerlendirme</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Ödevler & Notlandırma
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrencilere ödev tanımlayın, teslim edilen çalışmaları inceleyin ve notlandırın.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Yeni Ödev Ver
        </Button>
      </div>

      <Card
        title={`Verilen Ödevler (${homeworks.length})`}
        subtitle="Tanımlanan ödevler ve teslim durumu"
      >
        {homeworks.length === 0 ? (
          <EmptyState
            title="Ödev Bulunmuyor"
            description="Henüz bir ödev tanımlanmadı."
            actionText="Yeni Ödev Ekle"
            onAction={() => setCreateModalOpen(true)}
            icon={<BookOpen className="w-8 h-8 text-zinc-500" />}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {homeworks.map((hw) => (
              <div key={hw.id} className="py-3.5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-amber-400">{hw.subject_name || 'Ders'}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400 font-mono">Son Teslim: {new Date(hw.due_at).toLocaleDateString('tr-TR')}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-500">Sınıf: {hw.class_name || 'Genel'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-100 mt-1">{hw.title}</h4>
                  <p className="text-xs text-zinc-400 mt-1">{hw.description}</p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openSubmissionsModal(hw)}
                  leftIcon={<FileText className="w-3.5 h-3.5" />}
                >
                  Teslimleri İncele
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: New Homework */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yeni Ödev Tanımla"
        subtitle="Sınıfa ait akademik ödev ve son teslim tarihi"
        maxWidth="md"
      >
        <form onSubmit={handleCreateHomework} className="space-y-4 text-xs">
          <Input
            label="Ödev Başlığı"
            required
            placeholder="Örn: Limit ve Süreklilik Fasikül 3 Çözümü"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sınıf"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Ders"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
          </div>

          <Input
            label="Son Teslim Tarihi ve Saati"
            type="datetime-local"
            required
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Ödev Yönergeleri</label>
            <textarea
              rows={4}
              placeholder="Ödev kapsamı, soru numaraları veya kaynak kitap bilgisi..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingHw}>
              Ödevi Yayınla
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Submissions & Grading */}
      <Modal
        isOpen={Boolean(selectedHw)}
        onClose={() => setSelectedHw(null)}
        title="Ödev Teslimleri & Notlandırma"
        subtitle={selectedHw?.title}
        maxWidth="xl"
      >
        {loadingSubmissions ? (
          <LoadingState message="Teslimler getiriliyor..." />
        ) : submissions.length === 0 ? (
          <EmptyState
            title="Henüz Teslim Yok"
            description="Bu ödev için henüz bir öğrenci teslimde bulunmadı."
            icon={<BookOpen className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="space-y-4 text-xs">
            <div className="divide-y divide-zinc-800">
              {submissions.map((sub) => (
                <div key={sub.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-zinc-200">
                        {sub.student?.first_name} {sub.student?.last_name}
                      </span>
                      <span className="text-zinc-500 text-[10px] ml-2">
                        {new Date(sub.submitted_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <Badge variant={sub.status === 'graded' ? 'success' : 'warning'}>
                      {sub.status === 'graded' ? `Not: ${sub.grade}` : 'Değerlendirilmedi'}
                    </Badge>
                  </div>

                  <p className="bg-zinc-950 p-2.5 rounded border border-zinc-850 text-zinc-300 font-mono text-[11px]">
                    {sub.content}
                  </p>

                  {gradingSubmissionId === sub.id ? (
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Not (0-100)"
                          type="number"
                          min={0}
                          max={100}
                          value={gradeScore}
                          onChange={(e) => setGradeScore(Number(e.target.value))}
                        />
                        <Input
                          label="Öğretmen Geri Bildirimi"
                          placeholder="Aferin / Eksikleri tamamla..."
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setGradingSubmissionId(null)}>
                          Vazgeç
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => handleGrade(sub.id)}>
                          Notu Kaydet
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGradingSubmissionId(sub.id);
                          setGradeScore(sub.grade || 85);
                          setGradeFeedback(sub.teacher_feedback || '');
                        }}
                      >
                        {sub.status === 'graded' ? 'Notu Güncelle' : 'Notlandır'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
