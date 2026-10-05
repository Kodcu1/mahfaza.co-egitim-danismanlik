import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { rewardService } from '../../services/rewardService';
import { coachTaskService } from '../../services/coachTaskService';
import { RewardRequest, CoachTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Gift,
  Award,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ClipboardList,
  User,
  Calendar,
} from 'lucide-react';

export const CoachApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'rewards'>('tasks');
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [pendingTasks, setPendingTasks] = useState<CoachTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal State for Rewards
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RewardRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected'>('approved');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Task Reject Modal State
  const [taskRejectModalOpen, setTaskRejectModalOpen] = useState(false);
  const [selectedTaskForReject, setSelectedTaskForReject] = useState<CoachTask | null>(null);
  const [taskRejectReason, setTaskRejectReason] = useState('');
  const [taskProcessingId, setTaskProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [assignedStudents, coachTasks] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        coachTaskService.getTasksForCoach(user.id),
      ]);
      const studentIds = assignedStudents.map((s) => s.id);

      if (studentIds.length > 0) {
        const reqs = await rewardService.getCoachPendingRequests(studentIds);
        setRequests(reqs);
      } else {
        setRequests([]);
      }

      const tasksToReview = coachTasks.filter(
        (t) => t.status === 'pending_review' || t.status === 'submitted' || t.status === 'completed'
      );
      setPendingTasks(tasksToReview);
    } catch (err) {
      console.error('Error loading coach approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDecision = (req: RewardRequest, type: 'approved' | 'rejected') => {
    setSelectedRequest(req);
    setDecisionType(type);
    setAdminNote('');
    setFeedback(null);
    setErrorFeedback(null);
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setProcessing(true);
    setFeedback(null);
    setErrorFeedback(null);

    try {
      if (decisionType === 'approved') {
        // Atomic database procedure: deducts wallet_xp atomically without touching lifetime_xp
        await rewardService.approveRewardAtomic(selectedRequest.id, adminNote.trim() || undefined);
        setFeedback('Ödül talebi onaylandı ve XP cüzdanından atomik olarak düşüldü.');
      } else {
        // Reject request with note
        await rewardService.rejectRewardRequest(
          selectedRequest.id,
          adminNote.trim() || 'Koç tarafından reddedildi.'
        );
        setFeedback('Ödül talebi reddedildi.');
      }

      await loadData();
      setTimeout(() => {
        setDecisionModalOpen(false);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      setErrorFeedback(err.message || 'İşlem sırasında bir hata meydana geldi.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    if (!user?.id) return;
    setTaskProcessingId(taskId);
    try {
      await coachTaskService.verifyTaskAndAwardXP(taskId, user.id);
      await loadData();
    } catch (err: any) {
      console.error('Task verify error:', err);
    } finally {
      setTaskProcessingId(null);
    }
  };

  const handleOpenTaskReject = (task: CoachTask) => {
    setSelectedTaskForReject(task);
    setTaskRejectReason('');
    setTaskRejectModalOpen(true);
  };

  const handleConfirmTaskReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedTaskForReject) return;
    setProcessing(true);
    try {
      await coachTaskService.rejectTask(selectedTaskForReject.id, user.id, taskRejectReason.trim() || undefined);
      setTaskRejectModalOpen(false);
      setSelectedTaskForReject(null);
      setTaskRejectReason('');
      await loadData();
    } catch (err) {
      console.error('Task reject error:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingState message="Ödül ve XP onay merkezi yükleniyor..." />;
  }

  const pendingRewardCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            Ödül & Hak Ediş Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            XP & Ödül Onayları
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrenci görev teslimlerini inceleyip XP hak edişlerini onaylayın; mağaza ödül taleplerini yönetin.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 p-2 px-3 rounded-lg font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Atomik Veritabanı Prosedürü</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'tasks'
              ? 'bg-zinc-800 text-amber-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Görev Teslim Onayları</span>
          {pendingTasks.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
              {pendingTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'rewards'
              ? 'bg-zinc-800 text-amber-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Ödül Talepleri</span>
          {pendingRewardCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              {pendingRewardCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'tasks' ? (
        pendingTasks.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-zinc-100">Onay Bekleyen Görev Yok</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Öğrencileriniz görevlerini teslim ettiklerinde burada listelenir. Görevi onayladığınızda öğrenciye XP aktarılır.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl bg-zinc-900/90 border border-amber-500/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm text-zinc-100">{task.title}</h3>
                    <Badge variant="warning">Onay Bekliyor</Badge>
                  </div>

                  {task.description && (
                    <p className="text-xs text-zinc-400 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {task.student_note && (
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
                        Teslim Tarihi: {new Date(task.completed_at).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Award className="w-3.5 h-3.5" />
                      +{task.xp_reward} XP
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs text-rose-400 border-rose-900/50 hover:bg-rose-950/50"
                    leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenTaskReject(task)}
                  >
                    Reddet
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    isLoading={taskProcessingId === task.id}
                    disabled={!!taskProcessingId}
                    onClick={() => handleApproveTask(task.id)}
                  >
                    Onayla & XP Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : requests.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-100">Bekleyen Talep Yok</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Danışanlarınızdan gelen onay bekleyen ödül veya hak ediş talebi bulunmamaktadır.
          </p>
        </Card>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] border-b border-zinc-800 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Danışan Öğrenci</th>
                  <th className="py-2.5 px-3">Talep Edilen Ödül</th>
                  <th className="py-2.5 px-3">Gerekli XP</th>
                  <th className="py-2.5 px-3">Talep Tarihi</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">Karar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-100">
                        {req.student?.first_name} {req.student?.last_name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {req.student?.email}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        {req.reward?.title || 'Ödül'}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {req.reward?.category || 'Genel'}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-amber-400">
                        {req.cost_xp || req.reward?.cost_xp || req.reward?.xp_price || 0} XP
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">
                      {new Date(req.requested_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {req.status === 'approved'
                          ? 'Onaylandı'
                          : req.status === 'rejected'
                          ? 'Reddedildi'
                          : 'Bekliyor'}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOpenDecision(req, 'approved')}
                          >
                            Onayla
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOpenDecision(req, 'rejected')}
                          >
                            Reddet
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono italic">
                          İşlem yapıldı
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Decision Modal */}
      {decisionModalOpen && selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setDecisionModalOpen(false)}
          title={
            decisionType === 'approved'
              ? `Ödül Talebini Onayla: ${selectedRequest.reward?.title}`
              : `Ödül Talebini Reddet: ${selectedRequest.reward?.title}`
          }
          maxWidth="md"
        >
          <form onSubmit={handleConfirmDecision} className="space-y-4">
            {feedback && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{feedback}</span>
              </div>
            )}

            {errorFeedback && (
              <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorFeedback}</span>
              </div>
            )}

            <div className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Öğrenci:</span>
                <span className="font-semibold text-zinc-200">
                  {selectedRequest.student?.first_name} {selectedRequest.student?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Ödül:</span>
                <span className="font-semibold text-amber-400">
                  {selectedRequest.reward?.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">XP Tutarı:</span>
                <span className="font-mono text-zinc-200">
                  {selectedRequest.reward?.xp_price} Wallet XP
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                {decisionType === 'approved' ? 'Koç Onay Notu (Opsiyonel)' : 'Red Gerekçesi (Zorunlu)'}
              </label>
              <textarea
                rows={2}
                required={decisionType === 'rejected'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  decisionType === 'approved'
                    ? 'Tebrikler! Ödülün onaylandı.'
                    : 'Yetersiz çalışma süresi veya devamsızlık...'
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setDecisionModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant={decisionType === 'approved' ? 'primary' : 'danger'}
                size="sm"
                type="submit"
                isLoading={processing}
              >
                {decisionType === 'approved' ? 'Onayla ve Düş' : 'Talebi Reddet'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Task Reject Modal */}
      {taskRejectModalOpen && selectedTaskForReject && (
        <Modal
          isOpen={true}
          onClose={() => {
            setTaskRejectModalOpen(false);
            setSelectedTaskForReject(null);
            setTaskRejectReason('');
          }}
          title="Görevi Reddet / Revizyon İste"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmTaskReject} className="space-y-4 text-xs">
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
                value={taskRejectReason}
                onChange={(e) => setTaskRejectReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setTaskRejectModalOpen(false);
                  setSelectedTaskForReject(null);
                  setTaskRejectReason('');
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
                isLoading={processing}
                disabled={processing || !taskRejectReason.trim()}
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
