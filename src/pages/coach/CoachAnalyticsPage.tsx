import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { coachTaskService } from '../../services/coachTaskService';
import { Profile, StudentXPData, ExamResult, CoachTask } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Sparkles,
  Printer,
  Users,
  Target,
  Flame,
  Award,
  TrendingUp,
  AlertCircle,
  FileText,
  BarChart2,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoachAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignedStudents, setAssignedStudents] = useState<Profile[]>([]);
  const [studentXPMap, setStudentXPMap] = useState<Record<string, StudentXPData | null>>({});
  const [studentExamsMap, setStudentExamsMap] = useState<Record<string, ExamResult[]>>({});
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [studs, tList] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        coachTaskService.getTasksForCoach(user.id),
      ]);
      setAssignedStudents(studs);
      setTasks(tList);

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
    } catch (err) {
      console.error('Error loading coach analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return <LoadingState message="Akademik portföy analitiği hesaplanıyor..." />;
  }

  // Real aggregate calculations
  const totalLifetimeXP = Object.values(studentXPMap).reduce(
    (sum, xp) => sum + (xp?.lifetime_xp || 0),
    0
  );

  const allExams = Object.values(studentExamsMap).flat();
  const avgTotalNet =
    allExams.length > 0
      ? (allExams.reduce((sum, ex) => sum + (ex.total_net || 0), 0) / allExams.length).toFixed(1)
      : null;

  const verifiedTasks = tasks.filter((t) => t.status === 'verified').length;
  const portfolioTaskRate =
    tasks.length > 0 ? Math.round((verifiedTasks / tasks.length) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Portföy Analitiği & Raporlama
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            AI Analiz & Raporlama
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Atanmış danışanlarınızın gerçek veritabanı net trendleri, çalışma süreleri ve görev tamamlama başarı grafiği.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            onClick={handlePrintPDF}
          >
            PDF Rapor İndir
          </Button>
        </div>
      </div>

      {assignedStudents.length === 0 ? (
        <EmptyState
          title="Analiz Edilecek Öğrenci Yok"
          description="Rapor oluşturmak için öncelikle portföyünüze öğrenci ekleyin."
          icon={<Users className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <>
          {/* Portfolio Metric Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase block">Portföy Büyüklüğü</span>
              <div className="text-2xl font-bold font-mono text-zinc-100 mt-0.5">
                {assignedStudents.length} Danışan
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Aktif takip edilen öğrenci</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase block">Toplam Portföy XP</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                {totalLifetimeXP.toLocaleString('tr-TR')}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Kümülatif akademik puan</span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase block">Ortalama Deneme Neti</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                {avgTotalNet !== null ? `${avgTotalNet} Net` : 'Veri bulunmuyor'}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block truncate">
                {allExams.length} kayıtlı deneme sınavı
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5">
              <span className="text-[10px] text-zinc-500 font-mono uppercase block">Görev Başarı Oranı</span>
              <div className="text-2xl font-bold font-mono text-sky-400 mt-0.5">
                {portfolioTaskRate !== null ? `%${portfolioTaskRate}` : 'Veri bulunmuyor'}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">
                {verifiedTasks} / {tasks.length} tamamlanan görev
              </span>
            </div>
          </div>

          {/* AI Model Status Card (Truthful State: Not Fabricated) */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-zinc-200 flex items-center gap-2">
                <span>Yapay Zeka Destekli Derin Analiz Modülü</span>
                <Badge variant="warning">Gerçek Veri Tabanlı</Badge>
              </div>
              <p className="text-zinc-400 mt-1 leading-relaxed">
                Yapay zeka analizleri yalnızca portföyünüzdeki danışanların gerçek sınav karneleri, ödev teslimleri ve streak verileri üzerinden oluşturulmaktadır. Hayali istatistik veya kurgusal veri üretilmemektedir.
              </p>
              <div className="mt-2.5">
                <Link to="/coach/ai-copilot">
                  <Button variant="secondary" size="sm" className="text-xs">
                    AI Koçluk Asistanını Başlat &rarr;
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Detailed Student Performance Breakdown */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                Danışan Performans Dağılım Tablosu
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] border-b border-zinc-800 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Danışan</th>
                    <th className="py-2.5 px-3">Streak</th>
                    <th className="py-2.5 px-3">Toplam XP</th>
                    <th className="py-2.5 px-3">Cüzdan XP</th>
                    <th className="py-2.5 px-3">Son Deneme Neti</th>
                    <th className="py-2.5 px-3">Görev Durumu</th>
                    <th className="py-2.5 px-3 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {assignedStudents.map((st) => {
                    const xp = studentXPMap[st.id];
                    const exams = studentExamsMap[st.id] || [];
                    const latest = exams[0];
                    const studentTasks = tasks.filter((t) => t.student_id === st.id);
                    const completedStTasks = studentTasks.filter((t) => t.status === 'verified').length;

                    return (
                      <tr key={st.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-zinc-100">
                          {st.first_name} {st.last_name}
                          <div className="text-[11px] text-zinc-500 font-mono font-normal">
                            {st.email}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            {xp?.current_streak_days !== undefined ? `${xp.current_streak_days} Gün` : '—'}
                          </span>
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-200">
                          {xp?.lifetime_xp !== undefined ? xp.lifetime_xp.toLocaleString('tr-TR') : '0'}
                        </td>

                        <td className="py-3 px-3 font-mono text-zinc-400">
                          {xp?.wallet_xp !== undefined ? xp.wallet_xp.toLocaleString('tr-TR') : '0'}
                        </td>

                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                          {latest?.total_net !== undefined ? `${latest.total_net} Net` : 'Veri yok'}
                        </td>

                        <td className="py-3 px-3 font-mono text-[11px] text-zinc-400">
                          {studentTasks.length > 0
                            ? `${completedStTasks} / ${studentTasks.length} Görev`
                            : 'Görev yok'}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <Link to={`/coach/students/${st.id}`}>
                            <Button variant="secondary" size="sm" className="text-xs">
                              360° Rapor
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
