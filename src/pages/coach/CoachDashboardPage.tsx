import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { rewardService } from '../../services/rewardService';
import { coachTaskService } from '../../services/coachTaskService';
import { subscriptionService } from '../../services/subscriptionService';
import { Profile, StudentXPData, ExamResult, UserSubscription, RewardRequest, CoachTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  Flame,
  Target,
  Sparkles,
  CreditCard,
  CheckSquare,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserPlus,
  TrendingUp,
  Award,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const CoachDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [studentXPMap, setStudentXPMap] = useState<Record<string, StudentXPData | null>>({});
  const [studentExamsMap, setStudentExamsMap] = useState<Record<string, ExamResult[]>>({});
  const [pendingApprovals, setPendingApprovals] = useState<RewardRequest[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<CoachTask[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Add / Pair Student Modal State
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [studs, sub, tasks] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        subscriptionService.getUserSubscription(user.id),
        coachTaskService.getTasksForCoach(user.id),
      ]);

      setAssignedStudents(studs);
      setUserSubscription(sub);
      setUpcomingTasks(tasks.filter((t) => t.status === 'pending').slice(0, 5));

      // Fetch pending reward requests for assigned students
      const studentIds = studs.map((s) => s.id);
      if (studentIds.length > 0) {
        const [approvals] = await Promise.all([
          rewardService.getCoachPendingRequests(studentIds),
        ]);
        setPendingApprovals(approvals.filter((a) => a.status === 'pending'));

        // Load XP and exam metrics
        const xpMap: Record<string, StudentXPData | null> = {};
        const examsMap: Record<string, ExamResult[]> = {};

        for (const s of studs) {
          const [xp, exams] = await Promise.all([
            xpService.getStudentXP(s.id),
            examService.getStudentExamResults(s.id),
          ]);
          xpMap[s.id] = xp;
          examsMap[s.id] = exams;
        }
        setStudentXPMap(xpMap);
        setStudentExamsMap(examsMap);
      } else {
        setPendingApprovals([]);
        setStudentXPMap({});
        setStudentExamsMap({});
      }
    } catch (err) {
      console.error('Error loading coach command center:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Pairing
  const handlePairStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !studentInput.trim()) return;

    setPairingLoading(true);
    setPairError(null);
    setPairSuccess(null);

    try {
      const added = await relationshipService.pairStudentWithCoach(user.id, studentInput.trim());
      setPairSuccess(`'${added.first_name} ${added.last_name}' başarıyla koçluk portföyünüze eklendi!`);
      setStudentInput('');
      await loadData();
      setTimeout(() => {
        setPairModalOpen(false);
        setPairSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPairError(err.message || 'Öğrenci eklenirken bir hata meydana geldi.');
    } finally {
      setPairingLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Koçluk Komuta Merkezi yükleniyor..." />;
  }

  // Calculate students requiring attention (streak <= 1 or no recent exams)
  const studentsRequiringAttention = assignedStudents.filter((s) => {
    const xp = studentXPMap[s.id];
    const exams = studentExamsMap[s.id] || [];
    const lowStreak = !xp || xp.current_streak_days <= 1;
    const noExams = exams.length === 0;
    return lowStreak || noExams;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Akademik Koçluk & Portföy Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Komuta Merkezi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Atanmış danışanlarınızın çalışma disiplini, görev takibi, XP onayları ve net gelişim analizi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Capacity & Subscription Meter */}
          <Link
            to="/pricing"
            className="p-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">
                {userSubscription?.plan?.name || 'Koçluk Lisansı'}
              </div>
              <div className="text-xs font-bold text-zinc-200 font-mono">
                {assignedStudents.length} / {userSubscription?.plan?.student_capacity || 10} Danışan
              </div>
            </div>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setPairModalOpen(true)}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Öğrenci Ekle / Davet Et
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Danışan Portföyü</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {assignedStudents.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Kayıtlı aktif öğrenci</span>
        </div>

        {/* Attention Needed */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Dikkat Gerektiren</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {studentsRequiringAttention.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Düşük streak veya eksik veri</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Bekleyen Onaylar</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {pendingApprovals.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">XP / Ödül talep onayı</span>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 sm:p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Aktif Görevler</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {upcomingTasks.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Teslim bekleyen koçluk görevi</span>
        </div>
      </div>

      {/* EMPTY STATE OR PORTFOLIO OVERVIEW */}
      {assignedStudents.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
          <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Öğrenci Ekleyin</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            Öğrencinizi e-posta adresi veya davet kodu ile portföyünüze ekleyin.
            Öğrencinizin çalışma disiplinini, streak verilerini ve deneme netlerini anında takip edin.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setPairModalOpen(true)}
            >
              Öğrenci Ekle / Davet Et
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Student Portfolio Quick List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Öğrenci Portföyüm ({assignedStudents.length})
              </h2>
              <Link
                to="/coach/students"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
              >
                Tümünü Görüntüle <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/60">
              {assignedStudents.slice(0, 6).map((student) => {
                const xp = studentXPMap[student.id];
                const exams = studentExamsMap[student.id] || [];
                const latestExam = exams[0];

                return (
                  <div
                    key={student.id}
                    className="p-3.5 sm:p-4 hover:bg-zinc-850/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-300 text-xs shrink-0">
                        {student.first_name?.[0] || 'Ö'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-zinc-100 truncate">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono truncate">
                          {student.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center">
                      {/* Streak */}
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">Streak</div>
                        <div className="text-xs font-bold font-mono text-amber-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          {xp?.current_streak_days || 0} Gün
                        </div>
                      </div>

                      {/* Lifetime XP */}
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">Toplam XP</div>
                        <div className="text-xs font-bold font-mono text-zinc-200">
                          {xp?.lifetime_xp?.toLocaleString('tr-TR') || 0}
                        </div>
                      </div>

                      {/* Latest Net */}
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-mono uppercase">Son Net</div>
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {latestExam?.total_net ? `${latestExam.total_net} Net` : '—'}
                        </div>
                      </div>

                      {/* 360 Action */}
                      <Link to={`/coach/students/${student.id}`}>
                        <Button variant="secondary" size="sm">
                          360° İncele
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (1/3): Pending Approvals & Tasks */}
          <div className="space-y-6">
            {/* Pending Approvals Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  Bekleyen Ödül Onayları
                </span>
                <Link
                  to="/coach/approvals"
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-mono"
                >
                  Onay Merkezi &rarr;
                </Link>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Bekleyen ödül talebi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-md bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                          {req.reward?.title || 'Ödül Talebi'}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {req.student?.first_name} {req.student?.last_name} &bull; {req.reward?.xp_price} XP
                        </div>
                      </div>
                      <Link to="/coach/approvals">
                        <Button variant="primary" size="sm" className="text-[11px] px-2 py-1">
                          İncele
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Tasks Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Aktif Koçluk Görevleri
                </span>
                <Link
                  to="/coach/tasks"
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-mono"
                >
                  Görevler &rarr;
                </Link>
              </div>

              {upcomingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Aktif bekleyen görev bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-md bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">
                          {task.title}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {task.student?.first_name || 'Öğrenci'} &bull; +{task.xp_reward} XP
                        </div>
                      </div>
                      <Badge variant="warning">Bekliyor</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAIR STUDENT MODAL */}
      {pairModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setPairModalOpen(false)}
          title="Öğrenci Ekle / Davet Et"
          maxWidth="md"
        >
          <form onSubmit={handlePairStudent} className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Öğrencinizi sistemde kayıtlı e-posta adresini veya davet kodunu girerek koçluk portföyünüze dahil edin.
            </p>

            {pairError && (
              <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pairError}</span>
              </div>
            )}

            {pairSuccess && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{pairSuccess}</span>
              </div>
            )}

            <Input
              label="Öğrenci E-Posta Adresi veya Davet Kodu"
              required
              placeholder="ornek@ogrenci.com veya demo.ogrenci@mahfaza.co"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setPairModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={pairingLoading}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Portföye Ekle
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
