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
  const { user, profile } = useAuth();
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

  // Submit Modal for Coach Task
  const [selectedCoachTask, setSelectedCoachTask] = useState<CoachTask | null>(null);
  const [taskEvidence, setTaskEvidence] = useState('');
  const [coachSubmitting, setCoachSubmitting] = useState(false);
  const [coachSubmitFeedback, setCoachSubmitFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id && !profile?.id) return;
    try {
      setLoading(true);
      const studentPrimaryId = profile?.id || user?.id || '';
      const [hwList, userSubs, taskList] = await Promise.all([
        homeworkService.getHomeworks().catch(() => []),
        homeworkService.getStudentSubmissions(studentPrimaryId).catch(() => []),
        coachTaskService.getTasksForStudent(studentPrimaryId, {
          email: user?.email || profile?.email,
          profileId: profile?.id,
        }).catch(() => []),
      ]);
      setHomeworks(hwList || []);
      setCoachTasks(taskList || []);

      const subMap: Record<string, HomeworkSubmission> = {};
      (userSubs || []).forEach((s) => {
        subMap[s.homework_id] = s;
      });
      setSubmissions(subMap);
    } catch (err) {
      console.error('Error fetching homeworks/tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, profile?.id, profile?.email]);

  useEffect(() => {
    loadData();

    const handleTaskChange = () => {
      loadData();
    };
    window.addEventListener('mahfaza:task_created', handleTaskChange);
    window.addEventListener('mahfaza:tasks_updated', handleTaskChange);
    window.addEventListener('mahfaza:new_notification', handleTaskChange);

    return () => {
      window.removeEventListener('mahfaza:task_created', handleTaskChange);
      window.removeEventListener('mahfaza:tasks_updated', handleTaskChange);
      window.removeEventListener('mahfaza:new_notification', handleTaskChange);
    };
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
      const rawStatus = (task.status || '').toLowerCase();
      const isCompleted = rawStatus === 'verified' || rawStatus === 'completed' || rawStatus === 'approved' || rawStatus === 'tamamlandı';
      const isPendingReview = rawStatus === 'pending_review' || rawStatus === 'submitted' || rawStatus === 'devam ediyor';
      const isOverdue = !isCompleted && !isPendingReview && Boolean(task.due_date) && new Date(task.due_date) < now;
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
    if (activeTab === 'pending') {
      return unifiedList.filter((item) => item.status === 'pending' || item.status === 'pending_review');
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Akademik Görevler & Koçluk
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Ödevlerim & Görevler
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Koçunuz ve branş öğretmenleriniz tarafından atanan görevleri zamanında tamamlayarak XP kazanın.
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Aktif Görevler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-amber-200 text-amber-700 font-bold">
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Tamamlanan & Onaylananlar</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700 font-bold">
            {counts.completed}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Gecikenler</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-rose-200 text-rose-700 font-bold">
            {counts.overdue}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-slate-100 text-slate-900 border border-slate-300 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Tümü</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold">
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
          icon={<BookOpen className="w-8 h-8 text-slate-400" />}
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
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all shadow-xs ${
                  item.type === 'coach_task'
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            item.type === 'coach_task'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.badge_label}
                        </span>
                        {item.type === 'coach_task' && (
                          <span className="text-[11px] text-amber-700 flex items-center gap-1 font-semibold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Koç Görevi
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
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
                    <p className="text-xs text-slate-600 line-clamp-3 mb-3">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Son: {dueDateFormatted}
                    </span>
                    <span className="flex items-center gap-1 text-amber-700 font-mono font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-500" /> +{item.xp_reward} XP
                    </span>
                  </div>

                  {item.is_completed ? (
                    <div className="text-right">
                      <span className="text-xs text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Onaylandı & XP Eklendi
                      </span>
                    </div>
                  ) : item.type === 'coach_task' && item.is_pending_review ? (
                    <div className="text-right">
                      <span className="text-xs text-amber-800 font-semibold inline-flex items-center gap-1 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Onay Bekliyor
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
          subtitle={`${selectedHw.subject_name || 'Ödev'} • Teslim Tarihi: ${new Date(
            selectedHw.due_at
          ).toLocaleDateString('tr-TR')}`}
        >
          <div className="space-y-4 text-xs">
            {selectedHw.description && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Ödev Açıklaması
                </span>
                {selectedHw.description}
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                Çözüm veya Teslim Notunuz <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Ödev çözüm adımlarınızı, sonuçları veya dosya bağlantılarınızı buraya yazın..."
                rows={5}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {submitFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  submitFeedback.includes('başarıyla')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {submitFeedback.includes('başarıyla') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span className="font-semibold">{submitFeedback}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="ghost"
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
          subtitle={`Ödül: +${selectedCoachTask.xp_reward} XP • Son Tarih: ${new Date(selectedCoachTask.due_date).toLocaleDateString('tr-TR')}`}
        >
          <div className="space-y-4 text-xs">
            {selectedCoachTask.description && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Görev Açıklaması
                </span>
                {selectedCoachTask.description}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Çalışma Özeti / Kanıt Notu (Opsiyonel)
              </label>
              <textarea
                value={taskEvidence}
                onChange={(e) => setTaskEvidence(e.target.value)}
                placeholder="Örn: 80 soru çözüldü, formül kağıdı hazırlandı, drive linki..."
                rows={3}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Göreviniz koçunuzun onay paneline iletilecektir. Koçunuz onayladığında +{selectedCoachTask.xp_reward} XP hesabınıza yüklenecektir.</span>
            </div>

            {coachSubmitFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                  coachSubmitFeedback.includes('başarıyla')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {coachSubmitFeedback.includes('başarıyla') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span className="font-semibold">{coachSubmitFeedback}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="ghost"
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
