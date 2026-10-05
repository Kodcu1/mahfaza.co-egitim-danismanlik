import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { examService } from '../../services/examService';
import { ExamResult } from '../../types';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Target, Award, TrendingUp } from 'lucide-react';

export const StudentExamsPage: React.FC = () => {
  const { user } = useAuth();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExams = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await examService.getStudentExamResults(user.id);
      setExamResults(data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  if (loading) {
    return <LoadingState message="Sınav karnesi yükleniyor..." />;
  }

  // Calculate highest score and average net
  const highestScore = examResults.length > 0 ? Math.max(...examResults.map((r) => r.score)) : 0;
  const avgNet = examResults.length > 0
    ? (examResults.reduce((acc, r) => acc + (Number(r.total_net) || 0), 0) / examResults.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Deneme Karnesi</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Sınav Sonuçları & Net Analizi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            TYT, AYT ve LGS denemelerindeki doğrulanmış net ve puan dökümleriniz.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-zinc-500 block text-[10px]">Ortalama Net</span>
              <span className="text-zinc-100 font-bold">{avgNet} Net</span>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-zinc-500 block text-[10px]">Zirve Puan</span>
              <span className="text-emerald-400 font-bold">{highestScore}</span>
            </div>
          </div>
        </div>
      </div>

      {examResults.length === 0 ? (
        <EmptyState
          title="Henüz Kayıtlı Deneme Yok"
          description="Öğretmeniniz veya koçunuz tarafından sisteme girilen deneme sonuçları burada listelenecektir."
          icon={<Target className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="space-y-4">
          {examResults.map((result) => (
            <Card key={result.id} className="hover:border-zinc-700 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-amber-400 font-bold">{result.exam?.exam_type || 'TYT'}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="text-zinc-400">{result.exam?.exam_date ? new Date(result.exam.exam_date).toLocaleDateString('tr-TR') : 'Tarih Belirtilmemiş'}</span>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100 mt-1">{result.exam?.title || 'Deneme Sınavı'}</h3>
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Toplam Net</span>
                    <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                      {result.total_net}
                    </span>
                  </div>
                  <div className="border-l border-zinc-800 pl-6">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Puan</span>
                    <span className="text-xl font-bold font-mono text-zinc-100 tabular-nums">
                      {result.score}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-test net breakdown */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 text-[10px] block">Türkçe Net</span>
                  <span className="font-bold text-zinc-200">{result.turkish_net}</span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 text-[10px] block">Matematik Net</span>
                  <span className="font-bold text-zinc-200">{result.math_net}</span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 text-[10px] block">Sosyal Net</span>
                  <span className="font-bold text-zinc-200">{result.social_net}</span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 text-[10px] block">Fen Net</span>
                  <span className="font-bold text-zinc-200">{result.science_net}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
