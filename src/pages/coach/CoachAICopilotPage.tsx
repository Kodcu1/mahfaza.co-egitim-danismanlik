import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { examService } from '../../services/examService';
import { coachTaskService } from '../../services/coachTaskService';
import { xpService } from '../../services/xpService';
import { Profile, ExamResult, CoachTask, StudentXPData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  TrendingUp,
  Award,
  Target,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Calendar,
  BarChart2,
  User,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const CoachAICopilotPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentDataLoading, setStudentDataLoading] = useState(false);

  // Load authorized assigned students
  const loadStudents = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const assigned = await relationshipService.getCoachAssignedStudents(user.id);
      setStudents(assigned);
      if (assigned.length > 0 && !selectedStudentId) {
        setSelectedStudentId(assigned[0].id);
      }
    } catch (err) {
      console.error('Error loading coach students:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedStudentId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Load student academic data when selectedStudentId changes
  const loadStudentAcademicData = useCallback(async (sId: string) => {
    if (!sId || !user?.id) return;
    try {
      setStudentDataLoading(true);
      const [exList, tList, xp] = await Promise.all([
        examService.getStudentExamResults(sId),
        coachTaskService.getTasksForStudent(sId),
        xpService.getStudentXP(sId),
      ]);
      setExams(exList);
      setTasks(tList);
      setXpData(xp);
    } catch (err) {
      console.error('Error loading student academic data:', err);
    } finally {
      setStudentDataLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentAcademicData(selectedStudentId);
    }
  }, [selectedStudentId, loadStudentAcademicData]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // 1. Genel Akademik Durum Metrics
  const generalMetrics = useMemo(() => {
    if (exams.length === 0) {
      return {
        examCount: 0,
        latestNet: null,
        highestNet: null,
        averageNet: null,
      };
    }

    const sortedByDate = [...exams].sort(
      (a, b) => new Date(b.exam_date || b.created_at).getTime() - new Date(a.exam_date || a.created_at).getTime()
    );

    const latestNet = sortedByDate[0].total_net;
    const highestNet = Math.max(...exams.map((e) => Number(e.total_net) || 0));
    const averageNet = Number(
      (exams.reduce((sum, e) => sum + (Number(e.total_net) || 0), 0) / exams.length).toFixed(1)
    );

    return {
      examCount: exams.length,
      latestNet,
      highestNet,
      averageNet,
    };
  }, [exams]);

  // 2. Güçlü ve Gelişim Gerektiren Alanlar (Derived from real branch nets)
  const branchAnalytics = useMemo(() => {
    const branchStats: Record<string, { totalNet: number; count: number; totalCorrect: number; totalWrong: number }> = {};

    exams.forEach((ex) => {
      if (ex.branches && Array.isArray(ex.branches)) {
        ex.branches.forEach((b) => {
          if (!branchStats[b.name]) {
            branchStats[b.name] = { totalNet: 0, count: 0, totalCorrect: 0, totalWrong: 0 };
          }
          branchStats[b.name].totalNet += Number(b.net) || 0;
          branchStats[b.name].count += 1;
          branchStats[b.name].totalCorrect += Number(b.correct) || 0;
          branchStats[b.name].totalWrong += Number(b.wrong) || 0;
        });
      }
    });

    const branchList = Object.entries(branchStats).map(([name, stat]) => ({
      name,
      avgNet: Number((stat.totalNet / stat.count).toFixed(1)),
      avgCorrect: Number((stat.totalCorrect / stat.count).toFixed(1)),
      avgWrong: Number((stat.totalWrong / stat.count).toFixed(1)),
    }));

    // Strong areas: Avg Net >= 20 or highest
    const strong = branchList.filter((b) => b.avgNet >= 18).sort((a, b) => b.avgNet - a.avgNet);
    // Improvement areas: Avg Wrong >= 4 or lowest net
    const improvement = branchList.filter((b) => b.avgWrong >= 3 || b.avgNet < 18).sort((a, b) => b.avgNet - a.avgNet);

    return { strong, improvement, totalBranches: branchList.length };
  }, [exams]);

  // 3. Net / Performans Trendi Chart Data
  const trendData = useMemo(() => {
    if (exams.length === 0) return [];

    return [...exams]
      .sort((a, b) => new Date(a.exam_date || a.created_at).getTime() - new Date(b.exam_date || b.created_at).getTime())
      .map((ex) => ({
        date: new Date(ex.exam_date || ex.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
        net: Number(ex.total_net) || 0,
        title: ex.exam_name || ex.exam?.title || 'Deneme',
      }));
  }, [exams]);

  // 4. Görev / Çalışma Durumu
  const taskStatus = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'approved' || t.status === 'verified').length;
    const pendingReview = tasks.filter((t) => t.status === 'pending_review' || t.status === 'submitted' || t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pendingReview, pending, rate };
  }, [tasks]);

  // 5. Koç İçin Öneriler (Deterministic Data-Driven Observations)
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (exams.length === 0 && tasks.length === 0) {
      return [];
    }

    if (generalMetrics.latestNet !== null && generalMetrics.averageNet !== null) {
      if (generalMetrics.latestNet > generalMetrics.averageNet) {
        recs.push(`Son deneme neti (${generalMetrics.latestNet} Net), genel ortalamanın (${generalMetrics.averageNet} Net) üzerinde seyrediyor. Motivasyon ve çalışma ritmi korunmalı.`);
      } else if (generalMetrics.latestNet < generalMetrics.averageNet) {
        recs.push(`Son denemede ortalamanın (${generalMetrics.averageNet} Net) altında bir sonuç (${generalMetrics.latestNet} Net) alındı. Konu eksiklikleri veya sınav süresi yönetimi incelenmeli.`);
      }
    }

    if (branchAnalytics.improvement.length > 0) {
      const weakest = branchAnalytics.improvement[0];
      recs.push(`"${weakest.name}" dersinde ortalama ${weakest.avgWrong} yanlış bulunuyor. Bu branşa yönelik haftalık soru hedefi veya konu tekrarı atanabilir.`);
    }

    if (taskStatus.pendingReview > 0) {
      recs.push(`Öğrencinin teslim ettiği ve onay bekleyen ${taskStatus.pendingReview} adet koçluk görevi bulunuyor.`);
    }

    if (taskStatus.pending > 3) {
      recs.push(`Öğrenci üzerinde ${taskStatus.pending} adet bekleyen görev birikmiş durumda. Yeni ödev vermeden önce mevcut görevlerin tamamlanması beklenmeli.`);
    }

    if (xpData && xpData.current_streak_days >= 3) {
      recs.push(`Öğrenci ${xpData.current_streak_days} günlük aktif çalışma serisini koruyor. Çarpan bonusu devrede.`);
    }

    return recs;
  }, [exams, tasks, generalMetrics, branchAnalytics, taskStatus, xpData]);

  if (loading) {
    return <LoadingState message="Akademik analiz masası yükleniyor..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Akademik Performans İncelemesi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Veri Tabanlı Akademik Analiz
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrencinizin doğrulanmış veritabanı kayıtları (deneme netleri, görev teslimleri, streak) üzerinden üretilen analitik görünüm.
          </p>
        </div>

        {/* Student Selector */}
        {students.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Danışan:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500 font-medium"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.email})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="Atanmış Öğrenci Bulunmuyor"
          description="Akademik analiz verilerini görüntülemek için lütfen portföyünüze bir öğrenci ekleyin."
          icon={<User className="w-8 h-8 text-zinc-500" />}
        />
      ) : studentDataLoading ? (
        <LoadingState message="Öğrenci verileri inceleniyor..." />
      ) : (
        <>
          {/* SECTION 1: GENEL AKADEMİK DURUM */}
          <div>
            <h2 className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              1. Genel Akademik Durum
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Son Deneme Neti</span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-0.5">
                  {generalMetrics.latestNet !== null ? `${generalMetrics.latestNet} Net` : '—'}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {generalMetrics.examCount > 0 ? `${generalMetrics.examCount} kayıtlı deneme` : 'Yeterli veri bulunamadı.'}
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">En Yüksek Net</span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                  {generalMetrics.highestNet !== null ? `${generalMetrics.highestNet} Net` : '—'}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">Zirve deneme skoru</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Ortalama Net</span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100 mt-0.5">
                  {generalMetrics.averageNet !== null ? `${generalMetrics.averageNet} Net` : '—'}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">Kümülatif sınav ortalaması</span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
                <span className="text-[10px] text-zinc-500 font-mono uppercase block">Toplam XP / Seri</span>
                <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400 mt-0.5">
                  {xpData ? `${xpData.lifetime_xp} XP` : '0 XP'}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {xpData?.current_streak_days ? `${xpData.current_streak_days} gün seri` : 'Seri yok'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2 & 3: GÜÇLÜ ALANLAR & GELİŞİM GEREKTİREN ALANLAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Güçlü Alanlar */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  2. Güçlü Alanlar
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Ders Bazlı Başarı</span>
              </div>

              {branchAnalytics.strong.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-4 text-center">
                  Yeterli veri bulunamadı. (Öğrencinin branş bazlı deneme verisi henüz girilmemiş)
                </p>
              ) : (
                <div className="space-y-2">
                  {branchAnalytics.strong.map((b, idx) => (
                    <div key={idx} className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-zinc-200">{b.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono block">Ortalama {b.avgCorrect} Doğru</span>
                      </div>
                      <Badge variant="success">{b.avgNet} Net</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gelişim Gerektiren Alanlar */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  3. Gelişim Gerektiren Alanlar
                </h3>
                <span className="text-[10px] text-zinc-500 font-mono">Öncelikli Konular</span>
              </div>

              {branchAnalytics.improvement.length === 0 ? (
                <p className="text-xs text-zinc-500 italic py-4 text-center">
                  Yeterli veri bulunamadı. (Öğrencinin branş bazlı deneme verisi henüz girilmemiş)
                </p>
              ) : (
                <div className="space-y-2">
                  {branchAnalytics.improvement.map((b, idx) => (
                    <div key={idx} className="p-2.5 bg-zinc-950/70 border border-zinc-800 rounded flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-zinc-200">{b.name}</span>
                        <span className="text-[10px] text-rose-400/80 font-mono block">Ortalama {b.avgWrong} Yanlış</span>
                      </div>
                      <Badge variant="danger">{b.avgNet} Net</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: NET / PERFORMANS TRENDİ (RECHARTS) */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-mono">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                4. Net / Performans Trendi
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Deneme İlerlemesi</span>
            </div>

            {trendData.length < 2 ? (
              <div className="py-10 text-center space-y-1">
                <p className="text-xs text-zinc-400">Yeterli veri bulunamadı.</p>
                <p className="text-[11px] text-zinc-500">
                  Performans trend grafiği için sisteme en az 2 adet deneme sınavı sonucu girilmiş olmalıdır. (Mevcut: {trendData.length} deneme)
                </p>
              </div>
            ) : (
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '6px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} Net`, 'Toplam Net']}
                      labelFormatter={(label, payload) => {
                        const item = payload[0]?.payload;
                        return item ? `${item.title} (${label})` : label;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* SECTION 5: GÖREV / ÇALIŞMA DURUMU */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-mono">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                5. Görev / Çalışma Durumu
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Ödev Disiplini</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 block">Toplam Atanan</span>
                <span className="text-base font-bold text-zinc-200 mt-0.5 block">{taskStatus.total} Görev</span>
              </div>
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 block">Tamamlanan & Onaylanan</span>
                <span className="text-base font-bold text-emerald-400 mt-0.5 block">{taskStatus.completed} Görev</span>
              </div>
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 block">Onay Bekleyen</span>
                <span className="text-base font-bold text-amber-400 mt-0.5 block">{taskStatus.pendingReview} Görev</span>
              </div>
              <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded">
                <span className="text-[10px] text-zinc-500 block">Teslim Başarı Oranı</span>
                <span className="text-base font-bold text-sky-400 mt-0.5 block">%{taskStatus.rate}</span>
              </div>
            </div>
          </div>

          {/* SECTION 6: KOÇ İÇİN ÖNERİLER */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-mono">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                6. Koç İçin Veri Tabanlı Öneriler
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">Deterministik Gözlemler</span>
            </div>

            {recommendations.length === 0 ? (
              <p className="text-xs text-zinc-500 italic py-3 text-center">
                Yeterli veri bulunamadı. (Öneri üretmek için sisteme deneme ve görev verisi eklenmelidir)
              </p>
            ) : (
              <ul className="space-y-2">
                {recommendations.map((rec, rIdx) => (
                  <li key={rIdx} className="p-2.5 rounded bg-zinc-950/70 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">&bull;</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
