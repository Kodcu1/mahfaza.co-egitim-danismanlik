import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { academicService } from '../../services/academicService';
import { attendanceService } from '../../services/attendanceService';
import { homeworkService } from '../../services/homeworkService';
import { subscriptionService } from '../../services/subscriptionService';
import { relationshipService } from '../../services/relationshipService';
import { branchTeacherService, BranchTopicStatus } from '../../services/branchTeacherService';
import {
  AcademicClass,
  ScheduleItem,
  Homework,
  AttendanceSession,
  UserSubscription,
  Profile,
  BranchTeacherFeedback,
} from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Calendar,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Users,
  Plus,
  ArrowRight,
  CreditCard,
  Target,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';

const BRANCH_TOPICS_MAP: Record<string, string[]> = {
  Matematik: [
    'Temel Kavramlar & Sayılar',
    'Fonksiyonlar & Grafikler',
    'Polinomlar & İkinci Dereceden Denklemler',
    'Trigonometri',
    'Limit ve Süreklilik',
    'Türev ve Uygulamaları',
    'İntegral ve Alan Hesabı',
  ],
  Geometri: [
    'Üçgende Açılar ve Alan',
    'Özel Dörtgenler & Çember',
    'Analitik Geometri',
    'Katı Cisimler (Prizma/Piramit)',
  ],
  Fizik: [
    'Kuvvet ve Hareket (Newton Yasaları)',
    'İş, Güç ve Enerji',
    'Elektrik ve Manyetizma',
    'Dalga Mekaniği ve Optik',
    'Modern Fizik',
  ],
  Kimya: [
    'Kimyasal Türler Arası Etkileşimler',
    'Mol Kavramı & Gazlar',
    'Çözeltiler ve Çözünürlük',
    'Kimyasal Tepkimelerde Enerji ve Hız',
    'Organik Kimyaya Giriş & Hidrokarbonlar',
  ],
  Biyoloji: [
    'Hücre Bölünmeleri ve Üreme',
    'Kalıtım ve Biyolojik Çeşitlilik',
    'İnsan Fizyolojisi (Sistemler)',
    'Hücresel Solunum ve Fotosentez',
    'Bitki Biyolojisi',
  ],
  'Türk Dili ve Edebiyatı': [
    'Paragrafta Anlam ve Yapı',
    'Dil Bilgisi (Sözcük Türleri & Cümle Bilgisi)',
    'Divan ve Halk Edebiyatı',
    'Tanzimat ve Servet-i Fünun',
    'Cumhuriyet Dönemi Türk Edebiyatı',
  ],
  Tarih: [
    'İlk ve Orta Çağlarda Türk Dünyası',
    'Osmanlı Kuruluş ve Klasik Dönem',
    'Milli Mücadele ve Kurtuluş Savaşı',
    'Atatürkçülük ve Türk İnkılabı',
  ],
  Coğrafya: [
    'Doğal Sistemler ve Harita Bilgisi',
    'İklim Tipleri ve Türkiye İklimi',
    'Nüfus, Yerleşme ve Göçler',
    'Türkiye’nin Ekonomik Coğrafyası',
  ],
  'Felsefe Grubu & Din Kültürü': [
    'Felsefeye Giriş ve Bilgi Felsefesi',
    'Ahlak ve Varlık Felsefesi',
    'Mantık ve Sosyoloji Temelleri',
    'İnanç ve İbadet Esasları',
  ],
  'Rehberlik ve Psikolojik Danışmanlık': [
    'Zaman Yönetimi & Çalışma Rutini',
    'Sınav Kaygısı ve Motivasyon',
    'Mesleki İlgi ve Hedef Belirleme',
    'Deneme Stratejisi ve Turlama Tekniği',
  ],
};

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [recentSessions, setRecentSessions] = useState<AttendanceSession[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Branch Selection
  const [selectedBranch, setSelectedBranch] = useState<string>('Matematik');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);

  // Topic Acquisition Tracker State
  const [topicStatuses, setTopicStatuses] = useState<Record<string, 'tamamlandi' | 'devam_ediyor' | 'eksik'>>({});

  // Digital Parent Meeting Note Modal
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [opinionText, setOpinionText] = useState('');
  const [strengthsText, setStrengthsText] = useState('');
  const [improvementsText, setImprovementsText] = useState('');
  const [recommendationsText, setRecommendationsText] = useState('');
  const [academicStatus, setAcademicStatus] = useState<'Pekiyi' | 'İyi' | 'Orta' | 'Geliştirilmeli' | 'Kritik'>('İyi');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);

  // Targeted Homework / Question Target Modal
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetTitle, setTargetTitle] = useState('');
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(40);
  const [targetDueDate, setTargetDueDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [targetXp, setTargetXp] = useState<number>(50);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSuccess, setTargetSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const fetchPromise = (async () => {
        const [cls, sched, hws, sessions, sub, studs] = await Promise.all([
          academicService.getClasses().catch(() => []),
          academicService.getMasterSchedule(undefined, user.id).catch(() => []),
          homeworkService.getHomeworks().catch(() => []),
          attendanceService.getSessions().catch(() => []),
          subscriptionService.getUserSubscription(user.id).catch(() => null),
          relationshipService.getProfilesByRole('student').catch(() => []),
        ]);
        setClasses(cls || []);
        setSchedule(sched || []);
        setHomeworks((hws || []).filter((h) => h.teacher_id === user.id || !h.teacher_id));
        setRecentSessions((sessions || []).slice(0, 5));
        setUserSubscription(sub);
        setStudents(studs || []);

        if (studs && studs.length > 0 && !selectedStudent) {
          setSelectedStudent(studs[0]);
        }
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Notice loading teacher dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load topic statuses when selected student or branch changes
  useEffect(() => {
    if (selectedStudent) {
      const statuses = branchTeacherService.getTopicStatuses(selectedStudent.id, selectedBranch);
      setTopicStatuses(statuses);
    }
  }, [selectedStudent, selectedBranch]);

  const handleSetTopicStatus = (topic: string, status: 'tamamlandi' | 'devam_ediyor' | 'eksik') => {
    if (!selectedStudent) return;
    branchTeacherService.setTopicStatus(selectedStudent.id, selectedBranch, topic, status);
    setTopicStatuses((prev) => ({ ...prev, [topic]: status }));
  };

  const handleSaveTeacherNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !user?.id) return;

    setSavingNote(true);
    setNoteSuccess(null);
    try {
      await branchTeacherService.createFeedback({
        student_id: selectedStudent.id,
        teacher_name: (user as any).full_name || (user as any).name || user.user_metadata?.full_name || 'Branş Öğretmeni',
        subject: selectedBranch,
        academic_status: academicStatus,
        opinion: opinionText,
        strengths: strengthsText,
        improvements: improvementsText,
        recommendations: recommendationsText,
      });

      setNoteSuccess('Branş değerlendirme notu veli görüşme formuna başarıyla aktarıldı!');
      setTimeout(() => {
        setNoteModalOpen(false);
        setNoteSuccess(null);
        setOpinionText('');
        setStrengthsText('');
        setImprovementsText('');
        setRecommendationsText('');
      }, 1500);
    } catch (err: any) {
      console.error('Error saving teacher note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAssignTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !user?.id) return;

    setSavingTarget(true);
    setTargetSuccess(null);
    try {
      await branchTeacherService.assignStudentTarget({
        student_id: selectedStudent.id,
        teacher_id: user.id,
        subject_name: selectedBranch,
        title: targetTitle.trim(),
        question_count: targetQuestionCount,
        due_date: new Date(targetDueDate).toISOString(),
        xp_reward: targetXp,
      });

      setTargetSuccess('Öğrenciye özel branş soru hedefi başarıyla tanımlandı!');
      setTimeout(() => {
        setTargetModalOpen(false);
        setTargetSuccess(null);
        setTargetTitle('');
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning target:', err);
    } finally {
      setSavingTarget(false);
    }
  };

  const branchTopics = BRANCH_TOPICS_MAP[selectedBranch] || [];

  if (loading) {
    return <LoadingState message="Öğretmen masası yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            Öğretmen Masası
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Akademik Eğitim & Branş Değerlendirme
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrenci konu kazanım takibi, veli görüşme formu branş notları ve kişiselleştirilmiş soru hedefleri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/pricing"
            className="p-1.5 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-colors flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">
                {userSubscription?.plan?.name || 'Öğretmen Başlangıç'}
              </div>
              <div className="text-[11px] font-bold text-zinc-200 font-mono">
                Kapasite: {userSubscription?.plan?.student_capacity || 30} Öğrenci
              </div>
            </div>
          </Link>

          <NavLink to="/teacher/content">
            <Button variant="secondary" size="sm" leftIcon={<BookOpen className="w-3.5 h-3.5" />}>
              Materyaller
            </Button>
          </NavLink>
          <NavLink to="/teacher/attendance">
            <Button variant="primary" size="sm" leftIcon={<CheckSquare className="w-3.5 h-3.5" />}>
              Yoklama Al
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Haftalık Dersim</span>
            <Calendar className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {schedule.length} <span className="text-xs font-normal text-zinc-500">Saat</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Haftalık toplam seans</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Takip Edilen Danışan</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {students.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Kayıtlı aktif öğrenci</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Verilen Ödevler</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
            {homeworks.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Aktif görev</span>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Yoklama Kaydı</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {recentSessions.length}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Tamamlanan seans</span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 4. BRANŞ ÖĞRETMENİ PANELİ: ÖĞRENCİ VE KAZANIM MASASI */}
      {/* ========================================================== */}
      <Card
        title="Branş Öğretmeni Değerlendirme & Kazanım Masası"
        subtitle="Öğrenci konu kazanım takibi, veli görüşme formuna dijital not aktarımı ve branş soru hedefleri"
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-lg bg-zinc-900 border border-zinc-700 text-amber-400 font-semibold focus:outline-none cursor-pointer"
            >
              {Object.keys(BRANCH_TOPICS_MAP).map((br) => (
                <option key={br} value={br}>
                  Branş: {br}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Student Selector Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-300">
                Atanmış Öğrenciler ({students.length})
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                İşlem yapmak istediğiniz öğrenciyi seçin
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {students.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStudent(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border cursor-pointer ${
                    selectedStudent?.id === st.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-bold">
                    {st.first_name?.[0] || 'Ö'}
                  </div>
                  <span>
                    {st.first_name} {st.last_name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedStudent && (
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-5">
              {/* Selected Student Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-850">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {selectedStudent.first_name?.[0] || 'Ö'}
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 text-sm">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {selectedStudent.email} · Branş: <span className="text-amber-400 font-semibold">{selectedBranch}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setNoteModalOpen(true)}
                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                  >
                    Veli Formuna Branş Görüşü Gir
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTargetModalOpen(true)}
                    leftIcon={<Target className="w-3.5 h-3.5" />}
                  >
                    Özel Soru Hedefi Ata
                  </Button>
                </div>
              </div>

              {/* 1. KONU TAMAMLAMA / KAZANIM DURUMU (Topic Checkpoints) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
                    {selectedBranch} Konu & Kazanım Tamamlama Durumu
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Öğrencinin konu hakimiyetini güncelleyin
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {branchTopics.map((topic) => {
                    const status = topicStatuses[topic] || 'devam_ediyor';
                    return (
                      <div
                        key={topic}
                        className="p-3 rounded-lg bg-zinc-900 border border-zinc-850 flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-200 font-medium truncate pr-2">
                          {topic}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetTopicStatus(topic, 'tamamlandi')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                              status === 'tamamlandi'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Tamamlandı
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetTopicStatus(topic, 'devam_ediyor')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                              status === 'devam_ediyor'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Sürüyor
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetTopicStatus(topic, 'eksik')}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                              status === 'eksik'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            Eksik Var
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Grid: Timetable & Recent Homeworks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Ders Çizelgem"
          subtitle="Atandığınız haftalık ders saatleri"
          action={
            <NavLink to="/teacher/schedule" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>Tümü</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          }
        >
          {schedule.length === 0 ? (
            <EmptyState
              title="Ders Ataması Yok"
              description="Yönetici tarafından adınıza atanmış bir ders saati bulunmuyor."
              icon={<Calendar className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {schedule.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{item.subject_name || 'Ders'}</span>
                    <span className="text-zinc-500 ml-2">· {item.class_name}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-amber-400 font-bold">{item.period}. Ders</span>
                    {item.room && <span className="text-zinc-500 text-[10px] ml-2">({item.room})</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Aktif Ödevler & Teslimler"
          subtitle="Öğrencilere atadığınız ödevler ve teslim durumu"
          action={
            <NavLink to="/teacher/homework" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <span>Yönet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </NavLink>
          }
        >
          {homeworks.length === 0 ? (
            <EmptyState
              title="Ödev Bulunmuyor"
              description="Henüz bir ödev tanımlamadınız."
              actionText="Yeni Ödev Ver"
              onAction={() => window.location.href = '/teacher/homework'}
              icon={<BookOpen className="w-6 h-6 text-zinc-500" />}
            />
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {homeworks.slice(0, 5).map((hw) => (
                <div key={hw.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200">{hw.title}</span>
                    <div className="text-[10px] text-zinc-500">
                      Sınıf: {hw.class_name || 'Genel'} · Son Tarih: {new Date(hw.due_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                  <Badge variant="amber">Aktif</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================== */}
      {/* MODAL 1: VELİ GÖRÜŞME FORMUNA BRANŞ NOTU GİRİŞİ */}
      {/* ========================================================== */}
      <Modal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title={`Veli Görüşme Formu Branş Görüşü: ${selectedBranch}`}
      >
        <form onSubmit={handleSaveTeacherNote} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            Öğrenci: <strong className="text-zinc-100">{selectedStudent?.first_name} {selectedStudent?.last_name}</strong>
            <p className="text-[11px] text-amber-200/80 mt-1">
              Girdiğiniz bu notlar, koçun veli için üreteceği resmi <strong>A4 Veli Görüşme Raporu ve PDF</strong> belgesinin 
              <strong> 3. Branş Öğretmenleri Görüşleri ({selectedBranch})</strong> kutusuna otomatik olarak dijital formatta yansıyacaktır.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Genel Konu Hakimiyeti Derecesi
            </label>
            <select
              value={academicStatus}
              onChange={(e) => setAcademicStatus(e.target.value as any)}
              className="w-full p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
            >
              <option value="Pekiyi">Pekiyi (Tam Hakimiyet)</option>
              <option value="İyi">İyi (Yeterli Kavrama)</option>
              <option value="Orta">Orta (Soru Çözümüyle Pekiştirilmeli)</option>
              <option value="Geliştirilmeli">Geliştirilmeli (Temel Eksikler Var)</option>
              <option value="Kritik">Kritik (Acil Konu Telafisi Gerekli)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              1. Öğretmen Görüşü & Konu Hakimiyeti *
            </label>
            <textarea
              value={opinionText}
              onChange={(e) => setOpinionText(e.target.value)}
              placeholder="Örn: Türev kurallarına hakim, fakat geometrik yorum sorularında zorlanıyor."
              className="w-full h-16 p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              2. Güçlü Yönler
            </label>
            <input
              type="text"
              value={strengthsText}
              onChange={(e) => setStrengthsText(e.target.value)}
              placeholder="Örn: Temel kavram kavrayışı, hızlı işlem kabiliyeti"
              className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              3. Gelişim Alanları / Eksik Kazanımlar
            </label>
            <input
              type="text"
              value={improvementsText}
              onChange={(e) => setImprovementsText(e.target.value)}
              placeholder="Örn: Maksimum-minimum problemleri, zincir kuralı"
              className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              4. Haftalık Öneri / Ödev
            </label>
            <input
              type="text"
              value={recommendationsText}
              onChange={(e) => setRecommendationsText(e.target.value)}
              placeholder="Örn: Günde en az 30 adet türev sorusu çözülmeli ve yapamadıkları sorulmalı."
              className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {noteSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {noteSuccess}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={savingNote}
              onClick={() => setNoteModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={savingNote}
            >
              Rapor Notunu Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================== */}
      {/* MODAL 2: ÖĞRENCİYE ÖZEL BRANŞ ÖDEVİ / SORU HEDEFİ ATAMA */}
      {/* ========================================================== */}
      <Modal
        isOpen={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        title={`Öğrenciye Özel Branş Hedefi Tanımla: ${selectedBranch}`}
      >
        <form onSubmit={handleAssignTarget} className="space-y-4">
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
            Hedef Öğrenci: <strong className="text-zinc-100">{selectedStudent?.first_name} {selectedStudent?.last_name}</strong>
            <p className="text-[11px] text-purple-200/80 mt-1">
              Atanan bu hedef öğrencinin çalışma odasında ve aktif görevler panelinde görüntülenecektir.
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Hedef Görev Başlığı *
            </label>
            <input
              type="text"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="Örn: AYT Matematik Türev 50 Soru Bankası Testi"
              className="w-full p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Hedef Soru Sayısı
              </label>
              <input
                type="number"
                min={10}
                max={500}
                value={targetQuestionCount}
                onChange={(e) => setTargetQuestionCount(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Kazanılacak XP Ödülü
              </label>
              <input
                type="number"
                min={10}
                max={150}
                value={targetXp}
                onChange={(e) => setTargetXp(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Son Teslim Tarihi
            </label>
            <input
              type="date"
              value={targetDueDate}
              onChange={(e) => setTargetDueDate(e.target.value)}
              className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          {targetSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {targetSuccess}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={savingTarget}
              onClick={() => setTargetModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={savingTarget}
            >
              Hedefi Öğrenciye Ata
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
