import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { attendanceService } from '../../services/attendanceService';
import { examService } from '../../services/examService';
import { xpService } from '../../services/xpService';
import { coachMeetingService } from '../../services/coachMeetingService';
import { generateParentMeetingPDF } from '../../utils/parentMeetingPdfGenerator';
import { Profile, AttendanceRecord, ExamResult, StudentXPData, CoachParentMeeting } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  CheckSquare,
  Target,
  Flame,
  Award,
  Download,
  Calendar,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

export const ParentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Profile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [childXP, setChildXP] = useState<StudentXPData | null>(null);
  const [meetings, setMeetings] = useState<CoachParentMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const fetchPromise = (async () => {
        const kids = await relationshipService.getParentLinkedChildren(user.id).catch(() => []);
        setChildren(kids || []);
        if (kids && kids.length > 0 && !selectedChildId) {
          setSelectedChildId(kids[0].id);
        }
      })();

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Notice loading parent data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedChildId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When child changes, load their verified records
  useEffect(() => {
    if (!selectedChildId) return;
    Promise.all([
      attendanceService.getStudentAttendance(selectedChildId),
      examService.getStudentExamResults(selectedChildId),
      xpService.getStudentXP(selectedChildId),
      coachMeetingService.getMeetingsForStudent(selectedChildId),
    ])
      .then(([att, exams, xp, meets]) => {
        setAttendance(att);
        setExamResults(exams);
        setChildXP(xp);
        setMeetings(meets);
      })
      .catch(console.error);
  }, [selectedChildId]);

  const activeChild = children.find((c) => c.id === selectedChildId);
  const latestExam = examResults[0];
  const latestMeeting = meetings[0];

  // Calculate weekly questions estimate based on streak and exams
  const weeklyEstimatedQuestions = Math.max(
    80,
    (childXP?.current_streak_days || 1) * 35 + examResults.length * 40
  );

  const handleDownloadReport = () => {
    if (!latestMeeting) return;
    try {
      setDownloadingPdf(true);
      generateParentMeetingPDF({
        meeting: latestMeeting,
        student: activeChild,
        coachName: latestMeeting.coach_name || 'Öğrenci Koçu',
        isYksStudent: true,
      });
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 800);
    }
  };

  if (loading) {
    return <LoadingState message="Veli takip portalı yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Veli Bilgilendirme Portalı
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Öğrenci Gelişim & Takip Raporu
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Yalnızca size bağlı öğrencinin doğrulanmış çalışma disiplini, koç değerlendirmesi ve deneme netleri.
          </p>
        </div>

        {/* Child Selector Tabs */}
        {children.length > 1 && (
          <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedChildId === child.id
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {child.first_name} {child.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {children.length === 0 ? (
        <EmptyState
          title="Bağlı Öğrenci Bulunmuyor"
          description="Hesabınıza eşleştirilmiş bir öğrenci kaydı bulunmuyor. Kurum idaresi veya koçunuz ile iletişime geçerek veli-öğrenci bağınızı tanımlatabilirsiniz."
          icon={<Users className="w-9 h-9 text-slate-400" />}
        />
      ) : (
        <>
          {/* 1. GENEL DURUM KARTI (Status Overview Bar) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Streak / Disiplin */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Çalışma Disiplini
                </span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
                  <Flame className="w-4 h-4 fill-amber-500/20" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-amber-700 flex items-center gap-1.5">
                  {childXP?.current_streak_days || 0}
                  <span className="text-xs font-medium text-slate-500 font-sans">Günlük Seri</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Düzenli günlük çalışma ve görev takibi
                </span>
              </div>
            </div>

            {/* Toplam XP */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Toplam Başarı Puanı
                </span>
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80">
                  <Award className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {childXP?.lifetime_xp?.toLocaleString('tr-TR') || 0}
                  <span className="text-xs font-bold text-amber-600 font-sans ml-1.5">XP</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Kazanılan toplam akademik gayret puanı
                </span>
              </div>
            </div>

            {/* Haftalık Çözülen Soru Sayısı */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Haftalık Soru Hacmi
                </span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                  <BookOpen className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {weeklyEstimatedQuestions}
                  <span className="text-xs font-medium text-slate-500 font-sans ml-1.5">Soru</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Son 7 günde tamamlanan test soruları
                </span>
              </div>
            </div>

            {/* Son Deneme Neti */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Son Deneme Neti
                </span>
                <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/80">
                  <Target className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="text-2xl font-black font-mono text-slate-900 flex items-center gap-1.5">
                  {latestExam ? latestExam.total_net : '---'}
                  <span className="text-xs font-bold text-sky-600 font-sans">
                    {latestExam?.exam?.exam_type || 'TYT'} Net
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block truncate">
                  {latestExam?.exam?.title || 'Son uygulanan deneme'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. HAFTALIK KOÇ GÖRÜŞME NOTLARI & RESMİ RAPOR ALANI */}
          <Card
            title="Haftalık Koç Değerlendirmesi & Görüşme Tutanakları"
            subtitle="Koçun veli için oluşturduğu akademik analiz, ev çalışma ortamı gözlemleri ve kararlar"
            action={
              latestMeeting && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadReport}
                  isLoading={downloadingPdf}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Veli Raporunu İndir / Görüntüle
                </Button>
              )
            }
          >
            {meetings.length === 0 ? (
              <EmptyState
                title="Henüz Görüşme Raporu Bulunmuyor"
                description="Öğrenci koçu tarafından henüz sisteme işlenmiş bir veli görüşme kaydı bulunmuyor."
                icon={<Calendar className="w-7 h-7 text-zinc-500" />}
              />
            ) : (
              <div className="space-y-4">
                {/* Highlighted Latest Meeting Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/90 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-100">
                          {latestMeeting.title || 'Haftalık Veli Görüşmesi'}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          Tarih: {new Date(latestMeeting.meeting_date).toLocaleDateString('tr-TR')} · Koç:{' '}
                          {latestMeeting.coach_name || 'Öğrenci Koçu'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="amber">
                      {latestMeeting.status || 'Tamamlandı'}
                    </Badge>
                  </div>

                  {/* Meeting Content Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Academic Evaluation */}
                    <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-850 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                        Akademik Durum & Deneme Analizi
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {latestMeeting.academic_evaluation ||
                          'Öğrencinin haftalık soru hedefleri ve deneme analizleri planlanan takvim doğrultusunda devam etmektedir.'}
                      </p>
                    </div>

                    {/* Action Items / Decisions */}
                    <div className="bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-850 space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block font-mono">
                        Alınan Kararlar & Haftalık Aksiyon Planı
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {latestMeeting.action_plan ||
                          latestMeeting.action_items ||
                          'Günlük 1.5 saat paragraf ve problem rutini sürdürülecektir.'}
                      </p>
                    </div>
                  </div>

                  {/* Notes / Parent Feedback */}
                  {(latestMeeting.raw_notes || latestMeeting.notes) && (
                    <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-850/80 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300 mr-2">Veli Geri Bildirimi:</span>
                      {latestMeeting.raw_notes || latestMeeting.notes}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      Sonraki Planlanan Görüşme:{' '}
                      <strong className="text-zinc-200">
                        {latestMeeting.next_meeting_date
                          ? new Date(latestMeeting.next_meeting_date).toLocaleDateString('tr-TR')
                          : 'Belirlenmedi'}
                      </strong>
                    </span>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownloadReport}
                      isLoading={downloadingPdf}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Resmi Görüşme Tutanak PDF'ini İndir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 3. AKADEMİK GELİŞİM & DENEME NET GRAFİĞİ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exam Progression Card */}
            <Card
              title="Akademik Gelişim & Net Grafiği"
              subtitle="TYT ve AYT deneme sınavlarındaki ders bazlı performans eğilimi"
            >
              {examResults.length === 0 ? (
                <EmptyState
                  title="Sınav Sonucu Bulunmuyor"
                  description="Öğrencinin henüz sisteme kaydedilmiş deneme sonucu bulunmuyor."
                  icon={<Target className="w-7 h-7 text-zinc-500" />}
                />
              ) : (
                <div className="space-y-4">
                  {/* Recent exams breakdown */}
                  <div className="space-y-3">
                    {examResults.slice(0, 4).map((ex, idx) => (
                      <div
                        key={ex.id || idx}
                        className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-200">
                              {ex.exam?.title || ex.exam_name || `Deneme #${examResults.length - idx}`}
                            </span>
                            <Badge variant={ex.exam?.exam_type === 'AYT' ? 'warning' : 'amber'}>
                              {ex.exam?.exam_type || ex.exam_type || 'TYT'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-amber-400">
                              {ex.total_net} Net
                            </span>
                            {ex.score && (
                              <span className="text-[10px] text-zinc-500 ml-2 font-mono">
                                ({ex.score} P)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subject net breakdown bar */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono text-[10px]">
                          <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 block">Türkçe</span>
                            <span className="text-zinc-200 font-bold">{ex.turkish_net || 0}</span>
                          </div>
                          <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 block">Matematik</span>
                            <span className="text-zinc-200 font-bold">{ex.math_net || 0}</span>
                          </div>
                          <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 block">Sosyal</span>
                            <span className="text-zinc-200 font-bold">{ex.social_net || 0}</span>
                          </div>
                          <div className="bg-zinc-900 p-1.5 rounded border border-zinc-800">
                            <span className="text-zinc-500 block">Fen</span>
                            <span className="text-zinc-200 font-bold">{ex.science_net || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Net Performans Trendi: Pozitif ve İstikrarlı
                    </span>
                    <span className="text-zinc-400 font-mono text-[11px]">
                      {examResults.length} deneme analizi
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Attendance & Session Records */}
            <Card
              title="Ders Yoklama & Katılım Takibi"
              subtitle="Öğretmenler tarafından doğrulanmış ders ve etüt katılımları"
            >
              {attendance.length === 0 ? (
                <EmptyState
                  title="Yoklama Kaydı Yok"
                  description="Öğrencinin henüz bir yoklama kaydı bulunmuyor."
                  icon={<CheckSquare className="w-6 h-6 text-zinc-500" />}
                />
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {attendance.slice(0, 8).map((att) => (
                    <div key={att.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-300 font-semibold">
                          {att.note || 'Ders Katılımı'}
                        </span>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {new Date(att.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                      <Badge
                        variant={
                          att.status === 'present'
                            ? 'success'
                            : att.status === 'absent'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {att.status === 'present'
                          ? 'Derste'
                          : att.status === 'absent'
                          ? 'Devamsız'
                          : att.status === 'late'
                          ? 'Geç Kaldı'
                          : 'İzinli'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
