import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { xpService } from '../../services/xpService';
import { academicService } from '../../services/academicService';
import { homeworkService } from '../../services/homeworkService';
import { examService } from '../../services/examService';
import { subscriptionService } from '../../services/subscriptionService';
import { announcementService } from '../../services/announcementService';
import { StudentXPData, Homework, ExamResult, ScheduleItem, UserSubscription, Announcement } from '../../types';
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
    if (!user?.id) return;
    try {
      setLoading(true);
      const [xp, hw, exams, schedule, sub, annList] = await Promise.all([
        xpService.getStudentXP(user.id).catch(() => null),
        homeworkService.getHomeworks().catch(() => []),
        examService.getStudentExamResults(user.id).catch(() => []),
        academicService.getMasterSchedule().catch(() => []),
        subscriptionService.getUserSubscription(user.id).catch(() => null),
        announcementService.getAnnouncements('student').catch(() => []),
      ]);

      setXpData(xp);
      setHomeworks((hw || []).slice(0, 5));
      setExamResults((exams || []).slice(0, 5));
      setSubscription(sub);
      setAnnouncements((annList || []).slice(0, 3));

      // Filter schedule for today (Monday = 1, Sunday = 7)
      const currentDay = new Date().getDay();
      const mappedDay = currentDay === 0 ? 7 : currentDay;
      setTodaySchedule((schedule || []).filter((s) => s.day_of_week === mappedDay));
    } catch {
      // Graceful fallback for offline or schema cache sync
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const levelInfo = xpData ? calculateLevel(xpData.lifetime_xp) : calculateLevel(0);
  const todayEarned = xpData?.today_earned_xp || 0;
  const todayRemaining = Math.max(0, DAILY_XP_HARD_CAP - todayEarned);

  // Handle XP award action (Atomic RPC)
  const handleAwardAction = async () => {
    if (!user?.id || !xpData) return;
    setSubmittingAction(true);
    setActionFeedback(null);

    const action = XP_EARNING_ACTIONS[selectedActionKey];
    try {
      const res = await xpService.awardXPAtomic({
        student_id: user.id,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-amber-400 tracking-wider uppercase">Mahfaza.co Kumanda Masası</span>
            <Link
              to="/pricing"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              {subscription?.plan?.name || 'Başlangıç (Ücretsiz)'}
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Hoş Geldin, {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'Talebe'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            "Planını Kur. Disiplinini Koru. Hedefine Ulaş."
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Play className="w-4 h-4" />}
            onClick={() => setActionModalOpen(true)}
          >
            Seans Başlat / XP Kaydet
          </Button>
        </div>
      </div>

      {/* Announcements Bar (if any published announcements exist) */}
      {announcements.length > 0 && (
        <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-amber-500/30 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-100">{announcements[0].title}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono">
                Duyuru
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2">{announcements[0].content}</p>
          </div>
        </div>
      )}

      {/* Quick Action Shortcuts (Section 4 & Section 10) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Link
          to="/student/sessions"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <BookOpen className="w-5 h-5 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Çalışma</span>
          <span className="text-[10px] text-zinc-500">Seans Başlat</span>
        </Link>
        <Link
          to="/student/homework"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <CheckSquare className="w-5 h-5 text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Görevlerim</span>
          <span className="text-[10px] text-zinc-500">Ödev & Takip</span>
        </Link>
        <Link
          to="/student/learning"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <BookOpen className="w-5 h-5 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Derslerim</span>
          <span className="text-[10px] text-zinc-500">İçerik & Notlar</span>
        </Link>
        <Link
          to="/messages"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <MessageSquare className="w-5 h-5 text-indigo-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Mesajlar</span>
          <span className="text-[10px] text-zinc-500">Öğretmene Danış</span>
        </Link>
        <Link
          to="/student/exams"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <Target className="w-5 h-5 text-rose-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Sınavlar</span>
          <span className="text-[10px] text-zinc-500">Deneme Netleri</span>
        </Link>
        <Link
          to="/student/rewards"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <Gift className="w-5 h-5 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">XP & Ödüller</span>
          <span className="text-[10px] text-zinc-500">Vitrin & Harca</span>
        </Link>
        <Link
          to="/profile"
          className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 hover:bg-zinc-900 transition-all text-center group"
        >
          <User className="w-5 h-5 text-zinc-400 mb-1.5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-zinc-200">Profilim</span>
          <span className="text-[10px] text-zinc-500">Hesap Detayı</span>
        </Link>
      </div>

      {/* Top-Level Metrics Grid (Section 32) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Lifetime XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Ömür Boyu XP</span>
            <Award className="w-4 h-4 text-amber-400/80" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {xpData?.lifetime_xp || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Asla eksilmez</span>
        </div>

        {/* Metric 2: Wallet XP */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Cüzdan XP</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {xpData?.wallet_xp || 0}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Ödül mağazasında harcanır</span>
        </div>

        {/* Metric 3: Level */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Akademik Rütbe</span>
            <span className="text-[11px] font-mono text-amber-400">Lv.{levelInfo.level}</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-zinc-100 truncate">
            {levelInfo.title}
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 4: Streak */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Disiplin Serisi</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {xpData?.current_streak_days || 0} <span className="text-xs font-normal text-zinc-400">Gün</span>
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">
            {(xpData?.current_streak_days || 0) >= 3 ? 'Aktif XP Çarpanı Devrede' : '3 günde 1.05x çarpan'}
          </span>
        </div>

        {/* Metric 5: Today Earned */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Bugünkü XP</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {todayEarned} <span className="text-xs font-normal text-zinc-500">/ 150 XP</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Azami: 150 XP/gün</span>
        </div>

        {/* Metric 6: Today Remaining */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Kalan Günlük Kota</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-200 tabular-nums">
            {todayRemaining} <span className="text-xs font-normal text-zinc-500">XP</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Bugün kazanılabilecek maksimum XP: {todayRemaining}</span>
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
              icon={<Calendar className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {todaySchedule.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">{item.subject_name || 'Ders'}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Öğretmen: {item.teacher_name || 'Atanmamış'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-medium text-amber-400">{item.period}. Ders</span>
                    {item.room && <div className="text-[10px] text-zinc-500">Derslik: {item.room}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Academic Analytics Chart */}
        <Card
          title="Akademik Net Gelişimi"
          subtitle="Sınav sonuçlarına göre toplam net trendi"
          className="lg:col-span-2"
        >
          {examResults.length === 0 ? (
            <EmptyState
              title="Henüz Sınav Verisi Yok"
              description="Girilen TYT, AYT veya LGS deneme sonuçları kaydedildikçe gelişim grafiğiniz burada görselleştirilecektir."
              icon={<Target className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#27272a',
                      borderRadius: '0.375rem',
                      color: '#f4f4f5',
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
        {/* Homeworks */}
        <Card
          title="Aktif Ödevler"
          subtitle="Teslim tarihi yaklaşan akademik görevler"
        >
          {homeworks.length === 0 ? (
            <EmptyState
              title="Aktif Ödev Yok"
              description="Şu an için teslimi bekleyen bir ödeviniz bulunmuyor."
              icon={<BookOpen className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {homeworks.map((hw) => (
                <div key={hw.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{hw.title}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{hw.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                      <span>Ders: {hw.subject_name || 'Genel'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Son Teslim: {new Date(hw.due_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                  <Badge variant="warning">Bekliyor</Badge>
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
              icon={<Target className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {examResults.map((res) => (
                <div key={res.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      {res.exam?.title || 'Deneme Sınavı'}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                      <span>Tür: {res.exam?.exam_type || 'TYT'}</span>
                      <span aria-hidden="true">·</span>
                      <span>Türkçe: {res.turkish_net}</span>
                      <span aria-hidden="true">·</span>
                      <span>Mat: {res.math_net}</span>
                      <span aria-hidden="true">·</span>
                      <span>Fen: {res.science_net}</span>
                      <span aria-hidden="true">·</span>
                      <span>Sos: {res.social_net}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {res.total_net} Net
                    </span>
                    <div className="text-[10px] font-mono text-zinc-500">
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
            <label className="block text-zinc-400 mb-1.5 font-medium">Aktivite Türü</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(XP_EARNING_ACTIONS).map(([key, item]) => {
                const isSelected = selectedActionKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedActionKey(key as keyof typeof XP_EARNING_ACTIONS)}
                    className={`p-2.5 rounded border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-500/80 bg-amber-500/10 text-amber-200'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-semibold text-zinc-200">{item.label}</div>
                    <div className="text-[11px] text-amber-400/90 font-mono mt-0.5">+{item.baseXP} Taban XP</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">Çalışma Konusu / Notu (İsteğe Bağlı)</label>
            <input
              type="text"
              placeholder="Örn: Limit & Süreklilik soru çözümü"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Real-time preview calculation according to Section 21 & 23 */}
          {currentPreview && (
            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-zinc-400">
                <span>Taban Değer:</span>
                <span>{XP_EARNING_ACTIONS[selectedActionKey].baseXP} XP</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Disiplin Çarpanı ({xpData?.current_streak_days || 0}. gün):</span>
                <span className="text-amber-400">{currentPreview.multiplier}x</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Hesaplanan:</span>
                <span>{currentPreview.calculatedXP} XP</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Kalan Günlük Kota:</span>
                <span>{todayRemaining} / 150 XP</span>
              </div>
              <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold text-emerald-400">
                <span>Kazanılacak Net XP:</span>
                <span>+{currentPreview.finalAwardable} XP</span>
              </div>
            </div>
          )}

          {actionFeedback && (
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-center font-medium text-amber-400">
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
