import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { homeworkService } from '../../services/homeworkService';
import { coachTaskService } from '../../services/coachTaskService';
import { xpService } from '../../services/xpService';
import { Homework, HomeworkSubmission, CoachTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Check,
  Target,
  Sparkles,
} from 'lucide-react';

type TaskTab = 'all' | 'pending' | 'completed' | 'overdue';

export const StudentHomeworkPage: React.FC = () => {
  const { user } = useAuth();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [coachTasks, setCoachTasks] = useState<CoachTask[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission>>({});
  const [activeTab, setActiveTab] = useState<TaskTab>('pending');
  const [loading, setLoading] = useState(true);

  // Submit Modal for Homework
  const [selectedHw, setSelectedHw] = useState<Homework | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  // Completing Coach Task
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [hwList, userSubs, taskList] = await Promise.all([
        homeworkService.getHomeworks(),
        homeworkService.getStudentSubmissions(user.id),
        coachTaskService.getTasksForStudent(user.id),
      ]);
      setHomeworks(hwList);
      setCoachTasks(taskList);

      const subMap: Record<string, HomeworkSubmission> = {};
      userSubs.forEach((s) => {
        subMap[s.homework_id] = s;
      });
      setSubmissions(subMap);
    } catch (err) {
      console.error('Error fetching homeworks/tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitHomework = async () => {
    if (!user?.id || !selectedHw || !submissionContent.trim()) return;
    setSubmitting(true);
    setSubmitFeedback(null);

    try {
      await homeworkService.submitHomework(selectedHw.id, user.id, submissionContent.trim());

      try {
        await xpService.awardXPAtomic({
          student_id: user.id,
          base_amount: 25,
          action_type: 'homework_completion',
          description: `Ödev teslimi: ${selectedHw.title}`,
        });
      } catch (xpErr) {
        console.warn('XP auto-award note:', xpErr);
      }

      setSubmitFeedback('Ödeviniz başarıyla teslim edildi ve 25 XP hesabınıza işlendi!');
      await loadData();
      setTimeout(() => {
        setSelectedHw(null);
        setSubmissionContent('');
        setSubmitFeedback(null);
      }, 1500);
    } catch (err: any) {
      setSubmitFeedback(err.message || 'Ödev teslim edilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Modal for Coach Task
  const [selectedCoachTask, setSelectedCoachTask] = useState<CoachTask | null>(null);
  const [taskEvidence, setTaskEvidence] = useState('');
  const [coachSubmitting, setCoachSubmitting] = useState(false);
  const [coachSubmitFeedback, setCoachSubmitFeedback] = useState<string | null>(null);

  const handleOpenCoachTaskSubmit = (task: CoachTask) => {
    setSelectedCoachTask(task);
    setTaskEvidence('');
    setCoachSubmitFeedback(null);
  };

  const handleSubmitCoachTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id || !selectedCoachTask) return;
    setCoachSubmitting(true);
    setCoachSubmitFeedback(null);
    try {
      await coachTaskService.completeTaskByStudent(selectedCoachTask.id, user.id, taskEvidence.trim() || undefined);
      setCoachSubmitFeedback('Görev başarıyla teslim edildi! Koçunuzun onayına sunuldu.');
      await loadData();
      setTimeout(() => {
        setSelectedCoachTask(null);
        setTaskEvidence('');
        setCoachSubmitFeedback(null);
      }, 1500);
    } catch (err: any) {
      setCoachSubmitFeedback(err.message || 'Görev teslim edilirken bir hata oluştu.');
    } finally {
      setCoachSubmitting(false);
    }
  };

  const now = new Date();

  // Combine items for unified filtering and listing
  interface UnifiedItem {
    type: 'homework' | 'coach_task';
    id: string;
    title: string;
    description?: string | null;
    due_date: string;
    xp_reward: number;
    badge_label: string;
    is_completed: boolean;
    is_pending_review: boolean;
    is_overdue: boolean;
    status: 'pending' | 'pending_review' | 'completed' | 'overdue';
    originalHw?: Homework;
    originalTask?: CoachTask;
  }

  const unifiedList = useMemo<UnifiedItem[]>(() => {
    const list: UnifiedItem[] = [];

    // 1. Add Coach Assigned Tasks (Real Supabase tasks)
    coachTasks.forEach((task) => {
      const isCompleted = task.status === 'verified' || task.status === 'completed' || task.status === 'approved';
      const isPendingReview = task.status === 'pending_review' || task.status === 'submitted';
      const isOverdue = !isCompleted && !isPendingReview && new Date(task.due_date) < now;
      list.push({
        type: 'coach_task',
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        xp_reward: task.xp_reward,
        badge_label: 'Koç Görevi',
        is_completed: isCompleted,
        is_pending_review: isPendingReview,
        is_overdue: isOverdue,
        status: isCompleted ? 'completed' : isPendingReview ? 'pending_review' : isOverdue ? 'overdue' : 'pending',
        originalTask: task,
      });
    });

    // 2. Add Homeworks
    homeworks.forEach((hw) => {
      const sub = submissions[hw.id];
      const isCompleted = sub && (sub.status === 'submitted' || sub.status === 'graded');
      const isOverdue = !isCompleted && new Date(hw.due_at) < now;
      list.push({
        type: 'homework',
        id: hw.id,
        title: hw.title,
        description: hw.description,
        due_date: hw.due_at,
        xp_reward: 25,
        badge_label: hw.subject_name || 'Ders Ödevi',
        is_completed: isCompleted,
        is_pending_review: false,
        is_overdue: isOverdue,
        status: isCompleted ? 'completed' : isOverdue ? 'overdue' : 'pending',
        originalHw: hw,
      });
    });

    // Sort by due date
    return list.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [coachTasks, homeworks, submissions, now]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return unifiedList;
    return unifiedList.filter((item) => item.status === activeTab);
  }, [unifiedList, activeTab]);

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let overdue = 0;

    unifiedList.forEach((item) => {
      if (item.status === 'completed') completed++;
      else if (item.status === 'overdue') overdue++;
      else pending++;
    });

    return { all: unifiedList.length, pending, completed, overdue };
  }, [unifiedList]);

  if (loading) {
    return <LoadingState message="Akademik görevler ve ödevler yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Akademik Görevler & Koçluk
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Ödevlerim & Görevler
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Koçunuz ve öğretmenleriniz tarafından atanan görevleri zamanında tamamlayarak XP kazanın.
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-zinc-900/80 border border-zinc-800 rounded-lg">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'pending'
              ? 'bg-zinc-800 text-amber-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Aktif Görevler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-amber-300">
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'completed'
              ? 'bg-zinc-800 text-emerald-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Tamamlanan & Onaylananlar</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-emerald-300">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'overdue'
              ? 'bg-zinc-800 text-rose-400 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Gecikenler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-rose-300">
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-zinc-100 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Tümü</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300">
            {counts.all}
          </span>
        </button>
      </div>

      {/* Task List / Cards */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="Görev Bulunmuyor"
          description={
            activeTab === 'pending'
              ? 'Şu anda tamamlanması gereken bekleyen bir görev veya ödev yok.'
              : activeTab === 'completed'
              ? 'Henüz tamamlanmış bir görev kaydınız bulunmamaktadır.'
              : activeTab === 'overdue'
              ? 'Harika! Teslim süresi geçmiş hiçbir göreviniz yok.'
              : 'Henüz atanmış ödev veya koç görevi bulunmamaktadır.'
          }
          icon={<BookOpen className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const dueDateFormatted = new Date(item.due_date).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`bg-zinc-900/70 border rounded-lg p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors ${
                  item.type === 'coach_task'
                    ? 'border-amber-500/30 shadow-xs shadow-amber-950/20'
                    : 'border-zinc-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                            item.type === 'coach_task'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {item.badge_label}
                        </span>
                        {item.type === 'coach_task' && (
                          <span className="text-[11px] text-amber-500/90 flex items-center gap-1 font-medium">
                            <Sparkles className="w-3 h-3" /> Koç Tarafından Atandı
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-zinc-100">{item.title}</h3>
                    </div>

                    {item.is_completed ? (
                      <Badge variant="success">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Tamamlandı
                      </Badge>
                    ) : item.is_overdue ? (
                      <Badge variant="danger">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Süresi Geçti
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <Clock className="w-3 h-3 mr-1" /> Bekliyor
                      </Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-zinc-400 line-clamp-3 mb-3">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Son: {dueDateFormatted}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400 font-mono font-semibold">
                      <Award className="w-3.5 h-3.5" /> +{item.xp_reward} XP
                    </span>
                  </div>

                  {item.is_completed ? (
                    <div className="text-right">
                      <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Onaylandı & XP Eklendi
                      </span>
                    </div>
                  ) : item.type === 'coach_task' && item.is_pending_review ? (
                    <div className="text-right">
                      <span className="text-xs text-amber-400 font-medium inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                        <Clock className="w-3.5 h-3.5" /> Onay Bekliyor
                      </span>
                    </div>
                  ) : item.type === 'coach_task' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => item.originalTask && handleOpenCoachTaskSubmit(item.originalTask)}
                    >
                      Görevi Teslim Et
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => setSelectedHw(item.originalHw || null)}
                    >
                      Ödev Teslim Et
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Homework Submit Modal */}
      {selectedHw && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedHw(null);
            setSubmissionContent('');
            setSubmitFeedback(null);
          }}
          title={selectedHw.title}
          subtitle={`${selectedHw.subject_name || 'Ödev'} &bull; Teslim Tarihi: ${new Date(
            selectedHw.due_at
          ).toLocaleDateString('tr-TR')}`}
        >
          <div className="space-y-4 text-xs">
            {selectedHw.description && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 leading-relaxed">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase block mb-1">
                  Ödev Açıklaması
                </span>
                {selectedHw.description}
              </div>
            )}

            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">
                Çözüm veya Teslim Notunuz <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Ödev çözüm adımlarınızı, sonuçları veya dosya bağlantılarınızı buraya yazın..."
                rows={5}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {submitFeedback && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  submitFeedback.includes('başarıyla')
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {submitFeedback.includes('başarıyla') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{submitFeedback}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedHw(null);
                  setSubmissionContent('');
                  setSubmitFeedback(null);
                }}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="w-3.5 h-3.5" />}
                isLoading={submitting}
                disabled={!submissionContent.trim() || submitting}
                onClick={handleSubmitHomework}
              >
                Ödevi Gönder
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Coach Task Submit Modal */}
      {selectedCoachTask && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedCoachTask(null);
            setTaskEvidence('');
            setCoachSubmitFeedback(null);
          }}
          title={`Görevi Teslim Et: ${selectedCoachTask.title}`}
          subtitle={`Ödül: +${selectedCoachTask.xp_reward} XP &bull; Son Tarih: ${new Date(selectedCoachTask.due_date).toLocaleDateString('tr-TR')}`}
        >
          <div className="space-y-4 text-xs">
            {selectedCoachTask.description && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 leading-relaxed">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase block mb-1">
                  Görev Açıklaması
                </span>
                {selectedCoachTask.description}
              </div>
            )}

            <div>
              <label className="block font-medium text-zinc-300 mb-1">
                Çalışma Özeti / Kanıt Notu (Opsiyonel)
              </label>
              <textarea
                value={taskEvidence}
                onChange={(e) => setTaskEvidence(e.target.value)}
                placeholder="Örn: 80 soru çözüldü, formül kağıdı hazırlandı, drive linki..."
                rows={3}
                className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 text-xs"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px] flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Göreviniz koçunuzun onay paneline iletilecektir. Koçunuz onayladığında +{selectedCoachTask.xp_reward} XP hesabınıza yüklenecektir.</span>
            </div>

            {coachSubmitFeedback && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  coachSubmitFeedback.includes('başarıyla')
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {coachSubmitFeedback.includes('başarıyla') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{coachSubmitFeedback}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCoachTask(null);
                  setTaskEvidence('');
                  setCoachSubmitFeedback(null);
                }}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check className="w-3.5 h-3.5" />}
                isLoading={coachSubmitting}
                disabled={coachSubmitting}
                onClick={handleSubmitCoachTask}
              >
                Görevi Teslim Et
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
