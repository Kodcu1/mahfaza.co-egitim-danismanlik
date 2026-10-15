import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { coachTaskService } from '../../services/coachTaskService';
import { Profile, StudentXPData, ExamResult, CoachTask } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Sparkles,
  Printer,
  Users,
  Flame,
  BarChart2,
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

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const handlePrintPDF = async () => {
    try {
      setPdfDownloading(true);
      const { jsPDF } = await import('jspdf');
      const { sanitizeText, triggerReliablePdfDownload } = await import('../../utils/student360PdfGenerator');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const reportDate = new Date().toLocaleDateString('tr-TR');
      const coachName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Koc';

      doc.setFillColor(24, 24, 27);
      doc.rect(0, 0, 210, 34, 'F');
      doc.setFillColor(217, 119, 6);
      doc.rect(0, 34, 210, 1.5, 'F');

      doc.setTextColor(251, 191, 36);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('MAHFAZA.CO', 14, 13);

      doc.setTextColor(244, 244, 245);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'normal');
      doc.text('PORTFOY AKADEMIK ANALIZ VE PERFORMANS RAPORU', 14, 21);

      doc.setFontSize(8);
      doc.setTextColor(161, 161, 170);
      doc.text(`Rapor Tarihi: ${reportDate}  |  Koc: ${sanitizeText(coachName)}  |  Toplam Danisan: ${assignedStudents.length}`, 14, 28);

      let y = 44;
      doc.setTextColor(24, 24, 27);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('1. DANISAN PERFORMANS DAGILIM TABLOSU', 14, y);
      y += 2;
      doc.setDrawColor(212, 212, 216);
      doc.line(14, y, 196, y);
      y += 6;

      doc.setFontSize(8);
      doc.setFillColor(244, 244, 245);
      doc.rect(14, y - 4, 182, 6, 'F');
      doc.text('Danisan Ad Soyad', 16, y);
      doc.text('Streak', 85, y);
      doc.text('Toplam XP', 112, y);
      doc.text('Son Deneme Neti', 142, y);
      doc.text('Gorev Durumu', 173, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      assignedStudents.forEach((st) => {
        const xp = studentXPMap[st.id];
        const exams = studentExamsMap[st.id] || [];
        const latest = exams[0];
        const studentTasks = tasks.filter((t) => t.student_id === st.id);
        const completedStTasks = studentTasks.filter((t) => t.status === 'verified' || t.status === 'completed').length;

        doc.text(sanitizeText(`${st.first_name || ''} ${st.last_name || ''}`.trim() || st.email).slice(0, 34), 16, y);
        doc.text(`${xp?.current_streak_days ?? 0} Gun`, 85, y);
        doc.text(`${xp?.lifetime_xp ?? 0} XP`, 112, y);
        doc.text(latest?.total_net != null ? `${latest.total_net} Net` : 'Veri yok', 142, y);
        doc.text(studentTasks.length > 0 ? `${completedStTasks}/${studentTasks.length}` : 'Gorev yok', 173, y);
        y += 6;
      });

      y = Math.max(y + 16, 245);
      doc.setDrawColor(212, 212, 216);
      doc.line(14, y, 196, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text('Koc Imzasi: ___________________________', 24, y);
      doc.text('Mudur Imzasi: ___________________________', 118, y);

      triggerReliablePdfDownload(doc, `Mahfaza_Portfoy_Raporu_${reportDate.replace(/\./g, '-')}.pdf`);
    } catch (err) {
      console.error('Portfolio PDF generation failed:', err);
      window.print();
    } finally {
      setTimeout(() => setPdfDownloading(false), 600);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Portföy Analitiği & Raporlama
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight mt-0.5">
            Veri Tabanlı Akademik Analiz & Raporlama
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Atanmış danışanlarınızın gerçek veritabanı net trendleri, çalışma süreleri ve görev tamamlama başarı grafiği.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Printer className="w-3.5 h-3.5" />}
            isLoading={pdfDownloading}
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
          icon={<Users className="w-8 h-8 text-gray-500" />}
        />
      ) : (
        <>
          {/* Portfolio Metric Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Portföy Büyüklüğü</span>
              <div className="text-2xl font-bold font-mono text-gray-800 mt-0.5">
                {assignedStudents.length} Danışan
              </div>
              <span className="text-[10px] text-gray-600 mt-1 block">Aktif takip edilen öğrenci</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Toplam Portföy XP</span>
              <div className="text-2xl font-bold font-mono text-amber-600 mt-0.5">
                {totalLifetimeXP.toLocaleString('tr-TR')}
              </div>
              <span className="text-[10px] text-gray-600 mt-1 block">Kümülatif akademik puan</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Ortalama Deneme Neti</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
                {avgTotalNet !== null ? `${avgTotalNet} Net` : 'Veri bulunmuyor'}
              </div>
              <span className="text-[10px] text-gray-600 mt-1 block truncate">
                {allExams.length} kayıtlı deneme sınavı
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
              <span className="text-[10px] text-gray-600 font-mono uppercase block font-semibold">Görev Başarı Oranı</span>
              <div className="text-2xl font-bold font-mono text-sky-600 mt-0.5">
                {portfolioTaskRate !== null ? `%${portfolioTaskRate}` : 'Veri bulunmuyor'}
              </div>
              <span className="text-[10px] text-gray-600 mt-1 block">
                {verifiedTasks} / {tasks.length} tamamlanan görev
              </span>
            </div>
          </div>

          {/* AI Model Status Card (Truthful State: Not Fabricated) */}
          <div className="p-4 rounded-2xl bg-white border border-gray-200 flex items-start gap-3 shadow-2xs">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-gray-800 flex items-center gap-2">
                <span>Yapay Zeka Destekli Derin Analiz Modülü</span>
                <Badge variant="warning">Gerçek Veri Tabanlı</Badge>
              </div>
              <p className="text-gray-600 mt-1 leading-relaxed">
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
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xs font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-600" />
                Danışan Performans Dağılım Tablosu
              </h2>
              <span className="text-[10px] text-gray-600 font-mono font-semibold">
                Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-800">
                <thead className="bg-slate-50 text-gray-600 font-mono text-[10px] border-b border-gray-200 uppercase">
                  <tr>
                    <th className="py-3 px-4">Danışan</th>
                    <th className="py-3 px-4">Streak</th>
                    <th className="py-3 px-4">Toplam XP</th>
                    <th className="py-3 px-4">Cüzdan XP</th>
                    <th className="py-3 px-4">Son Deneme Neti</th>
                    <th className="py-3 px-4">Görev Durumu</th>
                    <th className="py-3 px-4 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {assignedStudents.map((st) => {
                    const xp = studentXPMap[st.id];
                    const exams = studentExamsMap[st.id] || [];
                    const latest = exams[0];
                    const studentTasks = tasks.filter((t) => t.student_id === st.id);
                    const completedStTasks = studentTasks.filter((t) => t.status === 'verified').length;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-800">
                          {st.first_name} {st.last_name}
                          <div className="text-[11px] text-gray-600 font-mono font-normal">
                            {st.email}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-600 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            {xp?.current_streak_days !== undefined ? `${xp.current_streak_days} Gün` : '—'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-800 font-semibold">
                          {xp?.lifetime_xp !== undefined ? xp.lifetime_xp.toLocaleString('tr-TR') : '0'}
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-600">
                          {xp?.wallet_xp !== undefined ? xp.wallet_xp.toLocaleString('tr-TR') : '0'}
                        </td>

                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                          {latest?.total_net !== undefined ? `${latest.total_net} Net` : 'Veri yok'}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                          {studentTasks.length > 0
                            ? `${completedStTasks} / ${studentTasks.length} Görev`
                            : 'Görev yok'}
                        </td>

                        <td className="py-3 px-4 text-right">
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
