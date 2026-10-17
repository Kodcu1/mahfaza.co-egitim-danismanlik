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
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State: active/pending on main screen by default, completed/approved in separate tab
  const [statusFilter, setStatusFilter] = useState<'active' | 'approved' | 'all'>('active');

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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // 1. Instant local storage cache hydration
    try {
      const rawTasks = localStorage.getItem('mahfaza_tasks');
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTasks(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    try {
      const fetchPromise = (async () => {
        let [studs, tList] = await Promise.all([
          relationshipService.getCoachAssignedStudents(user.id).catch(() => []),
          coachTaskService.getTasksForCoach(user.id, { email: user?.email, profileId: profile?.id }).catch(() => []),
        ]);

        if (!studs || studs.length === 0) {
          studs = await relationshipService.getProfilesByRole('student').catch(() => []);
        }

        setAssignedStudents(studs || []);
        setTasks((prev) => {
          const map = new Map<string, CoachTask>();
          prev.forEach((t) => map.set(t.id, t));
          (tList || []).forEach((t) => map.set(t.id, t));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });

        if (studs && studs.length > 0) {
          setSelectedStudentId((prev) => prev || studs[0].id);
        }
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Notice loading coach tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, profile?.id]);

  useEffect(() => {
    loadData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const handleTaskChange = () => {
      loadData();
    };
    window.addEventListener('mahfaza:task_created', handleTaskChange);
    window.addEventListener('mahfaza:tasks_updated', handleTaskChange);

    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('mahfaza:task_created', handleTaskChange);
      window.removeEventListener('mahfaza:tasks_updated', handleTaskChange);
    };
  }, [loadData]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedStudentId || !title.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    const studentObj = assignedStudents.find((s) => s.id === selectedStudentId);

    try {
      const created = await coachTaskService.createTask({
        coach_id: user.id,
        student_id: selectedStudentId, // Authentic UUID
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: new Date(dueDate).toISOString(),
        xp_reward: Number(xpReward),
        student: studentObj,
        coach: {
          id: user.id,
          full_name: profile?.full_name || profile?.name || user?.user_metadata?.full_name || 'Koç',
          email: user.email,
        },
      });

      // Immediate state update & guarantee card is visible right away
      setTasks((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      setFeedback('Görev başarıyla oluşturuldu ve öğrenciye atandı!');
      setTitle('');
      setDescription('');
      setTimeout(() => {
        setCreateModalOpen(false);
        setFeedback(null);
      }, 1000);

      // Refresh in background and merge with created task
      const freshTasks = await coachTaskService.getTasksForCoach(user.id, { email: user?.email, profileId: profile?.id });
      setTasks((prev) => {
        const map = new Map(freshTasks.map((t) => [t.id, t]));
        map.set(created.id, created);
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
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
    if (!selectedTaskForReject || !rejectionReason.trim()) return;

    setRejecting(true);
    try {
      await coachTaskService.rejectTaskWithFeedback(
        selectedTaskForReject.id,
        user?.id || '',
        rejectionReason.trim()
      );
      setRejectModalOpen(false);
      setSelectedTaskForReject(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
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
    const isApproved = t.status === 'approved' || t.status === 'verified';
    if (statusFilter === 'all') return true;
    if (statusFilter === 'approved') return isApproved;
    return !isApproved;
  });

  const activeCount = tasks.filter((t) => t.status !== 'approved' && t.status !== 'verified').length;
  const approvedCount = tasks.filter((t) => t.status === 'approved' || t.status === 'verified').length;
  const pendingReviewCount = tasks.filter((t) => t.status === 'pending_review' || t.status === 'submitted').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" />
            Akademik Görevlendirme
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Koçluk Görevleri
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Öğrencilerinize kişiselleştirilmiş hedefler, konu tekrarları ve soru çözüm ödevleri atayın; tamamlanan görevleri onaylayarak XP tanımlayın.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Yeni Görev Ata
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('active')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            statusFilter === 'active'
              ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Aktif & Bekleyen Görevler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700 font-bold">
            {activeCount}
          </span>
          {pendingReviewCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
              {pendingReviewCount} Onay Bekliyor
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusFilter('approved')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            statusFilter === 'approved'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Tamamlanan & Onaylananlar</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700 font-bold">
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Tüm Görevler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold">
            {tasks.length}
          </span>
        </button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-slate-200 bg-white">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Henüz Görev Atanmamış</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Danışanlarınıza çalışma disiplinini artıracak konu tekrarı, soru çözümü veya deneme analizi görevleri atayın.
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setCreateModalOpen(true)}
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
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isPendingReview
                    ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                    : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{task.title}</h3>
                    <Badge
                      variant={
                        isApproved
                          ? 'success'
                          : isPendingReview
                          ? 'warning'
                          : isRejected
                          ? 'danger'
                          : 'neutral'
                      }
                    >
                      {isApproved
                        ? 'Onaylandı (+XP)'
                        : isPendingReview
                        ? 'Öğrenci Teslim Etti (Onay Bekliyor)'
                        : isRejected
                        ? 'Revizyon İstendi'
                        : isCancelled
                        ? 'İptal'
                        : 'Devam Ediyor'}
                    </Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}

                  {/* Student Submission Evidence / Note */}
                  {isPendingReview && task.student_note && (
                    <div className="mt-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs mb-2">
                      <span className="text-[10px] text-amber-800 font-semibold uppercase block mb-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Öğrenci Teslim Kanıtı / Notu:
                      </span>
                      <p className="text-slate-800 font-medium">{task.student_note}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      {task.student?.full_name ||
                        task.student?.name ||
                        (task.student?.first_name
                          ? `${task.student.first_name} ${task.student.last_name || ''}`.trim()
                          : '') ||
                        'Öğrenci'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Son Tarih: {new Date(task.due_date).toLocaleDateString('tr-TR')}
                    </span>
                    {task.completed_at && (
                      <span className="flex items-center gap-1 text-sky-600">
                        <Clock className="w-3.5 h-3.5" />
                        Teslim: {new Date(task.completed_at).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-amber-700 font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      +{task.xp_reward} XP
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isPendingReview && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-rose-600 border border-rose-200 hover:bg-rose-50"
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
                        Onayla (+XP)
                      </Button>
                    </>
                  )}

                  {task.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 hover:text-rose-600"
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
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{feedback}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Danışan Öğrenci
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="" disabled>
                  Lütfen danışan öğrenci seçiniz...
                </option>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Açıklama & Hedef Yönergeleri
              </label>
              <textarea
                rows={3}
                placeholder="Örn: Hız problemleri föyünü tamamla ve yapamadığın soruların video çözümlerini izle..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ödül XP Değeri (10 - 150 XP)
                </label>
                <select
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value={25}>25 XP (Temel Görev)</option>
                  <option value={50}>50 XP (Standart Görev)</option>
                  <option value={75}>75 XP (Kapsamlı Tekrar)</option>
                  <option value={100}>100 XP (Deneme Sınavı)</option>
                  <option value={150}>150 XP (Maksimum Günlük Kotası)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
            <p className="text-slate-600">
              <strong className="text-slate-900">{selectedTaskForReject.title}</strong> görevi reddedilecek ve öğrenciye geri bildirim iletilecektir.
              <br />
              <span className="text-amber-700 font-medium">Bu işlem sonucunda öğrenciye XP verilmeyecektir.</span>
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Revizyon Gerekçesi / Açıklama
              </label>
              <textarea
                rows={3}
                required
                placeholder="Örn: Soruların çözümleri yüklenmemiş, lütfen çalışma kağıdını ekleyerek tekrar teslim edin..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                variant="danger"
                size="sm"
                type="submit"
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
