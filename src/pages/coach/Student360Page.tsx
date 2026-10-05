import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { coachTaskService } from '../../services/coachTaskService';
import { attendanceService } from '../../services/attendanceService';
import { branchTeacherService } from '../../services/branchTeacherService';
import { supabase } from '../../lib/supabase';
import {
  Profile,
  StudentXPData,
  XPTransaction,
  ExamResult,
  CoachTask,
  AttendanceRecord,
  BranchTeacherFeedback,
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
  Printer,
  Download,
  Flame,
  Award,
  Target,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  Plus,
  Coins,
  MessageSquare,
  GraduationCap,
  Trash2,
} from 'lucide-react';

export const Student360Page: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [student, setStudent] = useState<Profile | null>(null);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [branchFeedbacks, setBranchFeedbacks] = useState<BranchTeacherFeedback[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Manual XP Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [xpMode, setXpMode] = useState<'add' | 'deduct'>('add');
  const [xpAmount, setXpAmount] = useState<number>(50);
  const [xpReason, setXpReason] = useState<string>('');
  const [xpSubmitting, setXpSubmitting] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);
  const [xpSuccess, setXpSuccess] = useState<string | null>(null);

  // Branch Feedback Modal State
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [bfSubject, setBfSubject] = useState('Matematik');
  const [bfTeacher, setBfTeacher] = useState('');
  const [bfTopic, setBfTopic] = useState('');
  const [bfStatus, setBfStatus] = useState<'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik'>('İyi');
  const [bfOpinion, setBfOpinion] = useState('');
  const [bfRecommendations, setBfRecommendations] = useState('');
  const [bfSubmitting, setBfSubmitting] = useState(false);
  const [bfError, setBfError] = useState<string | null>(null);

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
      const [xp, txs, examResults, allTasks, att, bfs] = await Promise.all([
        xpService.getStudentXP(studentId),
        xpService.getStudentTransactions(studentId, 15),
        examService.getStudentExamResults(studentId),
        coachTaskService.getTasksForCoach(user.id),
        attendanceService.getStudentAttendance(studentId).catch(() => []),
        branchTeacherService.getFeedbacksForStudent(studentId),
      ]);

      setXpData(xp);
      setTransactions(txs);
      setExams(examResults);
      setTasks(allTasks.filter((t) => t.student_id === studentId));
      setAttendance(att || []);
      setBranchFeedbacks(bfs || []);
    } catch (err) {
      console.error('Error loading Student 360 data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrintPDF = () => {
    if (!student) return;
    generateStudent360PDF({
      student,
      coachName: user?.user_metadata?.full_name || (user?.email?.split('@')[0]) || 'Koç',
      xpData,
      examResults: exams,
      attendanceRecords: attendance,
      tasks,
      branchFeedbacks,
      academicSummary: 'Öğrencinin haftalık çalışma performansı ve hedef deneme grafiği takip edilmektedir.',
    });
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
      await loadData();
      setTimeout(() => {
        setXpModalOpen(false);
        setXpSuccess(null);
        setXpReason('');
      }, 1500);
    } catch (err: any) {
      setXpError(err.message || 'XP işlemi gerçekleştirilemedi.');
    } finally {
      setXpSubmitting(false);
    }
  };

  const handleAddBranchFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !bfTeacher.trim() || !bfOpinion.trim()) {
      setBfError('Lütfen öğretmen adı ve görüş alanlarını eksiksiz doldurunuz.');
      return;
    }

    setBfSubmitting(true);
    setBfError(null);

    try {
      await branchTeacherService.createFeedback({
        student_id: studentId,
        coach_id: user?.id,
        subject: bfSubject,
        teacher_name: bfTeacher.trim(),
        topic: bfTopic.trim() || undefined,
        academic_status: bfStatus,
        opinion: bfOpinion.trim(),
        recommendations: bfRecommendations.trim() || undefined,
      });

      await loadData();
      setBranchModalOpen(false);
      setBfTeacher('');
      setBfTopic('');
      setBfOpinion('');
      setBfRecommendations('');
    } catch (err: any) {
      setBfError(err.message || 'Branş görüşü kaydedilemedi.');
    } finally {
      setBfSubmitting(false);
    }
  };

  const handleDeleteBranchFeedback = async (feedbackId: string) => {
    if (!studentId) return;
    if (!window.confirm('Bu branş değerlendirmesini silmek istediğinize emin misiniz?')) return;
    try {
      await branchTeacherService.deleteFeedback(feedbackId, studentId);
      await loadData();
    } catch (err) {
      console.error('Error deleting feedback:', err);
    }
  };

  if (loading) {
    return <LoadingState message="Öğrenci 360° analitik verileri yükleniyor..." />;
  }

  // Unauthorized Access Screen
  if (authorized === false) {
    return (
      <div className="py-12">
        <Card className="max-w-lg mx-auto p-8 text-center border-rose-900/60 bg-rose-950/20">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-zinc-100">Erişim Reddedildi (403)</h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
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

  return (
    <div className="space-y-6">
      {/* Printable Report Header / Normal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/coach/students"
              className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 print:hidden"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Öğrenci Portföyü
            </Link>
            <span className="text-zinc-600 print:hidden">&bull;</span>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">
              Öğrenci 360° Raporu
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            {student.email} &bull; Raporlama Tarihi: {new Date().toLocaleDateString('tr-TR')}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
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
            onClick={handlePrintPDF}
          >
            PDF Rapor İndir
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Çalışma Disiplini</span>
          <div className="text-xl font-bold font-mono text-amber-400 flex items-center gap-1 mt-0.5">
            <Flame className="w-4 h-4" />
            {xpData?.current_streak_days !== undefined ? `${xpData.current_streak_days} Gün Streak` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Kesintisiz çalışma serisi</span>
        </div>

        {/* Lifetime XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Kazanılan XP</span>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-0.5">
            {xpData?.lifetime_xp !== undefined ? `${xpData.lifetime_xp.toLocaleString('tr-TR')} XP` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Toplam akademik puan</span>
        </div>

        {/* Latest Exam Net */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Son Deneme Neti</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            {latestExam?.total_net !== undefined ? `${latestExam.total_net} Net` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block truncate">
            {latestExam?.exam?.title || 'Son deneme sınavı'}
          </span>
        </div>

        {/* Task Completion Rate */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
          <span className="text-[10px] text-zinc-500 font-mono uppercase block">Görev Başarısı</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
            {taskCompletionRate !== null ? `%${taskCompletionRate}` : 'Veri bulunmuyor'}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            {tasks.length > 0 ? `${completedTasksCount} / ${tasks.length} tamamlandı` : 'Atanmış görev yok'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: AKADEMİK DURUM & SINAV GELİŞİMİ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Akademik Durum & Sınav Netleri
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              {exams.length} Deneme Sınavı
            </span>
          </div>

          {exams.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              «Veri bulunmuyor» (Henüz deneme sınavı girişi yapılmamış)
            </div>
          ) : (
            <div className="space-y-3">
              {exams.slice(0, 5).map((ex) => (
                <div
                  key={ex.id}
                  className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      {ex.exam?.title || 'Genel Deneme Sınavı'}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Tarih: {new Date(ex.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 font-mono block">Branş Dağılımı</span>
                      <span className="text-[11px] font-mono text-zinc-300">
                        T:{ex.turkish_net || 0} &bull; M:{ex.math_net || 0} &bull; F:{ex.science_net || 0} &bull; S:{ex.social_net || 0}
                      </span>
                    </div>

                    <div className="p-1.5 px-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                      {ex.total_net} Net
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: KOÇLUK GÖREVLERİ & TAKİP */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Atanan Koçluk Görevleri
            </h2>
            <Link to="/coach/tasks" className="text-[11px] text-amber-400 hover:text-amber-300 font-mono print:hidden">
              Görev Masası &rarr;
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              «Veri bulunmuyor» (Öğrenciye henüz koçluk görevi atanmamış)
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <span className="text-[10px] text-zinc-500 font-mono block mt-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 3: ÇALIŞMA AKTİVİTESİ & XP GEÇMİŞİ */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Çalışma Aktivitesi & XP Kazanımları
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">Son Hareketler</span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              «Veri bulunmuyor» (Kayıtlı XP aktivitesi bulunmuyor)
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-md bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-200 font-medium truncate">
                      {tx.description || tx.transaction_type}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(tx.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded shrink-0 ${
                      tx.amount >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 4: DEVAMSIZLIK & DERS KATILIMI */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-400" />
              Devamsızlık & Seans Katılımı
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">Akademik Kayıtlar</span>
          </div>

          {attendance.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              «Veri bulunmuyor» (Devamsızlık veya seans yoklama kaydı bulunmuyor)
            </div>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 5).map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 rounded-md bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-xs text-zinc-200">
                      {att.note || 'Ders Seansı'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono block">
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

      {/* SECTION 5: BRANŞ ÖĞRETMENLERİ GÖRÜŞLERİ VE DERS DEĞERLENDİRMELERİ */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              Branş Öğretmenleri Görüşleri ve Ders Değerlendirmeleri
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tarih, Matematik, Fizik, Kimya, Biyoloji ve diğer branş hocalarının öğrenci hakkındaki tespit ve tavsiyeleri
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setBfError(null);
                setBranchModalOpen(true);
              }}
            >
              Branş Görüşü Ekle
            </Button>
          </div>
        </div>

        {/* Subject Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs print:hidden">
          {['all', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'Türk Dili ve Edebiyatı', 'Felsefe', 'İngilizce'].map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubjectFilter(sub)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 font-medium ${
                selectedSubjectFilter === sub
                  ? 'bg-purple-500/10 text-purple-300 border border-purple-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
              }`}
            >
              {sub === 'all' ? 'Tüm Dersler' : sub}
            </button>
          ))}
        </div>

        {/* Feedback List */}
        {branchFeedbacks.filter((bf) => selectedSubjectFilter === 'all' || bf.subject === selectedSubjectFilter).length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            {selectedSubjectFilter === 'all'
              ? '«Kayıtlı branş öğretmeni görüşü bulunmuyor. Yeni değerlendirme eklemek için butonu kullanın.»'
              : `«${selectedSubjectFilter} dersi için henüz branş öğretmeni görüşü girilmemiş.»`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {branchFeedbacks
              .filter((bf) => selectedSubjectFilter === 'all' || bf.subject === selectedSubjectFilter)
              .map((bf) => (
                <div
                  key={bf.id}
                  className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-850 flex flex-col justify-between space-y-2 hover:border-zinc-750 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                          {bf.subject}
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {bf.teacher_name}
                        </span>
                        {bf.topic && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            &bull; {bf.topic}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant={
                            bf.academic_status === 'Pekiyi' || bf.academic_status === 'İyi'
                              ? 'success'
                              : bf.academic_status === 'Orta'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {bf.academic_status}
                        </Badge>
                        <button
                          onClick={() => handleDeleteBranchFeedback(bf.id)}
                          className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                          title="Görüşü Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      "{bf.opinion}"
                    </p>

                    {bf.recommendations && (
                      <div className="mt-1 p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-amber-300/90 leading-normal">
                        <span className="font-semibold text-amber-400">Tavsiye / Ödev: </span>
                        {bf.recommendations}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-900 flex items-center justify-between">
                    <span>Kayıt Tarihi: {new Date(bf.date || bf.created_at).toLocaleDateString('tr-TR')}</span>
                    {bf.coach_id === user?.id && <span className="text-zinc-600">Koç Onaylı</span>}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* MODAL 1: MANUEL XP İŞLEMİ (COACH MANUAL XP ADJUSTMENT) */}
      <Modal
        isOpen={xpModalOpen}
        onClose={() => setXpModalOpen(false)}
        title="Öğrenciye Manuel XP İşlemi"
      >
        <form onSubmit={handleManualXPAdjust} className="space-y-4">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-400 block">Öğrenci:</span>
              <span className="text-zinc-100 font-semibold">{student.first_name} {student.last_name}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-400 block">Mevcut Cüzdan:</span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {xpData?.wallet_xp !== undefined ? `${xpData.wallet_xp} XP` : '0 XP'}
              </span>
            </div>
          </div>

          {/* Operation Direction */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300 block">İşlem Türü</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setXpMode('add')}
                className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  xpMode === 'add'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                XP Ekle (+)
              </button>
              <button
                type="button"
                onClick={() => setXpMode('deduct')}
                className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  xpMode === 'deduct'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="text-lg leading-none font-bold text-rose-400">-</span>
                XP Düşür (-)
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">XP Miktarı</label>
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
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              İşlem Gerekçesi (Zorunlu)
            </label>
            <textarea
              value={xpReason}
              onChange={(e) => setXpReason(e.target.value)}
              placeholder="Örn: Haftalık soru hedefi aşımı tebriği, telafi ödevi teslimi, vb."
              className="w-full h-20 p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Preview Balance */}
          <div className="p-2.5 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">İşlem Sonrası Cüzdan Bakiyesi:</span>
            <span className="text-zinc-100 font-bold">
              {Math.max(0, (xpData?.wallet_xp || 0) + (xpMode === 'add' ? xpAmount : -xpAmount))} XP
            </span>
          </div>

          {xpError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {xpError}
            </div>
          )}

          {xpSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
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

      {/* MODAL 2: BRANŞ GÖRÜŞÜ EKLE (ADD BRANCH TEACHER OPINION) */}
      <Modal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title="Yeni Branş Öğretmeni Görüşü Ekle"
      >
        <form onSubmit={handleAddBranchFeedback} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Ders / Branş</label>
              <select
                value={bfSubject}
                onChange={(e) => setBfSubject(e.target.value)}
                className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="Matematik">Matematik</option>
                <option value="Fizik">Fizik</option>
                <option value="Kimya">Kimya</option>
                <option value="Biyoloji">Biyoloji</option>
                <option value="Tarih">Tarih</option>
                <option value="Coğrafya">Coğrafya</option>
                <option value="Türk Dili ve Edebiyatı">Türk Dili ve Edebiyatı</option>
                <option value="Felsefe">Felsefe</option>
                <option value="Din Kültürü ve Ahlak Bilgisi">Din Kültürü ve Ahlak Bilgisi</option>
                <option value="İngilizce">İngilizce</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Öğretmen Adı</label>
              <Input
                type="text"
                placeholder="Örn: Ahmet Yılmaz"
                value={bfTeacher}
                onChange={(e) => setBfTeacher(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">İşlenen Konu / Ünite (Opsiyonel)</label>
              <Input
                type="text"
                placeholder="Örn: Limit ve Süreklilik"
                value={bfTopic}
                onChange={(e) => setBfTopic(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Akademik Durum</label>
              <select
                value={bfStatus}
                onChange={(e) => setBfStatus(e.target.value as any)}
                className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="Pekiyi">Pekiyi</option>
                <option value="İyi">İyi</option>
                <option value="Orta">Orta</option>
                <option value="Geliştirilmeli">Geliştirilmeli</option>
                <option value="Kritik">Kritik</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Öğretmen Değerlendirmesi / Görüşü
            </label>
            <textarea
              value={bfOpinion}
              onChange={(e) => setBfOpinion(e.target.value)}
              placeholder="Öğretmenin dersteki katılım, anlama seviyesi ve soru çözme kabiliyeti hakkındaki değerlendirmesi..."
              className="w-full h-20 p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Tavsiye & Çalışma Önerisi (Opsiyonel)
            </label>
            <Input
              type="text"
              placeholder="Örn: Günlük 40 soru çözülmeli, formül kağıdı hazırlanmalı"
              value={bfRecommendations}
              onChange={(e) => setBfRecommendations(e.target.value)}
            />
          </div>

          {bfError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {bfError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setBranchModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={bfSubmitting}
            >
              Görüşü Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
