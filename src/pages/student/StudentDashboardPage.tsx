import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { xpService } from '../../services/xpService';
import { academicService } from '../../services/academicService';
import { homeworkService } from '../../services/homeworkService';
import { examService } from '../../services/examService';
import { subscriptionService } from '../../services/subscriptionService';
import { announcementService } from '../../services/announcementService';
import { coachTaskService } from '../../services/coachTaskService';
import { StudentXPData, Homework, CoachTask, ExamResult, ScheduleItem, UserSubscription, Announcement } from '../../types';
import { calculateLevel, DAILY_XP_HARD_CAP, XP_EARNING_ACTIONS, previewAwardCalculation } from '../../utils/xpEngine';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Flame,
  Award,
  Zap,
  Coins,
  Play,
  Clock,
  BookOpen,
  Target,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Gift,
  Bell,
  User,
  MessageSquare,
  Megaphone,
  CreditCard,
  Camera,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const StudentDashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [coachTasks, setCoachTasks] = useState<CoachTask[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Study Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedActionKey, setSelectedActionKey] = useState<keyof typeof XP_EARNING_ACTIONS>('STUDY_30_MIN');
  const [actionNotes, setActionNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadStudentData = useCallback(async () => {
    if (!user?.id && !profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const studentPrimaryId = profile?.id || user?.id || '';
      const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

      const fetchPromise = (async () => {
        const [xp, hw, cTasks, exams, schedule, sub, annList] = await Promise.all([
          xpService.getStudentXP(studentPrimaryId, studentSecondaryId).catch(() => null),
          homeworkService.getHomeworks().catch(() => []),
          coachTaskService.getTasksForStudent(studentPrimaryId, {
            email: user?.email,
            profileId: profile?.id,
          }).catch(() => []),
          examService.getStudentExamResults(studentPrimaryId, studentSecondaryId).catch(() => []),
          academicService.getMasterSchedule().catch(() => []),
          subscriptionService.getUserSubscription(studentPrimaryId).catch(() => null),
          announcementService.getAnnouncements('student').catch(() => []),
        ]);

        setXpData(xp);
        setHomeworks((hw || []).slice(0, 5));
        setCoachTasks((cTasks || []).filter((t) => t.status === 'pending' || (t.status as string) === 'Bekliyor').slice(0, 5));
        setExamResults((exams || []).slice(0, 5));
        setSubscription(sub);
        setAnnouncements((annList || []).slice(0, 3));

        // Filter schedule for today (Monday = 1, Sunday = 7)
        const currentDay = new Date().getDay();
        const mappedDay = currentDay === 0 ? 7 : currentDay;
        setTodaySchedule((schedule || []).filter((s) => s.day_of_week === mappedDay));
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      // Graceful fallback for offline or schema cache sync
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, profile?.id]);

  useEffect(() => {
    loadStudentData();
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const handleLiveSync = () => {
      loadStudentData();
    };
    window.addEventListener('mahfaza:xp-updated', handleLiveSync);
    window.addEventListener('mahfaza:package-upgraded', handleLiveSync);
    window.addEventListener('mahfaza:exam-updated', handleLiveSync);
    window.addEventListener('mahfaza:new_notification', handleLiveSync);
    window.addEventListener('mahfaza:counts-updated', handleLiveSync);
    window.addEventListener('mahfaza:task_created', handleLiveSync);
    window.addEventListener('mahfaza:tasks_updated', handleLiveSync);
    return () => {
      clearTimeout(safetyTimer);
      window.removeEventListener('mahfaza:xp-updated', handleLiveSync);
      window.removeEventListener('mahfaza:package-upgraded', handleLiveSync);
      window.removeEventListener('mahfaza:exam-updated', handleLiveSync);
      window.removeEventListener('mahfaza:new_notification', handleLiveSync);
      window.removeEventListener('mahfaza:counts-updated', handleLiveSync);
      window.removeEventListener('mahfaza:task_created', handleLiveSync);
      window.removeEventListener('mahfaza:tasks_updated', handleLiveSync);
    };
  }, [loadStudentData]);

  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : calculateLevel(0);
  const todayEarned = xpData?.today_earned_xp || 0;
  const todayRemaining = Math.max(0, DAILY_XP_HARD_CAP - todayEarned);

  // Handle XP award action (Atomic RPC)
  const handleAwardAction = async () => {
    const studentUid = profile?.id || user?.id;
    if (!studentUid || !xpData) return;
    setSubmittingAction(true);
    setActionFeedback(null);

    const action = XP_EARNING_ACTIONS[selectedActionKey];
    try {
      const res = await xpService.awardXPAtomic({
        student_id: studentUid,
        base_amount: action.baseXP,
        action_type: selectedActionKey.toLowerCase(),
        description: `${action.label}${actionNotes ? ` - ${actionNotes}` : ''}`,
      });

      if (res.success) {
        setActionFeedback(`Tebrikler! ${res.awarded_xp} XP kazandınız! (${res.streak}. gün serisi)`);
        await loadStudentData();
        setTimeout(() => {
          setActionModalOpen(false);
          setActionFeedback(null);
          setActionNotes('');
        }, 1500);
      } else {
        setActionFeedback(res.message || 'XP eklenemedi.');
      }
    } catch (err: any) {
      setActionFeedback(err.message || 'İşlem başarısız oldu.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const currentPreview = xpData
    ? previewAwardCalculation(
        XP_EARNING_ACTIONS[selectedActionKey].baseXP,
        xpData.current_streak_days,
        xpData.today_earned_xp
      )
    : null;

  if (loading) {
    return <LoadingState message="Öğrenci kumanda merkezi yükleniyor..." />;
  }

  // Sample analytics data based on actual exam results or progression
  const chartData = examResults.length > 0
    ? examResults.map((e) => ({
        name: e.exam?.title || 'Deneme',
        net: Number(e.total_net) || 0,
        score: Number(e.score) || 0,
      })).reverse()
    : [
        { name: 'Başlangıç', net: 0, score: 0 },
      ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-600 tracking-wider uppercase">Mahfaza.co Kumanda Masası</span>
            <Link
              to="/pricing"
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200 transition-colors inline-flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              {subscription?.plan?.name || 'Başlangıç (Ücretsiz)'}
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Hoş Geldin, {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Talebe'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            "Planını Kur. Disiplinini Koru. Hedefine Ulaş."
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/student/study-focus">
            <Button
              variant="secondary"
              size="md"
              className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 font-semibold"
              leftIcon={<Camera className="w-4 h-4 text-amber-600" />}
            >
              + Serbest Çalışma Kaydı Ekle
            </Button>
          </Link>
          <Link to="/student/study-focus">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Play className="w-4 h-4" />}
            >
              Odak Seansı Başlat
            </Button>
          </Link>
        </div>
      </div>

      {/* Announcements Bar (if any published announcements exist) */}
      {announcements.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex items-start gap-3 shadow-xs">
          <Megaphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">{announcements[0].title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                Duyuru
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-0.5 line-clamp-2">{announcements[0].content}</p>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Link
          to="/student/study-logs"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <BookOpen className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Çalışma Kaydı</span>
          <span className="text-[10px] text-slate-400">Kanıt & XP</span>
        </Link>
        <Link
          to="/student/study-focus"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <Clock className="w-5 h-5 text-amber-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Çalışma Odası</span>
          <span className="text-[10px] text-slate-400">Pomodoro Sayaç</span>
        </Link>
        <Link
          to="/student/homework"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-sky-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <CheckSquare className="w-5 h-5 text-sky-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Görevlerim</span>
          <span className="text-[10px] text-slate-400">Ödev & Takip</span>
        </Link>
        <Link
          to="/student/learning"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <BookOpen className="w-5 h-5 text-emerald-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Derslerim</span>
          <span className="text-[10px] text-slate-400">İçerik & Notlar</span>
        </Link>
        <Link
          to="/messages"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <MessageSquare className="w-5 h-5 text-indigo-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Mesajlar</span>
          <span className="text-[10px] text-slate-400">Öğretmene Danış</span>
        </Link>
        <Link
          to="/student/exams"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <Target className="w-5 h-5 text-rose-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Sınavlar</span>
          <span className="text-[10px] text-slate-400">Deneme Netleri</span>
        </Link>
        <Link
          to="/student/rewards"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <Gift className="w-5 h-5 text-amber-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">XP & Ödüller</span>
          <span className="text-[10px] text-slate-400">Vitrin & Harca</span>
        </Link>
        <Link
          to="/profile"
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md transition-all text-center group shadow-xs"
        >
          <User className="w-5 h-5 text-slate-500 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-slate-800">Profilim</span>
          <span className="text-[10px] text-slate-400">Hesap Detayı</span>
        </Link>
      </div>

      {/* Top-Level Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Lifetime XP */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ömür Boyu XP</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
            {xpData?.lifetime_xp || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Asla eksilmez</span>
        </div>

        {/* Metric 2: Wallet XP */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cüzdan XP</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 tabular-nums">
            {xpData?.wallet_xp || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Ödül mağazasında harcanır</span>
        </div>

        {/* Metric 3: Level */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Rütbe</span>
            <span className="text-[11px] font-mono font-bold text-amber-600">Lv.{levelInfo.level}</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {levelInfo.title}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Streak */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Disiplin Serisi</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tabular-nums">
            {xpData?.current_streak_days || 0} <span className="text-xs font-normal text-slate-400">Gün</span>
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
            {(xpData?.current_streak_days || 0) >= 3 ? 'Aktif XP Çarpanı Devrede' : '3 günde 1.05x çarpan'}
          </span>
        </div>

        {/* Metric 5: Today Earned */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bugünkü XP</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 tabular-nums">
            {todayEarned} <span className="text-xs font-normal text-slate-400">/ 150</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Günlük kota sınırı</span>
        </div>

        {/* Metric 6: Today Remaining */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kalan Kota</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-sky-600 tabular-nums">
            {todayRemaining} XP
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-medium">Bugünlük hak</span>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Academic Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card
          title="Bugünün Ders Programı"
          subtitle="Haftalık ders çizelgesine göre bugün planlanan dersler"
          className="lg:col-span-1"
        >
          {todaySchedule.length === 0 ? (
            <EmptyState
              title="Bugün Ders Bulunmuyor"
              description="Bugün için tanımlı bir ders seansı bulunmuyor. Bireysel çalışma seansı başlatabilirsiniz."
              icon={<Calendar className="w-6 h-6 text-slate-400" />}
            />
          ) : (
            <div className="divide-y divide-slate-200/80">
              {todaySchedule.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{item.subject_name || 'Ders'}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Öğretmen: {item.teacher_name || 'Atanmamış'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-medium text-amber-700">{item.period}. Ders</span>
                    {item.room && <div className="text-[10px] text-slate-500">Derslik: {item.room}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Academic Analytics Chart (Tier-Aware) */}
        <Card
          title="Akademik Net Gelişimi"
          subtitle="Sınav sonuçlarına göre toplam net trendi ve gelişim analizi"
          className="lg:col-span-2"
        >
          {(subscription?.plan_id || 'free') === 'free' ? (
            <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Gelişmiş Net Trend Grafiği & Sınav Analizi (Standart / Pro / VIP)
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Şu anda <strong>Başlangıç (Ücretsiz)</strong> paketindesiniz. TYT/AYT/LGS deneme net grafiklerini ve ders bazlı gelişim analizlerini açmak için paketinizi yükseltin veya koçunuzdan paket yükseltmesi talep edin.
              </p>
              <div className="pt-1 flex justify-center gap-2">
                <Link to="/pricing">
                  <Button variant="primary" size="sm">
                    Paketleri İncele & Yükselt
                  </Button>
                </Link>
              </div>
            </div>
          ) : examResults.length === 0 ? (
            <EmptyState
              title="Henüz Sınav Verisi Yok"
              description="Girilen TYT, AYT veya LGS deneme sonuçları kaydedildikçe gelişim grafiğiniz burada görselleştirilecektir."
              icon={<Target className="w-6 h-6 text-slate-400" />}
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '0.75rem',
                      color: '#0f172a',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#netGradient)"
                    name="Toplam Net"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Homeworks & Recent Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks & Homeworks */}
        <Card
          title="Aktif Koçluk Görevleri & Ödevler"
          subtitle="Teslim tarihi yaklaşan koçluk görevleri ve branş ödevleri"
          action={
            <Link to="/student/homework" className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              Tümünü Gör &rarr;
            </Link>
          }
        >
          {coachTasks.length === 0 && homeworks.length === 0 ? (
            <EmptyState
              title="Aktif Görev veya Ödev Yok"
              description="Şu an için teslimi bekleyen bir koçluk göreviniz veya ders ödeviniz bulunmuyor."
              icon={<BookOpen className="w-6 h-6 text-slate-400" />}
            />
          ) : (
            <div className="divide-y divide-slate-200/80">
              {/* Coach Tasks First */}
              {coachTasks.map((task) => (
                <div key={task.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">{task.title}</h4>
                      <Badge variant="warning">Koç Görevi</Badge>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span className="text-amber-700 font-bold font-mono">+{task.xp_reward} XP</span>
                      <span aria-hidden="true">·</span>
                      <span>Son Teslim: {new Date(task.due_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <Link to="/student/homework">
                    <Button variant="outline" size="sm">
                      Teslim Et
                    </Button>
                  </Link>
                </div>
              ))}

              {/* Homeworks */}
              {homeworks.map((hw) => (
                <div key={hw.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">{hw.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{hw.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                      <span>Ders: {hw.subject_name || 'Genel'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Son Teslim: {new Date(hw.due_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <Badge variant="neutral">Ödev</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Exams Results */}
        <Card
          title="Son Deneme Sınavları"
          subtitle="Kaydedilen net ve puan dökümleri"
        >
          {examResults.length === 0 ? (
            <EmptyState
              title="Sınav Kaydı Yok"
              description="Öğretmeniniz veya koçunuz tarafından girilen sınav sonuçları burada listelenir."
              icon={<Target className="w-6 h-6 text-slate-400" />}
            />
          ) : (
            <div className="divide-y divide-slate-200/80">
              {examResults.map((res) => (
                <div key={res.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">
                      {res.exam?.title || 'Deneme Sınavı'}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 mt-1">
                      <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded font-mono border border-amber-200">
                        {res.exam?.exam_type || res.exam_type || 'TYT'}
                      </span>
                      {res.branches && res.branches.length > 0 ? (
                        res.branches.map((b, bi) => (
                          <span
                            key={bi}
                            className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                              (Number(b.net) || 0) <= 2
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                                : 'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {b.name}: <strong>{b.net}N</strong>
                          </span>
                        ))
                      ) : (
                        <>
                          <span>Türkçe: {res.turkish_net}</span>
                          <span aria-hidden="true">·</span>
                          <span>Mat: {res.math_net}</span>
                          <span aria-hidden="true">·</span>
                          <span>Fen: {res.science_net}</span>
                          <span aria-hidden="true">·</span>
                          <span>Sos: {res.social_net}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-700">
                      {res.total_net} Net
                    </span>
                    <div className="text-[10px] font-mono text-gray-600">
                      {res.score} Puan
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Action / XP Award Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title="Akademik Seans / XP Kaydı"
        subtitle="Mahfaza.co merkezi atomik XP motoru ile aktivite kaydı"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-600 mb-1.5 font-semibold">Aktivite Türü</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(XP_EARNING_ACTIONS).map(([key, item]) => {
                const isSelected = selectedActionKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedActionKey(key as keyof typeof XP_EARNING_ACTIONS)}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-bold text-gray-800">{item.label}</div>
                    <div className="text-[11px] text-amber-700 font-mono mt-0.5">+{item.baseXP} Taban XP</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-gray-600 mb-1.5 font-semibold">Çalışma Konusu / Notu (İsteğe Bağlı)</label>
            <input
              type="text"
              placeholder="Örn: Limit & Süreklilik soru çözümü"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Real-time preview calculation */}
          {currentPreview && (
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Taban Değer:</span>
                <span>{XP_EARNING_ACTIONS[selectedActionKey].baseXP} XP</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Disiplin Çarpanı ({xpData?.current_streak_days || 0}. gün):</span>
                <span className="text-amber-700 font-bold">{currentPreview.multiplier}x</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Hesaplanan:</span>
                <span>{currentPreview.calculatedXP} XP</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Kalan Günlük Kota:</span>
                <span>{todayRemaining} / 150 XP</span>
              </div>
              <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-emerald-700">
                <span>Kazanılacak Net XP:</span>
                <span>+{currentPreview.finalAwardable} XP</span>
              </div>
            </div>
          )}

          {actionFeedback && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center font-semibold text-amber-800">
              {actionFeedback}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActionModalOpen(false)}
              disabled={submittingAction}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAwardAction}
              isLoading={submittingAction}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Onayla ve Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
