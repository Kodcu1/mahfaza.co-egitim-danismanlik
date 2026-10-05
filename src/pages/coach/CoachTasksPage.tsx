import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { coachTaskService } from '../../services/coachTaskService';
import { CoachTask, Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Award,
  AlertTriangle,
  User,
  XCircle,
} from 'lucide-react';

export const CoachTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'pending' | 'approved'>('all');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedTaskForReject, setSelectedTaskForReject] = useState<CoachTask | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);

  // New Task Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [xpReward, setXpReward] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [studs, tList] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        coachTaskService.getTasksForCoach(user.id),
      ]);
      setAssignedStudents(studs);
      setTasks(tList);
      if (studs.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studs[0].id);
      }
    } catch (err) {
      console.error('Error loading coach tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedStudentId || !title.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    const studentObj = assignedStudents.find((s) => s.id === selectedStudentId);

    try {
      await coachTaskService.createTask({
        coach_id: user.id,
        student_id: selectedStudentId,
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: new Date(dueDate).toISOString(),
        xp_reward: Number(xpReward),
        student: studentObj,
      });

      setFeedback('Görev başarıyla oluşturuldu ve öğrenciye atandı!');
      setTitle('');
      setDescription('');
      await loadData();
      setTimeout(() => {
        setCreateModalOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setFeedback(err.message || 'Görev oluşturulurken hata meydana geldi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (taskId: string) => {
    if (!user?.id) return;
    setVerifyingTaskId(taskId);
    try {
      await coachTaskService.verifyTaskAndAwardXP(taskId, user.id);
      await loadData();
    } catch (err: any) {
      console.error('Verify error:', err);
    } finally {
      setVerifyingTaskId(null);
    }
  };

  const handleOpenReject = (task: CoachTask) => {
    setSelectedTaskForReject(task);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedTaskForReject) return;
    setRejecting(true);
    try {
      await coachTaskService.rejectTask(selectedTaskForReject.id, user.id, rejectionReason.trim() || undefined);
      setRejectModalOpen(false);
      setSelectedTaskForReject(null);
      setRejectionReason('');
      await loadData();
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setRejecting(false);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await coachTaskService.cancelTask(taskId);
      await loadData();
    } catch (err) {
      console.error('Cancel error:', err);
    }
  };

  if (loading) {
    return <LoadingState message="Koçluk görevleri yükleniyor..." />;
  }

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'approved') return t.status === 'approved' || t.status === 'verified';
    if (statusFilter === 'pending_review') return t.status === 'pending_review' || t.status === 'submitted' || t.status === 'completed';
    if (statusFilter === 'pending') return t.status === 'pending';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Akademik Görevlendirme
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Koçluk Görevleri
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrencilerinize kişiselleştirilmiş hedefler, konu tekrarları ve soru çözüm ödevleri atayın; tamamlanan görevleri XP ile ödüllendirin.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          disabled={assignedStudents.length === 0}
        >
          Yeni Görev Ata
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'pending_review', 'pending', 'approved'] as const).map((st) => {
          const pendingReviewCount = tasks.filter((t) => t.status === 'pending_review' || t.status === 'submitted' || t.status === 'completed').length;
          const pendingCount = tasks.filter((t) => t.status === 'pending').length;
          const approvedCount = tasks.filter((t) => t.status === 'approved' || t.status === 'verified').length;

          return (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-zinc-800 text-amber-400 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {st === 'all'
                ? `Tüm Görevler (${tasks.length})`
                : st === 'pending_review'
                ? `Onay Bekleyenler (${pendingReviewCount})`
                : st === 'pending'
                ? `Teslim Bekleyen (${pendingCount})`
                : `Onaylananlar (${approvedCount})`}
            </button>
          );
        })}
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
          <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-100">Henüz Görev Atanmamış</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Danışanlarınıza çalışma disiplinini artıracak konu tekrarı, soru çözümü veya deneme analizi görevleri atayın.
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setCreateModalOpen(true)}
              disabled={assignedStudents.length === 0}
            >
              Yeni Görev Ata
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isPendingReview = task.status === 'pending_review' || task.status === 'submitted' || task.status === 'completed';
            const isApproved = task.status === 'approved' || task.status === 'verified';
            const isRejected = task.status === 'rejected';
            const isCancelled = task.status === 'cancelled';

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isPendingReview
                    ? 'bg-zinc-900/90 border-amber-500/40 shadow-xs'
                    : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm text-zinc-100 truncate">{task.title}</h3>
                    <Badge
                      variant={
                        isApproved
                          ? 'success'
                          : isPendingReview
                          ? 'warning'
                          : isRejected
                          ? 'danger'
                          : isCancelled
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {isApproved
                        ? 'Onaylandı (+XP Verildi)'
                        : isPendingReview
                        ? 'Onay Bekliyor'
                        : isRejected
                        ? 'Revizyon İstendi'
                        : isCancelled
                        ? 'İptal Edildi'
                        : 'Teslim Bekliyor'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-zinc-400 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Student Submission Evidence / Note */}
                  {isPendingReview && task.student_note && (
                    <div className="mt-2 p-2.5 rounded-lg bg-zinc-950/80 border border-amber-500/30 text-xs mb-2">
                      <span className="text-[10px] text-amber-400 font-mono font-semibold uppercase block mb-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Öğrenci Teslim Kanıtı / Notu:
                      </span>
                      <p className="text-zinc-200">{task.student_note}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500 font-mono">
                    <span className="flex items-center gap-1 text-zinc-300">
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      {task.student?.first_name} {task.student?.last_name || 'Öğrenci'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Son Tarih: {new Date(task.due_date).toLocaleDateString('tr-TR')}
                    </span>
                    {task.completed_at && (
                      <span className="flex items-center gap-1 text-sky-400">
                        <Clock className="w-3.5 h-3.5" />
                        Teslim: {new Date(task.completed_at).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Award className="w-3.5 h-3.5" />
                      +{task.xp_reward} XP
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isPendingReview && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/50"
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenReject(task)}
                      >
                        Reddet
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        isLoading={verifyingTaskId === task.id}
                        disabled={!!verifyingTaskId}
                        onClick={() => handleVerify(task.id)}
                      >
                        Onayla
                      </Button>
                    </>
                  )}

                  {task.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-zinc-400 hover:text-rose-400"
                      onClick={() => handleCancel(task.id)}
                    >
                      İptal Et
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {createModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setCreateModalOpen(false)}
          title="Yeni Koçluk Görevi Ata"
          maxWidth="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            {feedback && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{feedback}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Danışan Öğrenci
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                {assignedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Görev Başlığı"
              required
              placeholder="Örn: 2026 TYT Matematik Problemler Çözümü (50 Soru)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Açıklama & Hedef Yönergeleri
              </label>
              <textarea
                rows={3}
                placeholder="Örn: Hız problemleri föyünü tamamla ve yapamadığın soruların video çözümlerini izle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Teslim Tarihi"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Ödül XP Değeri (10 - 150 XP)
                </label>
                <select
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
                >
                  <option value={25}>25 XP (Temel Görev)</option>
                  <option value={50}>50 XP (Standart Görev)</option>
                  <option value={75}>75 XP (Kapsamlı Tekrar)</option>
                  <option value={100}>100 XP (Deneme Sınavı)</option>
                  <option value={150}>150 XP (Maksimum Günlük Kotası)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setCreateModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
              >
                Görevi Ata
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* REJECT TASK MODAL */}
      {rejectModalOpen && selectedTaskForReject && (
        <Modal
          isOpen={true}
          onClose={() => {
            setRejectModalOpen(false);
            setSelectedTaskForReject(null);
            setRejectionReason('');
          }}
          title="Görevi Reddet / Revizyon İste"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <p className="text-zinc-300">
              <strong className="text-zinc-100">{selectedTaskForReject.title}</strong> görevi reddedilecek ve öğrenciye geri bildirim iletilecektir.
              <br />
              <span className="text-amber-400 font-medium">Bu işlem sonucunda öğrenciye XP verilmeyecektir.</span>
            </p>

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Revizyon Gerekçesi / Açıklama
              </label>
              <textarea
                rows={3}
                required
                placeholder="Örn: Soruların çözümleri yüklenmemiş, lütfen çalışma kağıdını ekleyerek tekrar teslim edin..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setSelectedTaskForReject(null);
                  setRejectionReason('');
                }}
              >
                Vazgeç
              </Button>
              <Button
                variant="secondary"
                size="sm"
                type="submit"
                className="text-rose-400 border-rose-900/60 hover:bg-rose-950/60"
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                isLoading={rejecting}
                disabled={rejecting || !rejectionReason.trim()}
              >
                Reddet ve Geri Gönder
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
