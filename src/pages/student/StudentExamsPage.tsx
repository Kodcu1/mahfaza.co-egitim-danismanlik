import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { examService } from '../../services/examService';
import { ExamResult, BranchResult } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Target, Award, TrendingUp, Plus, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

interface BranchFormState {
  name: string;
  maxQuestions: number;
  correct: number;
  wrong: number;
}

const DEFAULT_TYT_BRANCHES: BranchFormState[] = [
  { name: 'Türkçe', maxQuestions: 40, correct: 30, wrong: 6 },
  { name: 'Temel Matematik', maxQuestions: 40, correct: 25, wrong: 4 },
  { name: 'Fen Bilimleri', maxQuestions: 20, correct: 12, wrong: 3 },
  { name: 'Sosyal Bilimler', maxQuestions: 20, correct: 14, wrong: 3 },
];

const DEFAULT_AYT_BRANCHES: BranchFormState[] = [
  { name: 'Matematik', maxQuestions: 40, correct: 28, wrong: 4 },
  { name: 'Fizik / Kimya / Biyoloji', maxQuestions: 40, correct: 24, wrong: 6 },
  { name: 'Türk Dili ve Edebiyatı - Sosyal 1', maxQuestions: 40, correct: 30, wrong: 4 },
  { name: 'Sosyal Bilimler 2', maxQuestions: 40, correct: 28, wrong: 5 },
];

const DEFAULT_LGS_BRANCHES: BranchFormState[] = [
  { name: 'Türkçe', maxQuestions: 20, correct: 17, wrong: 2 },
  { name: 'Matematik', maxQuestions: 20, correct: 14, wrong: 3 },
  { name: 'Fen Bilimleri', maxQuestions: 20, correct: 16, wrong: 2 },
  { name: 'T.C. İnkılap Tarihi', maxQuestions: 10, correct: 9, wrong: 1 },
  { name: 'Din Kültürü ve Ahlak Bilgisi', maxQuestions: 10, correct: 10, wrong: 0 },
  { name: 'Yabancı Dil (İngilizce)', maxQuestions: 10, correct: 9, wrong: 1 },
];

