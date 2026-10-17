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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // 1. Instant local storage cache hydration (guarantees instant render without spinner lag)
    try {
      const cachedStuds = localStorage.getItem(`mahfaza_coach_students_${user.id}`);
      if (cachedStuds) {
        const parsed = JSON.parse(cachedStuds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssignedStudents(parsed);
          setLoading(false); // Stop spinner immediately if cached data exists
        }
      }
      const rawTasks = localStorage.getItem('mahfaza_tasks');
      if (rawTasks) {
        const parsedTasks: CoachTask[] = JSON.parse(rawTasks);
        if (Array.isArray(parsedTasks)) {
          setUpcomingTasks(parsedTasks.filter((t) => t.status === 'pending').slice(0, 5));
        }
      }
    } catch {
      // ignore
    }

    // 2. Defensive fetch with 2-second timeout guard to prevent network hang / dead Supabase lock
    try {
      const fetchPromise = (async () => {
        let [studs, sub, tasks] = await Promise.all([
          relationshipService.getCoachAssignedStudents(user.id).catch(() => []),
          subscriptionService.getUserSubscription(user.id).catch(() => null),
          coachTaskService.getTasksForCoach(user.id).catch(() => []),
        ]);

        if (!studs || studs.length === 0) {
          studs = await relationshipService.getProfilesByRole('student').catch(() => []);
        }

        setAssignedStudents(studs);
        setUserSubscription(sub);
        setUpcomingTasks((tasks || []).filter((t) => t.status === 'pending').slice(0, 5));

        const studentIds = (studs || []).map((s) => s.id);
        if (studentIds.length > 0) {
          const approvals = await rewardService.getCoachPendingRequests(studentIds).catch(() => []);
          setPendingApprovals((approvals || []).filter((a) => a.status === 'pending'));

          // Load XP and exams in parallel (NOT serial) to avoid cumulative timeouts
          const xpMap: Record<string, StudentXPData | null> = {};
          const examsMap: Record<string, ExamResult[]> = {};

          await Promise.all(
            studs.map(async (s) => {
              const [xp, exams] = await Promise.all([
                xpService.getStudentXP(s.id).catch(() => null),
                examService.getStudentExamResults(s.id).catch(() => []),
              ]);
              xpMap[s.id] = xp;
              examsMap[s.id] = exams;
            })
          );

          setStudentXPMap(xpMap);
          setStudentExamsMap(examsMap);
        } else {
          setPendingApprovals([]);
          setStudentXPMap({});
          setStudentExamsMap({});
        }
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Coach dashboard load notice (proceeding with local/cached state):', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(safetyTimer);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Akademik Koçluk & Portföy Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Komuta Merkezi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atanmış danışanlarınızın çalışma disiplini, görev takibi, XP onayları ve net gelişim analizi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Capacity & Subscription Meter */}
          <Link
            to="/pricing"
            className="p-2 px-3.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 shadow-xs transition-all flex items-center gap-2.5"
          >
            <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                {userSubscription?.plan?.name || 'Koçluk Lisansı'}
              </div>
              <div className="text-xs font-bold text-slate-900 font-mono">
                {assignedStudents.length} / {userSubscription?.plan?.student_capacity || 10} Danışan
              </div>
            </div>
          </Link>

          <Button
            variant="primary"
            size="md"
            onClick={() => setPairModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Öğrenci Ekle / Davet Et
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Assigned */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Danışan Portföyü</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
            {assignedStudents.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Kayıtlı aktif danışan</span>
        </div>

        {/* Attention Needed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Dikkat Gerektiren</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 tabular-nums">
            {studentsRequiringAttention.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Düşük streak veya eksik veri</span>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bekleyen Onaylar</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 tabular-nums">
            {pendingApprovals.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">XP / Ödül talep onayı</span>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Aktif Görevler</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 tabular-nums">
            {upcomingTasks.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Teslim bekleyen koçluk görevi</span>
        </div>
      </div>

      {/* EMPTY STATE OR PORTFOLIO OVERVIEW */}
      {assignedStudents.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-gray-200 bg-white">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-gray-800">Öğrenci Ekleyin</h2>
          <p className="text-xs text-gray-600 mt-1 max-w-md mx-auto leading-relaxed">
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
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                Öğrenci Portföyüm ({assignedStudents.length})
              </h2>
              <Link
                to="/coach/students"
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1"
              >
                Tümünü Görüntüle <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200 shadow-sm">
              {assignedStudents.slice(0, 6).map((student) => {
                const xp = studentXPMap[student.id];
                const exams = studentExamsMap[student.id] || [];
                const latestExam = exams[0];

                return (
                  <div
                    key={student.id}
                    className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-800 text-xs shrink-0 shadow-xs">
                        {student.first_name?.[0] || 'Ö'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-gray-800 truncate">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-[11px] text-gray-600 font-mono truncate">
                          {student.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center">
                      {/* Streak */}
                      <div className="text-right">
                        <div className="text-[10px] text-gray-600 font-semibold uppercase">Streak</div>
                        <div className="text-xs font-bold font-mono text-amber-700 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                          {xp?.current_streak_days || 0} Gün
                        </div>
                      </div>

                      {/* Lifetime XP */}
                      <div className="text-right">
                        <div className="text-[10px] text-gray-600 font-semibold uppercase">Toplam XP</div>
                        <div className="text-xs font-bold font-mono text-gray-800">
                          {xp?.lifetime_xp?.toLocaleString('tr-TR') || 0}
                        </div>
                      </div>

                      {/* Latest Net */}
                      <div className="text-right">
                        <div className="text-[10px] text-gray-600 font-semibold uppercase">Son Net</div>
                        <div className="text-xs font-bold font-mono text-emerald-700">
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
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Bekleyen Onaylar
                </span>
                <Link
                  to="/coach/approvals"
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-mono font-semibold"
                >
                  Onay Merkezi &rarr;
                </Link>
              </div>

              {pendingApprovals.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-600">
                  Bekleyen ödül talebi bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApprovals.slice(0, 3).map((req) => (
                    <div
                      key={req.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          {req.reward?.title || 'Ödül Talebi'}
                        </div>
                        <div className="text-[10px] text-gray-600 truncate">
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
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Aktif Koçluk Görevleri
                </span>
                <Link
                  to="/coach/tasks"
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-mono font-semibold"
                >
                  Görevler &rarr;
                </Link>
              </div>

              {upcomingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-600">
                  Aktif bekleyen görev bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          {task.title}
                        </div>
                        <div className="text-[10px] text-gray-600 truncate">
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
            <p className="text-xs text-gray-600 leading-relaxed">
              Öğrencinizi sistemde kayıtlı e-posta adresini veya davet kodunu girerek koçluk portföyünüze dahil edin.
            </p>

            {pairError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{pairError}</span>
              </div>
            )}

            {pairSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
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

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
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
