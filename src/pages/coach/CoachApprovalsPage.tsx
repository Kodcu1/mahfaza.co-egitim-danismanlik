import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { rewardService } from '../../services/rewardService';
import { coachTaskService } from '../../services/coachTaskService';
import { studyProofService } from '../../services/studyProofService';
import { supabase } from '../../lib/supabase';
import { RewardRequest, CoachTask, StudyProof } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
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
  Camera,
  Eye,
  Filter,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const CoachApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'proofs' | 'tasks' | 'rewards'>('proofs');
  const [proofFilter, setProofFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const [studyProofs, setStudyProofs] = useState<StudyProof[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [pendingTasks, setPendingTasks] = useState<CoachTask[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Lightbox / Proof inspection modal
  const [inspectProof, setInspectProof] = useState<StudyProof | null>(null);

  // Proof Reject Modal
  const [rejectProofModalOpen, setRejectProofModalOpen] = useState(false);
  const [proofToReject, setProofToReject] = useState<StudyProof | null>(null);
  const [proofRejectFeedback, setProofRejectFeedback] = useState('');
  const [processingProofId, setProcessingProofId] = useState<string | null>(null);

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

  // Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [students, coachTasks] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        coachTaskService.getTasksForCoach(user.id),
      ]);
      setAssignedStudents(students);
      const studentIds = students.map((s) => s.id);

      // Load Study Proofs & Rewards in parallel
      const [proofs, reqs] = await Promise.all([
        studyProofService.getCoachStudyProofs(user.id, studentIds),
        studentIds.length > 0 ? rewardService.getCoachPendingRequests(studentIds) : Promise.resolve([]),
      ]);

      setStudyProofs(proofs || []);
      setRequests(reqs || []);

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

  // Proof Actions
  const handleApproveProof = async (proof: StudyProof) => {
    if (!user?.id) return;
    setProcessingProofId(proof.id);
    try {
      const res = await studyProofService.reviewStudyProof(proof.id, 'approved', '', user.id, proof);
      const grantedXP = res.awardedXP || proof.calculated_xp || 25;
      setStudyProofs((prev) =>
        prev.map((p) => (p.id === proof.id ? { ...p, status: 'approved', reviewed_at: new Date().toISOString() } : p))
      );
      setToastMessage({
        type: 'success',
        text: `Fotoğraflı kanıt onaylandı! Öğrenci cüzdanına +${grantedXP} XP yatırıldı.`,
      });
      await loadData();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Onaylama sırasında bir hata oluştu.',
      });
    } finally {
      setProcessingProofId(null);
    }
  };

  const handleOpenRejectProof = (proof: StudyProof) => {
    setProofToReject(proof);
    setProofRejectFeedback('');
    setRejectProofModalOpen(true);
  };

  const handleConfirmRejectProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !proofToReject) return;
    setProcessingProofId(proofToReject.id);
    try {
      await studyProofService.reviewStudyProof(
        proofToReject.id,
        'rejected',
        proofRejectFeedback.trim() || 'Fotoğraf net değil veya yetersiz.',
        user.id,
        proofToReject
      );
      setStudyProofs((prev) =>
        prev.map((p) =>
          p.id === proofToReject.id
            ? {
                ...p,
                status: 'rejected',
                coach_feedback: proofRejectFeedback.trim() || 'Fotoğraf net değil veya yetersiz.',
                reviewed_at: new Date().toISOString(),
              }
            : p
        )
      );
      setToastMessage({
        type: 'success',
        text: 'Çalışma kanıtı geri bildirimiyle birlikte reddedildi.',
      });
      setRejectProofModalOpen(false);
      setProofToReject(null);
      await loadData();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'İşlem başarısız oldu.',
      });
    } finally {
      setProcessingProofId(null);
    }
  };

  const handleDeleteProof = async (proof: StudyProof) => {
    if (!user?.id) return;
    setProcessingProofId(proof.id);
    try {
      const photoUrl = proof.proof_photo_url || '';
      if (photoUrl && !photoUrl.startsWith('data:')) {
        let storagePath: string | null = null;
        const publicMarker = '/storage/v1/object/public/study_proofs/';
        const signedMarker = '/storage/v1/object/sign/study_proofs/';
        if (photoUrl.includes(publicMarker)) {
          storagePath = decodeURIComponent(photoUrl.split(publicMarker)[1]?.split('?')[0] || '');
        } else if (photoUrl.includes(signedMarker)) {
          storagePath = decodeURIComponent(photoUrl.split(signedMarker)[1]?.split('?')[0] || '');
        } else if (!photoUrl.startsWith('http')) {
          storagePath = photoUrl;
        }
        if (storagePath) {
          await supabase.storage.from('study_proofs').remove([storagePath]);
        }
      }
      await supabase.from('study_proofs').delete().eq('id', proof.id);
      const studentIds = assignedStudents.map((s) => s.id);
      await studyProofService.deleteStudyProof(proof, user.id, studentIds).catch(() => {});

      setStudyProofs((prev) => prev.filter((p) => p.id !== proof.id));
      if (inspectProof?.id === proof.id) {
        setInspectProof(null);
      }
      setToastMessage({
        type: 'success',
        text: 'Çalışma kanıtı ve fotoğraf dosyası sistemden silindi.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mahfaza:counts-updated'));
      }
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Kayıt silinirken bir hata oluştu.',
      });
    } finally {
      setProcessingProofId(null);
    }
  };

  // Reward Decision Actions
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
        await rewardService.approveRewardAtomic(selectedRequest.id, adminNote.trim() || undefined);
        setFeedback('Ödül talebi onaylandı ve XP cüzdanından atomik olarak düşüldü.');
      } else {
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

  // Task Actions
  const handleApproveTask = async (taskId: string) => {
    if (!user?.id) return;
    setTaskProcessingId(taskId);
    try {
      await coachTaskService.verifyTaskAndAwardXP(taskId, user.id);
      setToastMessage({
        type: 'success',
        text: 'Görev teslimi onaylandı ve XP tanımlandı!',
      });
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

  const pendingProofsCount = studyProofs.filter((p) => p.status === 'pending').length;
  const pendingRewardCount = requests.filter((r) => r.status === 'pending').length;
  const pendingTaskCount = pendingTasks.length;

  const filteredProofs = studyProofs.filter((p) => {
    if (proofFilter === 'all') return true;
    return p.status === proofFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            Doğrulama & Hak Ediş Masası
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            XP, Kanıt & Ödül Onayları
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Öğrencilerin fotoğraflı çalışma kanıtlarını denetleyin; görev ve mağaza ödül taleplerini sonuçlandırın.
          </p>
        </div>

        {/* Status Highlights */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-600" />
            <span className="text-amber-900 font-bold">{pendingProofsCount} Kanıt Bekliyor</span>
          </div>
          {pendingRewardCount > 0 && (
            <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl px-3.5 py-1.5 flex items-center gap-2">
              <Gift className="w-4 h-4 text-indigo-600" />
              <span className="text-indigo-900 font-bold">{pendingRewardCount} Ödül Talebi</span>
            </div>
          )}
        </div>
      </div>

      {/* Modern Executive Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('proofs')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'proofs'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Fotoğraflı Çalışma Kanıtları</span>
          {pendingProofsCount > 0 && (
            <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
              {pendingProofsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tasks'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Koçluk Görevleri</span>
          {pendingTaskCount > 0 && (
            <span className="bg-slate-200 text-slate-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
              {pendingTaskCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'rewards'
              ? 'border-amber-500 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Ödül Talepleri</span>
          {pendingRewardCount > 0 && (
            <span className="bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
              {pendingRewardCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT: STUDY PROOFS */}
      {activeTab === 'proofs' && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: 'pending', label: 'Onay Bekleyenler' },
                  { key: 'approved', label: 'Onaylananlar' },
                  { key: 'rejected', label: 'Reddedilenler' },
                  { key: 'all', label: 'Tüm Kanıtlar' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setProofFilter(f.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    proofFilter === f.key
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-medium">
              {filteredProofs.length} sonuç listeleniyor
            </span>
          </div>

          {filteredProofs.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center border-dashed border-slate-200 bg-white">
              <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-800">
                {proofFilter === 'pending'
                  ? 'Onay Bekleyen Fotoğraflı Kanıt Yok'
                  : 'Bu Filtrede Kanıt Bulunmuyor'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Danışan öğrencileriniz çalışma seanslarını tamamlayıp fotoğraflı föy yüklediklerinde burada
                listelenecektir.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProofs.map((proof) => {
                const student = assignedStudents.find((s) => s.id === proof.student_id);
                const studentName =
                  student?.first_name || student?.full_name
                    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                    : 'Danışan Öğrenci';

                const statusStyles = {
                  pending: { label: 'Onay Bekliyor', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                  approved: { label: 'Onaylandı', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  rejected: { label: 'Reddedildi', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
                };
                const config = statusStyles[proof.status] || statusStyles.pending;

                return (
                  <Card key={proof.id} className="hover:border-slate-300 transition-all flex flex-col justify-between">
                    <div>
                      {/* Student Info & Status */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {studentName.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">
                              {studentName}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(proof.created_at).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg}`}
                          >
                            {config.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteProof(proof)}
                            disabled={processingProofId === proof.id}
                            title="Kaydı Sil"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Kaydı Sil</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Body: Photo & Subject details */}
                      <div className="py-3 flex gap-3.5">
                        <div
                          onClick={() => setInspectProof(proof)}
                          className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                        >
                          <img
                            src={proof.proof_photo_url}
                            alt="Kanıt Önizleme"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{proof.subject_name}</span>
                            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg text-xs">
                              +{proof.calculated_xp} XP
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                            <span>{proof.duration_minutes} dk süre</span>
                            {proof.question_count > 0 && (
                              <>
                                <span>&bull;</span>
                                <span>{proof.question_count} soru</span>
                              </>
                            )}
                          </div>

                          {proof.study_note ? (
                            <p className="text-xs text-slate-600 line-clamp-2 italic pt-0.5">
                              "{proof.study_note}"
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not eklenmedi.</span>
                          )}

                          {proof.coach_feedback && (
                            <div className="mt-1 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                              <span className="text-[10px] font-bold text-slate-400 block">
                                Geri Bildiriminiz:
                              </span>
                              {proof.coach_feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions for Proof */}
                    {proof.status === 'pending' && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRejectProof(proof)}
                          disabled={processingProofId === proof.id}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Reddet / Not Ekle
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          isLoading={processingProofId === proof.id}
                          onClick={() => handleApproveProof(proof)}
                        >
                          Onayla & XP Tanımla
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {pendingTasks.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center border-dashed border-slate-200 bg-white">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-800">Bekleyen Görev Teslimi Yok</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Tüm öğrenci görev teslimleri incelenmiş ve sonuçlandırılmıştır.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTasks.map((task) => (
                <Card key={task.id} className="hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                        <span className="text-[11px] text-slate-500">
                          {task.student?.first_name} {task.student?.last_name}
                        </span>
                      </div>
                      <Badge variant="warning">İnceleme Bekliyor</Badge>
                    </div>

                    <div className="py-3 space-y-2 text-xs">
                      {task.description && <p className="text-slate-600">{task.description}</p>}
                      {task.student_note && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 block">Öğrenci Notu:</span>
                          <p className="text-slate-800 italic">"{task.student_note}"</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs font-mono pt-1">
                        <span className="text-slate-400">Son Teslim: {task.due_date}</span>
                        <span className="font-bold text-amber-700">+{task.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTaskReject(task)}
                      className="text-rose-600 hover:bg-rose-50"
                    >
                      Reddet
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      isLoading={taskProcessingId === task.id}
                      onClick={() => handleApproveTask(task.id)}
                    >
                      Onayla & XP Ver
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: REWARDS */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center border-dashed border-slate-200 bg-white">
              <Gift className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-800">Bekleyen Ödül Talebi Yok</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Danışanlarınızdan gelen onay bekleyen mağaza ödül talebi bulunmamaktadır.
              </p>
            </Card>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-3 px-4">Danışan Öğrenci</th>
                      <th className="py-3 px-4">Talep Edilen Ödül</th>
                      <th className="py-3 px-4">Gerekli XP</th>
                      <th className="py-3 px-4">Talep Tarihi</th>
                      <th className="py-3 px-4">Durum</th>
                      <th className="py-3 px-4 text-right">Karar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {req.student?.first_name} {req.student?.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {req.student?.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Gift className="w-3.5 h-3.5 text-amber-500" />
                            {req.reward?.title || 'Ödül'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {req.reward?.category || 'Genel'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-700">
                            {req.cost_xp || req.reward?.cost_xp || req.reward?.xp_price || 0} XP
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(req.requested_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-4">
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

                        <td className="py-3 px-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenDecision(req, 'approved')}
                              >
                                Onayla
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleOpenDecision(req, 'rejected')}
                              >
                                Reddet
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono italic">
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
        </div>
      )}

      {/* LIGHTBOX MODAL: FULL PHOTO INSPECTION */}
      {inspectProof && (
        <Modal
          isOpen={true}
          onClose={() => setInspectProof(null)}
          title={`${inspectProof.subject_name} — Çalışma Kanıtı İnceleme`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={inspectProof.proof_photo_url}
                alt="Fotoğraflı Kanıt"
                className="max-h-[70vh] object-contain"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  {inspectProof.duration_minutes} dk Seans &bull; {inspectProof.question_count} Soru
                </span>
                <span className="font-bold text-amber-700 font-mono">+{inspectProof.calculated_xp} XP</span>
              </div>
              {inspectProof.study_note && (
                <p className="text-slate-600 italic">"{inspectProof.study_note}"</p>
              )}
            </div>

            {inspectProof.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    const target = inspectProof;
                    setInspectProof(null);
                    handleOpenRejectProof(target);
                  }}
                  className="text-rose-600 hover:bg-rose-50"
                >
                  Reddet / Not Ekle
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => {
                    const target = inspectProof;
                    setInspectProof(null);
                    handleApproveProof(target);
                  }}
                >
                  Onayla & XP Tanımla
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* PROOF REJECT MODAL */}
      {rejectProofModalOpen && proofToReject && (
        <Modal
          isOpen={true}
          onClose={() => setRejectProofModalOpen(false)}
          title="Çalışma Kanıtını Reddet / İnceleme İste"
          subtitle="Öğrencinin eksikleri giderebilmesi için kısa bir gerekçe girin."
          maxWidth="md"
        >
          <form onSubmit={handleConfirmRejectProof} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Red Gerekçesi / Koç Notu
              </label>
              <textarea
                value={proofRejectFeedback}
                onChange={(e) => setProofRejectFeedback(e.target.value)}
                required
                rows={3}
                placeholder="Örn: Yüklenen görsel bulanık, çözülen soru numaraları ve işaretlemeler netleşince tekrar yükleyiniz."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setRejectProofModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="danger"
                size="md"
                type="submit"
                isLoading={processingProofId === proofToReject.id}
              >
                Kanıtı Reddet
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* REWARD DECISION MODAL */}
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
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{feedback}</span>
              </div>
            )}

            {errorFeedback && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{errorFeedback}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Koç Değerlendirme Notu (İsteğe Bağlı)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={2}
                placeholder="Öğrenciye iletilecek not..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setDecisionModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant={decisionType === 'approved' ? 'primary' : 'danger'}
                size="md"
                type="submit"
                isLoading={processing}
              >
                {decisionType === 'approved' ? 'Talebi Onayla' : 'Talebi Reddet'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* TASK REJECT MODAL */}
      {taskRejectModalOpen && selectedTaskForReject && (
        <Modal
          isOpen={true}
          onClose={() => setTaskRejectModalOpen(false)}
          title="Görevi Reddet"
          maxWidth="md"
        >
          <form onSubmit={handleConfirmTaskReject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reddetme Gerekçesi
              </label>
              <textarea
                value={taskRejectReason}
                onChange={(e) => setTaskRejectReason(e.target.value)}
                rows={3}
                placeholder="Öğrenciye iletilecek geri bildirim..."
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setTaskRejectModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button variant="danger" size="md" type="submit" isLoading={processing}>
                Görevi Reddet
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