export const StudentExamsPage: React.FC = () => {
  const { user } = useAuth();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  // New Exam Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [examType, setExamType] = useState<'TYT' | 'AYT' | 'LGS'>('TYT');
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [branches, setBranches] = useState<BranchFormState[]>(DEFAULT_TYT_BRANCHES);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Synchronize branches when exam type changes
  const handleTypeChange = (type: 'TYT' | 'AYT' | 'LGS') => {
    setExamType(type);
    if (type === 'TYT') setBranches(DEFAULT_TYT_BRANCHES);
    else if (type === 'AYT') setBranches(DEFAULT_AYT_BRANCHES);
    else setBranches(DEFAULT_LGS_BRANCHES);
  };

  const handleBranchChange = (index: number, field: 'correct' | 'wrong', value: number) => {
    setBranches((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      const val = Math.max(0, isNaN(value) ? 0 : value);
      if (field === 'correct') {
        target.correct = Math.min(target.maxQuestions, val);
        if (target.correct + target.wrong > target.maxQuestions) {
          target.wrong = target.maxQuestions - target.correct;
        }
      } else {
        target.wrong = Math.min(target.maxQuestions - target.correct, val);
      }
      copy[index] = target;
      return copy;
    });
  };

  // Instant calculation totals
  const summary = useMemo(() => {
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalNet = 0;

    branches.forEach((b) => {
      totalQuestions += b.maxQuestions;
      totalCorrect += b.correct;
      totalWrong += b.wrong;
      // Formula: Net = Doğru - (Yanlış / 4)
      const branchNet = b.correct - b.wrong / 4;
      totalNet += branchNet;
    });

    const totalEmpty = Math.max(0, totalQuestions - totalCorrect - totalWrong);

    return {
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalEmpty,
      totalNet: Number(totalNet.toFixed(2)),
    };
  }, [branches]);

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

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!examTitle.trim()) {
      setFormError('Lütfen deneme sınavı adını girin.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const branchPayload: BranchResult[] = branches.map((b) => ({
        name: b.name,
        correct: b.correct,
        wrong: b.wrong,
        empty: Math.max(0, b.maxQuestions - b.correct - b.wrong),
        net: Number((b.correct - b.wrong / 4).toFixed(2)),
      }));

      await examService.createStudentExamResult({
        student_id: user.id,
        exam_type: examType,
        exam_name: examTitle.trim(),
        exam_date: examDate,
        branches: branchPayload,
      });

      setFormSuccess('Deneme sonucu başarıyla kaydedildi!');
      await loadExams();
      setTimeout(() => {
        setModalOpen(false);
        setExamTitle('');
        setFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Deneme sınavı kaydedilirken bir hata oluştu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Sınav karnesi yükleniyor..." />;
  }

  const highestScore = examResults.length > 0 ? Math.max(...examResults.map((r) => r.score)) : 0;
  const avgNet = examResults.length > 0
    ? (examResults.reduce((acc, r) => acc + (Number(r.total_net) || 0), 0) / examResults.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Deneme Karnesi & Net Takibi</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Sınav Sonuçları & Net Analizi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            TYT, AYT ve LGS denemelerindeki doğrulanmış net ve puan dökümleriniz.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setModalOpen(true);
              setFormError(null);
              setFormSuccess(null);
            }}
          >
            Yeni Deneme Ekle
          </Button>

          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
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
      </div>

      {examResults.length === 0 ? (
        <EmptyState
          title="Henüz Kayıtlı Deneme Yok"
          description="'Yeni Deneme Ekle' butonunu kullanarak çözdüğünüz deneme sınavlarının doğru ve yanlış sayılarını girin. Netleriniz anında hesaplanacak ve koçunuzla paylaşılacaktır."
          icon={<Target className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="space-y-4">
          {examResults.map((result) => {
            const resultType = result.exam_type || result.exam?.exam_type || 'TYT';
            const resultTitle = result.exam_name || result.exam?.title || 'Deneme Sınavı';
            const resultDate = result.exam_date || result.exam?.exam_date || result.created_at;

            return (
              <Card key={result.id} className="hover:border-zinc-700 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-amber-400 font-bold">{resultType}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-400">
                        {resultDate ? new Date(resultDate).toLocaleDateString('tr-TR') : 'Tarih Belirtilmemiş'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-zinc-100 mt-1">{resultTitle}</h3>
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
                {result.branches && result.branches.length > 0 ? (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    {result.branches.map((b, bIdx) => (
                      <div key={bIdx} className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                        <span className="text-zinc-500 text-[10px] block truncate">{b.name}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-zinc-200">{b.net} Net</span>
                          <span className="text-[10px] text-zinc-500">({b.correct}D / {b.wrong}Y)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                      <span className="text-zinc-500 text-[10px] block">Türkçe Net</span>
                      <span className="font-bold text-zinc-200">{result.turkish_net || 0}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                      <span className="text-zinc-500 text-[10px] block">Matematik Net</span>
                      <span className="font-bold text-zinc-200">{result.math_net || 0}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                      <span className="text-zinc-500 text-[10px] block">Sosyal Net</span>
                      <span className="font-bold text-zinc-200">{result.social_net || 0}</span>
                    </div>
                    <div className="bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                      <span className="text-zinc-500 text-[10px] block">Fen Net</span>
                      <span className="font-bold text-zinc-200">{result.science_net || 0}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* YENİ DENEME EKLE MODALI */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title="Yeni Deneme Sınavı Sonucu Ekle"
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitExam} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Sınav Türü Seçimi */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Sınav Türü
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['TYT', 'AYT', 'LGS'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 text-xs font-bold font-mono rounded-md border transition-all ${
                      examType === t
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Deneme Adı ve Tarihi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Deneme Adı / Yayın"
                required
                placeholder="Örn: 2026 Türkiye Geneli TYT 1"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />

              <Input
                label="Sınav Tarihi"
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>

            {/* Canlı Net ve Doğru/Yanlış Özeti */}
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Toplam Soru / Boş</span>
                <span className="text-zinc-300 font-semibold">{summary.totalQuestions} Soru &bull; {summary.totalEmpty} Boş</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase">Doğru / Yanlış</span>
                <span className="text-emerald-400 font-bold">{summary.totalCorrect} D</span>
                <span className="text-zinc-500 mx-1">/</span>
                <span className="text-rose-400 font-bold">{summary.totalWrong} Y</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block uppercase">Hesaplanan Net</span>
                <span className="text-lg font-bold text-amber-400 tabular-nums">{summary.totalNet} Net</span>
              </div>
            </div>

            {/* Branş Bazlı Doğru - Yanlış Giriş Tablosu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium px-1">
                <span>Ders / Branş</span>
                <span className="text-zinc-500 font-mono">Net = Doğru - (Yanlış / 4)</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {branches.map((b, idx) => {
                  const empty = Math.max(0, b.maxQuestions - b.correct - b.wrong);
                  const branchNet = (b.correct - b.wrong / 4).toFixed(2);

                  return (
                    <div
                      key={idx}
                      className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="sm:w-1/3">
                        <span className="font-semibold text-zinc-200 block truncate">{b.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({b.maxQuestions} Soru)</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-mono text-zinc-400">D:</label>
                          <input
                            type="number"
                            min={0}
                            max={b.maxQuestions}
                            value={b.correct}
                            onChange={(e) => handleBranchChange(idx, 'correct', parseInt(e.target.value) || 0)}
                            className="w-14 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-mono text-center focus:outline-hidden focus:border-amber-500"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-mono text-zinc-400">Y:</label>
                          <input
                            type="number"
                            min={0}
                            max={b.maxQuestions - b.correct}
                            value={b.wrong}
                            onChange={(e) => handleBranchChange(idx, 'wrong', parseInt(e.target.value) || 0)}
                            className="w-14 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 font-mono text-center focus:outline-hidden focus:border-rose-500"
                          />
                        </div>

                        <div className="w-12 text-center text-[10px] font-mono text-zinc-500">
                          {empty} B
                        </div>

                        <div className="w-16 text-right font-mono font-bold text-amber-400">
                          {branchNet} N
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={submitting}
              >
                Deneme Sonucunu Kaydet
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
