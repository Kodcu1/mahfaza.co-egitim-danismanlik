import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { coachTaskService } from '../../services/coachTaskService';
import { attendanceService } from '../../services/attendanceService';
import { studyProofService } from '../../services/studyProofService';
import { subscriptionService } from '../../services/subscriptionService';
import { supabase } from '../../lib/supabase';
import {
  Profile,
  StudentXPData,
  XPTransaction,
  ExamResult,
  CoachTask,
  AttendanceRecord,
  StudyProof,
  UserSubscription,
  SubscriptionPlanId,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { generateStudent360PDF } from '../../utils/student360PdfGenerator';
import {
  ShieldAlert,
  ArrowLeft,
  Download,
  Flame,
  Award,
  Target,
  Calendar,
  CheckCircle2,
  Plus,
  Coins,
  Camera,
  Eye,
  Trash2,
  Crown,
  Sparkles,
} from 'lucide-react';

export const Student360Page: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [student, setStudent] = useState<Profile | null>(null);
  const [studentSub, setStudentSub] = useState<UserSubscription | null>(null);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studyProofs, setStudyProofs] = useState<StudyProof[]>([]);
  const [proofStatusFilter, setProofStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [inspectProof, setInspectProof] = useState<StudyProof | null>(null);
  const [deletingProofId, setDeletingProofId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual XP Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [xpMode, setXpMode] = useState<'add' | 'deduct'>('add');
  const [xpAmount, setXpAmount] = useState<number>(50);
  const [xpReason, setXpReason] = useState<string>('');
  const [xpSubmitting, setXpSubmitting] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);
  const [xpSuccess, setXpSuccess] = useState<string | null>(null);

  // Coach Package Upgrade State
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState<SubscriptionPlanId>('pro');
  const [upgradingPackage, setUpgradingPackage] = useState(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id || !studentId) return;

    try {
      setLoading(true);

      // 1. Authoritative RLS check: Is this student assigned to this coach?
      const isAssigned = await relationshipService.isStudentAssignedToCoach(user.id, studentId);
      if (!isAssigned) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);

      // 2. Fetch real student profile from Supabase
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (profErr || !prof) {
        throw new Error('Öğrenci profili bulunamadı.');
      }

      setStudent({
        ...prof,
        first_name: prof.first_name || (prof.full_name ? prof.full_name.split(' ')[0] : 'Öğrenci'),
        last_name: prof.last_name || (prof.full_name ? prof.full_name.split(' ').slice(1).join(' ') : ''),
      });

      // 3. Load authorized academic data
      const [xp, txs, examResults, allTasks, att, proofs, sub] = await Promise.all([
        xpService.getStudentXP(studentId),
        xpService.getStudentTransactions(studentId, 15),
        examService.getStudentExamResults(studentId),
        coachTaskService.getTasksForCoach(user.id),
        attendanceService.getStudentAttendance(studentId).catch(() => []),
        studyProofService.getStudentStudyProofs(studentId).catch(() => []),
        subscriptionService.getUserSubscription(studentId).catch(() => null),
      ]);

      setXpData(xp);
      setTransactions(txs);
      setExams(examResults);
      setTasks(allTasks.filter((t) => t.student_id === studentId));
      setAttendance(att || []);
      setStudyProofs(proofs || []);
      setStudentSub(sub);
    } catch (err) {
      console.error('Error loading Student 360 data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handlePrintPDF = () => {
    if (!student) return;
    try {
      setPdfDownloading(true);
      generateStudent360PDF({
        student,
        coachName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Koç',
        xpData,
        examResults: exams,
        attendanceRecords: attendance,
        tasks,
        academicSummary: 'Öğrencinin haftalık çalışma performansı ve hedef deneme grafiği takip edilmektedir.',
      });
    } catch (err) {
      console.error('Error generating Student 360 PDF:', err);
      window.print();
    } finally {
      setTimeout(() => setPdfDownloading(false), 600);
    }
  };

  const [processingProofId, setProcessingProofId] = useState<string | null>(null);

  const handleApproveProofIn360 = async (proof: StudyProof) => {
    if (!user?.id || !studentId) return;
    setProcessingProofId(proof.id);
    try {
      await studyProofService.reviewStudyProof(proof.id, 'approved', '', user.id, proof);
      await loadData();
    } catch (err) {
      console.error('Error approving study proof in Student 360:', err);
    } finally {
      setProcessingProofId(null);
    }
  };

  const handleDeleteProof = async (proof: StudyProof) => {
    if (!user?.id || !studentId) return;
    setDeletingProofId(proof.id);
    try {
      await studyProofService.deleteStudyProof(proof, user.id, [studentId]);
      setStudyProofs((prev) => prev.filter((p) => p.id !== proof.id));
    } catch (err) {
      console.error('Error deleting study proof:', err);
    } finally {
      setDeletingProofId(null);
    }
  };

  const handleManualXPAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    if (!xpAmount || xpAmount <= 0) {
      setXpError('Geçerli bir XP miktarı giriniz.');
      return;
    }
    if (!xpReason.trim()) {
      setXpError('İşlem gerekçesi zorunludur.');
      return;
    }

    setXpSubmitting(true);
    setXpError(null);
    setXpSuccess(null);

    const finalAmount = xpMode === 'add' ? Number(xpAmount) : -Number(xpAmount);

    try {
      await xpService.adjustManualXP({
        student_id: studentId,
        amount: finalAmount,
        reason: xpReason.trim(),
      });
      setXpSuccess(`Başarılı! ${finalAmount > 0 ? '+' : ''}${finalAmount} XP öğrenci bakiyesine yansıtıldı.`);
      const [freshXP, freshTxs] = await Promise.all([
        xpService.getStudentXP(studentId),
        xpService.getStudentTransactions(studentId, 15),
      ]);
      if (freshXP) setXpData(freshXP);
      if (freshTxs) setTransactions(freshTxs);
      setTimeout(() => {
        setXpModalOpen(false);
        setXpSuccess(null);
        setXpReason('');
      }, 1000);
    } catch (err: any) {
      setXpError(err.message || 'XP işlemi gerçekleştirilemedi.');
    } finally {
      setXpSubmitting(false);
    }
  };

  const handleCoachUpgradeStudent = async () => {
    if (!user?.id || !studentId) return;
    setUpgradingPackage(true);
    setUpgradeFeedback(null);
    try {
      const updated = await subscriptionService.coachUpgradeStudentPackage(
        studentId,
        selectedTargetPlan
      );
      setStudentSub(updated);
      setStudent((prev) =>
        prev
          ? ({
              ...prev,
              package: selectedTargetPlan,
              subscription_plan: selectedTargetPlan,
              package_tier: selectedTargetPlan,
              subscription_tier: selectedTargetPlan,
            } as Profile)
          : prev
      );
      setUpgradeFeedback({
        type: 'success',
        text: `Öğrencinin paketi başarıyla '${updated.plan?.name || selectedTargetPlan.toUpperCase()}' seviyesine yükseltildi!`,
      });
      setTimeout(() => {
        setUpgradeModalOpen(false);
        setUpgradeFeedback(null);
      }, 1000);
    } catch (err: any) {
      setUpgradeFeedback({
        type: 'error',
        text: err.message || 'Paket yükseltme sırasında hata oluştu.',
      });
    } finally {
      setUpgradingPackage(false);
    }
  };

  if (loading) {
    return <LoadingState message="Öğrenci 360° analitik verileri yükleniyor..." />;
  }

  // Unauthorized Access Screen
  if (authorized === false) {
    return (
      <div className="py-12">
        <Card className="max-w-lg mx-auto p-8 text-center border-rose-200 bg-rose-50">
          <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-gray-800">Erişim Reddedildi (403)</h2>
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
            Bu öğrenci sizin koçluk portföyünüzde bulunmamaktadır. RLS ve rol izolasyonu kuralları gereği yetkisiz danışan verilerine erişim engellenmiştir.
          </p>
          <div className="mt-5">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={() => navigate('/coach/students')}
            >
              Portföyüme Geri Dön
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!student) {
    return (
      <EmptyState
        title="Öğrenci Bulunamadı"
        description="Talep edilen öğrenci kaydına ulaşılamadı."
      />
    );
  }

  const completedTasksCount = tasks.filter((t) => t.status === 'verified' || t.status === 'completed').length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : null;
  const latestExam = exams[0];
  const filteredProofs = studyProofs.filter((p) => proofStatusFilter === 'all' || p.status === proofStatusFilter);
  const currentPlanId = studentSub?.plan_id || student.package_tier || 'free';
  const currentPlanName =
    studentSub?.plan?.name ||
    (currentPlanId === 'premium'
      ? 'Premium VIP'
      : currentPlanId === 'pro'
      ? 'Pro Akademi'
      : currentPlanId === 'standard'
      ? 'Standart Akademik'
      : 'Başlangıç (Ücretsiz)');

  return (
    <div className="space-y-6">
      {/* Printable Report Header / Normal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 bg-white p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-xl shrink-0">
            {student.first_name?.[0] || 'Ö'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Link
                to="/coach/students"
                className="text-xs text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 print:hidden font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Öğrenci Portföyü
              </Link>
              <span className="text-gray-400 print:hidden">&bull;</span>
              <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
                Öğrenci 360° Akademik Profil
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px]">
                <Crown className="w-3 h-3 text-amber-600" />
                {currentPlanName}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
              {student.first_name} {student.last_name}
            </h1>
            <p className="text-xs text-gray-600 font-mono mt-0.5">
              {student.email} &bull; Hedef: {student.target_program || 'YKS / LGS'} &bull; Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="secondary"
            size="sm"
            className="bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
            leftIcon={<Crown className="w-3.5 h-3.5 text-amber-600" />}
            onClick={() => {
              setSelectedTargetPlan(currentPlanId === 'pro' ? 'premium' : 'pro');
              setUpgradeFeedback(null);
              setUpgradeModalOpen(true);
            }}
          >
            Paketi Yükselt
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Coins className="w-3.5 h-3.5" />}
            onClick={() => {
              setXpError(null);
              setXpSuccess(null);
              setXpReason('');
              setXpModalOpen(true);
            }}
          >
            Manuel XP İşlemi
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            isLoading={pdfDownloading}
            onClick={handlePrintPDF}
          >
            PDF Rapor İndir
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Çalışma Disiplini</span>
          <div className="text-xl font-bold font-mono text-amber-600 flex items-center gap-1 mt-0.5">
            <Flame className="w-4 h-4" />
            {xpData?.current_streak_days !== undefined ? `${xpData.current_streak_days} Gün Streak` : '0 Gün'}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">{studyProofs.length} kayıtlı çalışma seansı</span>
        </div>

        {/* Lifetime XP */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Kazanılan XP</span>
          <div className="text-xl font-bold font-mono text-gray-800 mt-0.5">
            {xpData?.lifetime_xp !== undefined ? `${xpData.lifetime_xp.toLocaleString('tr-TR')} XP` : '0 XP'}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">Toplam akademik puan</span>
        </div>

        {/* Latest Exam Net */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Son Deneme Neti</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-0.5">
            {latestExam?.total_net !== undefined ? `${latestExam.total_net} Net` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block truncate">
            {exams.length} toplam deneme sınavı
          </span>
        </div>

        {/* Task Completion Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
          <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Görev Başarısı</span>
          <div className="text-xl font-bold font-mono text-sky-600 mt-0.5">
            {taskCompletionRate !== null ? `%${taskCompletionRate}` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-gray-600 mt-1 block">
            {tasks.length > 0 ? `${completedTasksCount} / ${tasks.length} tamamlandı` : 'Atanmış görev yok'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: AKADEMİK DURUM & SINAV GELİŞİMİ */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              Akademik Durum & Sınav Netleri
            </h2>
            <span className="text-[10px] text-gray-600 font-mono font-semibold">
              {exams.length} Deneme Sınavı
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-600">
              Henüz deneme sınavı girişi yapılmamış.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 5).map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 rounded-xl bg-slate-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-800">
                      {ex.exam_name || ex.exam?.title || 'Genel Deneme Sınavı'}
                    </div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                      Tarih: {new Date(ex.exam_date || ex.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-500 font-mono block">Ders & Branş Dağılımı</span>
                      {ex.branches && ex.branches.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 max-w-sm sm:justify-end">
                          {ex.branches.map((b, bi) => (
                            <span
                              key={bi}
                              className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                (Number(b.net) || 0) <= 2
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                                  : 'bg-white text-slate-700 border-gray-200'
                              }`}
                            >
                              {b.name}: <strong>{b.net}N</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-gray-800 font-medium">
                          T:{ex.turkish_net || 0} &bull; M:{ex.math_net || 0} &bull; F:{ex.science_net || 0} &bull; S:{ex.social_net || 0}
                        </span>
                      )}
                    </div>

                    <div className="p-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-xs">
                      {ex.total_net} Net
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: KOÇLUK GÖREVLERİ & TAKİP */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              Atanan Koçluk Görevleri
            </h2>
            <Link to="/coach/tasks" className="text-[11px] text-amber-700 hover:text-amber-800 font-mono font-semibold print:hidden">
              Görev Masası &rarr;
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-600">
              Öğrenciye henüz koçluk görevi atanmamış.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <span className="text-[10px] text-gray-600 font-mono block mt-1">
                      Teslim: {new Date(task.due_date).toLocaleDateString('tr-TR')} &bull; +{task.xp_reward} XP
                    </span>
                  </div>

                  <Badge
                    variant={
                      task.status === 'verified'
                        ? 'success'
                        : task.status === 'completed'
                        ? 'neutral'
                        : task.status === 'cancelled'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {task.status === 'verified'
                      ? 'Onaylandı'
                      : task.status === 'completed'
                      ? 'Teslim Edildi'
                      : task.status === 'cancelled'
                      ? 'İptal'
                      : 'Bekliyor'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: KRONOLOJİK ÇALIŞMA KAYITLARI GEÇMİŞİ */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-600" />
              Fotoğraflı Çalışma Kayıtları & Etüt Geçmişi
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Öğrencinin yüklediği tüm çalışma seansları, soru sayıları ve onay durumları.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'all', label: 'Tümü' },
                { key: 'pending', label: 'Onay Bekleyen' },
                { key: 'approved', label: 'Onaylanan' },
                { key: 'rejected', label: 'Reddedilen' },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setProofStatusFilter(f.key)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  proofStatusFilter === f.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-50 border border-gray-200 text-gray-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredProofs.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-600">
            Seçili filtreye uygun çalışma kaydı bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredProofs.map((proof) => (
              <div
                key={proof.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-gray-200 flex gap-3.5 justify-between items-start"
              >
                <div className="flex gap-3 min-w-0">
                  <div
                    onClick={() => setInspectProof(proof)}
                    className="w-16 h-16 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 cursor-pointer relative group"
                  >
                    <img
                      src={proof.proof_photo_url}
                      alt={proof.subject_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">{proof.subject_name}</div>
                    <div className="text-[11px] text-gray-600 font-mono mt-0.5">
                      {proof.duration_minutes} dk &bull; {proof.question_count} soru &bull; +{proof.calculated_xp} XP
                    </div>
                    {proof.study_note && (
                      <p className="text-xs text-gray-600 italic line-clamp-1 mt-1">"{proof.study_note}"</p>
                    )}
                    <span className="text-[10px] text-gray-600 font-mono block mt-1">
                      {new Date(proof.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {proof.status === 'pending' && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingProofId === proof.id}
                      onClick={() => handleApproveProofIn360(proof)}
                      className="text-[11px] px-2.5 py-1"
                    >
                      Onayla (+{proof.calculated_xp} XP)
                    </Button>
                  )}
                  <Badge
                    variant={
                      proof.status === 'approved'
                        ? 'success'
                        : proof.status === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {proof.status === 'approved'
                      ? 'Onaylandı'
                      : proof.status === 'rejected'
                      ? 'Reddedildi'
                      : 'Bekliyor'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleDeleteProof(proof)}
                    disabled={deletingProofId === proof.id}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Kaydı Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 4: ÇALIŞMA AKTİVİTESİ & XP GEÇMİŞİ */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Çalışma Aktivitesi & XP Kazanımları
            </h2>
            <span className="text-[10px] text-gray-600 font-mono font-semibold">Son Hareketler</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-600">
              Kayıtlı XP aktivitesi bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-gray-800 font-semibold truncate">
                      {tx.description || tx.transaction_type}
                    </div>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {new Date(tx.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg shrink-0 ${
                      tx.amount >= 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: DEVAMSIZLIK & DERS KATILIMI */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              Devamsızlık & Seans Katılımı
            </h2>
            <span className="text-[10px] text-gray-600 font-mono font-semibold">Akademik Kayıtlar</span>
          </div>

          {attendance.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-600">
              Devamsızlık veya seans yoklama kaydı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-xs font-semibold text-gray-800">
                      {att.note || 'Ders Seansı'}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono block">
                      {new Date(att.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <Badge
                    variant={
                      att.status === 'present'
                        ? 'success'
                        : att.status === 'excused'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {att.status === 'present' ? 'Katıldı' : att.status === 'excused' ? 'İzinli' : 'Katılmadı'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX FOR STUDY PROOF */}
      {inspectProof && (
        <Modal
          isOpen={true}
          onClose={() => setInspectProof(null)}
          title={`${inspectProof.subject_name} — Çalışma Kanıtı`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={inspectProof.proof_photo_url}
                alt="Çalışma Kanıtı"
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                {inspectProof.duration_minutes} dk &bull; {inspectProof.question_count} Soru
              </span>
              <span className="font-bold text-amber-700 font-mono">+{inspectProof.calculated_xp} XP</span>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: MANUEL XP İŞLEMİ (COACH MANUAL XP ADJUSTMENT) */}
      <Modal
        isOpen={xpModalOpen}
        onClose={() => setXpModalOpen(false)}
        title="Öğrenciye Manuel XP İşlemi"
      >
        <form onSubmit={handleManualXPAdjust} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-600 block">Öğrenci:</span>
              <span className="text-gray-800 font-bold">{student.first_name} {student.last_name}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-600 block">Mevcut Cüzdan:</span>
              <span className="text-amber-700 font-mono font-bold text-sm">
                {xpData?.wallet_xp !== undefined ? `${xpData.wallet_xp} XP` : '0 XP'}
              </span>
            </div>
          </div>

          {/* Operation Direction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-800 block">İşlem Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setXpMode('add')}
                className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  xpMode === 'add'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                XP Ekle (+)
              </button>
              <button
                type="button"
                onClick={() => setXpMode('deduct')}
                className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  xpMode === 'deduct'
                    ? 'bg-rose-50 border-rose-500 text-rose-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                }`}
              >
                <span className="text-lg leading-none font-bold text-rose-600">-</span>
                XP Düşür (-)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-800 block mb-1">XP Miktarı</label>
            <Input
              type="number"
              min="1"
              max="500"
              value={xpAmount}
              onChange={(e) => setXpAmount(Math.max(1, parseInt(e.target.value) || 0))}
              required
            />
          </div>

          {/* Mandatory Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-800 block mb-1">
              İşlem Gerekçesi (Zorunlu)
            </label>
            <textarea
              value={xpReason}
              onChange={(e) => setXpReason(e.target.value)}
              placeholder="Örn: Haftalık soru hedefi aşımı tebriği, telafi ödevi teslimi, vb."
              className="w-full h-20 p-2.5 text-xs rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Preview Balance */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between text-xs font-mono">
            <span className="text-gray-600">İşlem Sonrası Cüzdan Bakiyesi:</span>
            <span className="text-gray-800 font-bold">
              {Math.max(0, (xpData?.wallet_xp || 0) + (xpMode === 'add' ? xpAmount : -xpAmount))} XP
            </span>
          </div>

          {xpError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {xpError}
            </div>
          )}

          {xpSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {xpSuccess}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setXpModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={xpSubmitting}
            >
              İşlemi Onayla ve Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* COACH PACKAGE UPGRADE MODAL */}
      <Modal
        isOpen={upgradeModalOpen}
        onClose={() => {
          if (!upgradingPackage) setUpgradeModalOpen(false);
        }}
        title="Öğrenci Paketini Yükselt (Koç Yetkisi)"
        subtitle="Danışanınızın paketini Standart, Pro Akademi veya Premium VIP seviyesine yükseltin"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block">Danışan:</span>
              <span className="font-bold text-slate-900 text-sm">
                {student.first_name} {student.last_name}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Mevcut Paket:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
                <Crown className="w-3 h-3 text-amber-600" />
                {currentPlanName}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'standard' as SubscriptionPlanId,
                name: 'Standart Akademik',
                price: '18.900 ₺ / yıl',
                desc: 'Deneme net analizi, standart ders içerikleri ve ödev takibi.',
              },
              {
                id: 'pro' as SubscriptionPlanId,
                name: 'Pro Akademi (Önerilen)',
                price: '34.900 ₺ / yıl',
                desc: 'Gelişmiş deneme karnesi, AI koçluk analizleri, XP ödül mağazası ve 360° rapor.',
              },
              {
                id: 'premium' as SubscriptionPlanId,
                name: 'Premium VIP',
                price: '54.900 ₺ / yıl',
                desc: 'Tam kapsamlı VIP koçluk, sınırsız içerik, öncelikli ödül vitrini ve yönetici raporu.',
              },
            ].map((tier) => {
              const isSelected = selectedTargetPlan === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTargetPlan(tier.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {tier.name}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{tier.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-amber-700 text-xs block">{tier.price}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {upgradeFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                upgradeFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {upgradeFeedback.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setUpgradeModalOpen(false)}
              disabled={upgradingPackage}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={upgradingPackage}
              onClick={handleCoachUpgradeStudent}
              leftIcon={<Crown className="w-3.5 h-3.5" />}
            >
              Paketi Şimdi Yükselt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
