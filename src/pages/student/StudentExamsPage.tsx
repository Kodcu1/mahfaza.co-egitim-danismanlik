import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { examService } from '../../services/examService';
import { subscriptionService } from '../../services/subscriptionService';
import { ExamResult, BranchResult, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Target,
  Award,
  TrendingUp,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  BarChart3,
  BookOpen,
  Crown,
  Lock,
} from 'lucide-react';

interface BranchFormState {
  name: string;
  category: string;
  maxQuestions: number;
  correct: number;
  wrong: number;
}

const DEFAULT_TYT_BRANCHES: BranchFormState[] = [
  // 1. Temel Alanlar
  { name: 'Türkçe', category: 'Temel Dersler', maxQuestions: 40, correct: 30, wrong: 6 },
  { name: 'Temel Matematik', category: 'Temel Dersler', maxQuestions: 40, correct: 25, wrong: 4 },
  // 2. Sosyal Bilimler (Ayrıştırılmış / Granular)
  { name: 'Tarih', category: 'Sosyal Bilimler (20 Soru)', maxQuestions: 5, correct: 4, wrong: 1 },
  { name: 'Coğrafya', category: 'Sosyal Bilimler (20 Soru)', maxQuestions: 5, correct: 3, wrong: 1 },
  { name: 'Felsefe', category: 'Sosyal Bilimler (20 Soru)', maxQuestions: 5, correct: 4, wrong: 0 },
  { name: 'Din Kültürü', category: 'Sosyal Bilimler (20 Soru)', maxQuestions: 5, correct: 4, wrong: 1 },
  // 3. Fen Bilimleri (Ayrıştırılmış / Granular)
  { name: 'Fizik', category: 'Fen Bilimleri (20 Soru)', maxQuestions: 7, correct: 4, wrong: 1 },
  { name: 'Kimya', category: 'Fen Bilimleri (20 Soru)', maxQuestions: 7, correct: 5, wrong: 1 },
  { name: 'Biyoloji', category: 'Fen Bilimleri (20 Soru)', maxQuestions: 6, correct: 4, wrong: 1 },
];

const DEFAULT_AYT_BRANCHES: BranchFormState[] = [
  // 1. Matematik
  { name: 'Matematik & Geometri', category: 'Matematik', maxQuestions: 40, correct: 28, wrong: 4 },
  // 2. Fen Bilimleri (Ayrıştırılmış)
  { name: 'Fizik', category: 'Fen Bilimleri', maxQuestions: 14, correct: 9, wrong: 2 },
  { name: 'Kimya', category: 'Fen Bilimleri', maxQuestions: 13, correct: 8, wrong: 2 },
  { name: 'Biyoloji', category: 'Fen Bilimleri', maxQuestions: 13, correct: 9, wrong: 2 },
  // 3. Edebiyat - Sosyal 1
  { name: 'Türk Dili ve Edebiyatı', category: 'Edebiyat & Sosyal Bilimler 1', maxQuestions: 24, correct: 18, wrong: 3 },
  { name: 'Tarih-1', category: 'Edebiyat & Sosyal Bilimler 1', maxQuestions: 10, correct: 7, wrong: 1 },
  { name: 'Coğrafya-1', category: 'Edebiyat & Sosyal Bilimler 1', maxQuestions: 6, correct: 5, wrong: 0 },
  // 4. Sosyal Bilimler 2
  { name: 'Tarih-2', category: 'Sosyal Bilimler 2', maxQuestions: 11, correct: 8, wrong: 2 },
  { name: 'Coğrafya-2', category: 'Sosyal Bilimler 2', maxQuestions: 11, correct: 7, wrong: 2 },
  { name: 'Felsefe Grubu', category: 'Sosyal Bilimler 2', maxQuestions: 12, correct: 9, wrong: 1 },
  { name: 'Din Kültürü', category: 'Sosyal Bilimler 2', maxQuestions: 6, correct: 5, wrong: 0 },
];

const DEFAULT_LGS_BRANCHES: BranchFormState[] = [
  { name: 'Türkçe', category: 'Sözel Bölüm', maxQuestions: 20, correct: 17, wrong: 2 },
  { name: 'T.C. İnkılap Tarihi', category: 'Sözel Bölüm', maxQuestions: 10, correct: 9, wrong: 1 },
  { name: 'Din Kültürü ve Ahlak Bilgisi', category: 'Sözel Bölüm', maxQuestions: 10, correct: 10, wrong: 0 },
  { name: 'Yabancı Dil (İngilizce)', category: 'Sözel Bölüm', maxQuestions: 10, correct: 9, wrong: 1 },
  { name: 'Matematik', category: 'Sayısal Bölüm', maxQuestions: 20, correct: 14, wrong: 3 },
  { name: 'Fen Bilimleri', category: 'Sayısal Bölüm', maxQuestions: 20, correct: 16, wrong: 2 },
];

export const StudentExamsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // New Exam Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [examType, setExamType] = useState<'TYT' | 'AYT' | 'LGS'>('TYT');
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [branches, setBranches] = useState<BranchFormState[]>(DEFAULT_TYT_BRANCHES);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
      const divisor = examType === 'LGS' ? 3 : 4;
      const branchNet = b.correct - b.wrong / divisor;
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
  }, [branches, examType]);

  const loadExams = useCallback(async () => {
    if (!user?.id && !profile?.id) return;
    try {
      setLoading(true);
      const studentPrimaryId = profile?.id || user?.id || '';
      const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

      const [data, sub] = await Promise.all([
        examService.getStudentExamResults(studentPrimaryId, studentSecondaryId),
        subscriptionService.getUserSubscription(studentPrimaryId).catch(() => null),
      ]);
      setExamResults(data);
      setSubscription(sub);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, profile?.id]);

  useEffect(() => {
    loadExams();
    const handleSync = () => {
      loadExams();
    };
    window.addEventListener('mahfaza:exam-updated', handleSync);
    return () => {
      window.removeEventListener('mahfaza:exam-updated', handleSync);
    };
  }, [loadExams]);

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim()) {
      setFormError('Lütfen deneme sınavı adını girin.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const studentUid = profile?.id || user?.id;
    const secondaryUid = user?.id !== profile?.id ? user?.id : undefined;
    if (!studentUid) {
      setFormError('Oturum bilgisi doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.');
      setSubmitting(false);
      return;
    }

    try {
      const divisor = examType === 'LGS' ? 3 : 4;
      const branchPayload: BranchResult[] = branches.map((b) => ({
        name: b.name,
        correct: b.correct,
        wrong: b.wrong,
        empty: Math.max(0, b.maxQuestions - b.correct - b.wrong),
        net: Number(Math.max(0, b.correct - b.wrong / divisor).toFixed(2)),
      }));

      await examService.createStudentExamResult({
        student_id: studentUid,
        secondary_student_id: secondaryUid,
        exam_type: examType,
        exam_name: examTitle.trim(),
        exam_date: examDate,
        branches: branchPayload,
      });

      setToastMessage({
        type: 'success',
        text: 'Deneme sınavı başarıyla kaydedildi!',
      });

      setModalOpen(false);
      setExamTitle('');
      await loadExams();
    } catch (err: any) {
      const errorMsg = err.message || 'Deneme sınavı kaydedilirken bir hata oluştu.';
      setFormError(errorMsg);
      setToastMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Sınav karnesi yükleniyor..." />;
  }

  const highestScore = examResults.length > 0 ? Math.max(...examResults.map((r) => r.score)) : 0;
  const avgNet =
    examResults.length > 0
      ? (
          examResults.reduce((acc, r) => acc + (Number(r.total_net) || 0), 0) /
          examResults.length
        ).toFixed(1)
      : '0';

  const currentPlanId = subscription?.plan_id || 'free';
  const isFreePlan = currentPlanId === 'free';
  const isFreeLimitReached = isFreePlan && examResults.length >= 1;

  return (
    <div className="space-y-6">
      {/* Toast Notification Container */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Deneme Karnesi & Net Takibi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Sınav Sonuçları & Net Analizi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            TYT, AYT ve LGS denemelerindeki doğrulanmış net ve puan dökümleriniz.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFreeLimitReached ? (
            <Link to="/pricing">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Lock className="w-4 h-4" />}
              >
                Sınırsız Deneme İçin Paketi Yükselt
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setModalOpen(true);
                setFormError(null);
              }}
            >
              Yeni Deneme Ekle
            </Button>
          )}

          <div className="hidden sm:flex items-center gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Ortalama Net</span>
                <span className="text-slate-900 font-bold">{avgNet} Net</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-xs">
              <Award className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Zirve Puan</span>
                <span className="text-emerald-700 font-bold">{highestScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Gating Notice for Free Users */}
      {isFreePlan && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Crown className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-900">
                Başlangıç (Ücretsiz) Paketi — Deneme Sınırı (1 Deneme Kaydı)
              </div>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Sınırsız TYT/AYT/LGS deneme sınavı eklemek, ders bazlı net gelişim grafiklerini açmak ve koçunuzla 360° karne paylaşmak için <strong>Standart Akademik</strong>, <strong>Pro Akademi</strong> veya <strong>Premium VIP</strong> paketine geçiş yapabilirsiniz.
              </p>
            </div>
          </div>
          <Link to="/pricing" className="shrink-0">
            <Button variant="primary" size="sm" leftIcon={<Crown className="w-3.5 h-3.5" />}>
              Paketleri Gör
            </Button>
          </Link>
        </div>
      )}

      {examResults.length === 0 ? (
        <EmptyState
          title="Henüz Kayıtlı Deneme Yok"
          description="'Yeni Deneme Ekle' butonunu kullanarak çözdüğünüz deneme sınavlarının doğru ve yanlış sayılarını girin. Netleriniz anında hesaplanacak ve koçunuzla paylaşılacaktır."
          icon={<Target className="w-9 h-9 text-slate-400" />}
          actionText="İlk Denemeni Ekle"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {examResults.map((result) => {
            const resultType = result.exam_type || result.exam?.exam_type || 'TYT';
            const resultTitle = result.exam_name || result.exam?.title || 'Deneme Sınavı';
            const resultDate = result.exam_date || result.exam?.exam_date || result.created_at;

            return (
              <Card key={result.id} className="hover:border-amber-300 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg text-xs font-mono">
                        {resultType}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {resultDate ? new Date(resultDate).toLocaleDateString('tr-TR') : 'Tarih Belirtilmemiş'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1.5">{resultTitle}</h3>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Toplam Net
                      </span>
                      <span className="text-2xl font-black font-mono text-amber-600 tabular-nums">
                        {result.total_net}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 pl-6">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Puan
                      </span>
                      <span className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                        {result.score}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-test net breakdown with granular subject details */}
                {result.branches && result.branches.length > 0 ? (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {/* Granular Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
                      {result.branches.map((b, bIdx) => {
                        const netVal = Number(b.net) || 0;
                        const isStrength = netVal >= (b.maxQuestions ? b.maxQuestions * 0.75 : 10);
                        const isWeakness = netVal <= (b.maxQuestions ? b.maxQuestions * 0.35 : 3);

                        return (
                          <div
                            key={bIdx}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isWeakness
                                ? 'bg-rose-50/50 border-rose-200'
                                : isStrength
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : 'bg-slate-50 border-slate-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-700 text-[11px] font-sans font-bold truncate">
                                {b.name}
                              </span>
                              {isWeakness && (
                                <span className="text-[9px] font-sans font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded shrink-0">
                                  Eksik
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span
                                className={`font-black text-sm ${
                                  isWeakness
                                    ? 'text-rose-700'
                                    : isStrength
                                    ? 'text-emerald-700'
                                    : 'text-slate-900'
                                }`}
                              >
                                {b.net} Net
                              </span>
                              <span className="text-[10px] text-slate-500 font-sans font-medium">
                                {b.correct}D / {b.wrong}Y
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Group Summaries for Coaches and Students */}
                    {(result.social_net !== undefined || result.science_net !== undefined) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                        <span className="text-slate-400 font-sans text-[10px] uppercase font-semibold">Grup Özeti:</span>
                        {result.turkish_net !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                            Türkçe: <strong>{result.turkish_net}N</strong>
                          </span>
                        )}
                        {result.math_net !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                            Matematik: <strong>{result.math_net}N</strong>
                          </span>
                        )}
                        {result.social_net !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 border border-orange-200 font-semibold">
                            Sosyal Toplam (Tarih/Coğ/Fel/Din): <strong>{result.social_net}N</strong>
                          </span>
                        )}
                        {result.science_net !== undefined && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            Fen Toplam (Fiz/Kim/Biyo): <strong>{result.science_net}N</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px] font-sans block">Türkçe Net</span>
                      <span className="font-bold text-slate-900">{result.turkish_net || 0} Net</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px] font-sans block">Matematik Net</span>
                      <span className="font-bold text-slate-900">{result.math_net || 0} Net</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px] font-sans block">Sosyal Net</span>
                      <span className="font-bold text-slate-900">{result.social_net || 0} Net</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-slate-500 text-[11px] font-sans block">Fen Net</span>
                      <span className="font-bold text-slate-900">{result.science_net || 0} Net</span>
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
          subtitle="Doğru ve yanlışlarınızı girin; netler ve akademik puanınız anında hesaplansın."
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitExam} className="space-y-5">
            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Sınav Türü Seçimi */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sınav Türü
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['TYT', 'AYT', 'LGS'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`py-2 text-xs font-bold font-mono rounded-xl border transition-all ${
                      examType === t
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Deneme Adı ve Tarihi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 font-sans block uppercase font-semibold">
                  Toplam Soru / Boş
                </span>
                <span className="text-slate-800 font-bold text-sm">
                  {summary.totalQuestions} Soru &bull; {summary.totalEmpty} Boş
                </span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 font-sans block uppercase font-semibold">
                  Doğru / Yanlış
                </span>
                <span className="text-emerald-700 font-bold text-sm">{summary.totalCorrect} D</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-rose-600 font-bold text-sm">{summary.totalWrong} Y</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-amber-800 font-sans block uppercase font-bold">
                  Hesaplanan Net
                </span>
                <span className="text-xl font-black text-amber-700 tabular-nums">
                  {summary.totalNet} Net
                </span>
              </div>
            </div>

            {/* Branş Bazlı Doğru - Yanlış Giriş Tablosu */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                <span>Ders / Branş Dağılımı</span>
                <span className="text-slate-400 font-mono">
                  {examType === 'LGS' ? 'Net = D - (Y / 3)' : 'Net = D - (Y / 4)'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1.5 divide-y divide-slate-100">
                {branches.map((b, idx) => {
                  const showHeader = idx === 0 || branches[idx - 1].category !== b.category;
                  const divisor = examType === 'LGS' ? 3 : 4;
                  const empty = Math.max(0, b.maxQuestions - b.correct - b.wrong);
                  const branchNet = (b.correct - b.wrong / divisor).toFixed(2);

                  return (
                    <div key={idx} className="space-y-2 pt-2 first:pt-0">
                      {showHeader && (
                        <div className="flex items-center gap-2 pt-1 pb-1">
                          <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            {b.category}
                          </span>
                          <div className="flex-1 border-t border-slate-200/80" />
                        </div>
                      )}
                      <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-slate-300 transition-colors">
                        <div className="sm:w-1/3">
                          <span className="font-semibold text-slate-800 block truncate">{b.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({b.maxQuestions} Soru)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-mono text-slate-500 font-bold">D:</label>
                            <input
                              type="number"
                              min={0}
                              max={b.maxQuestions}
                              value={b.correct}
                              onChange={(e) => handleBranchChange(idx, 'correct', parseInt(e.target.value) || 0)}
                              className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono text-center focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 font-bold"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-mono text-slate-500 font-bold">Y:</label>
                            <input
                              type="number"
                              min={0}
                              max={b.maxQuestions - b.correct}
                              value={b.wrong}
                              onChange={(e) => handleBranchChange(idx, 'wrong', parseInt(e.target.value) || 0)}
                              className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono text-center focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 font-bold text-rose-700"
                            />
                          </div>

                          <div className="w-12 text-center text-[10px] font-mono text-slate-400">
                            {empty} Boş
                          </div>

                          <div className="w-16 text-right font-mono font-bold text-amber-700">
                            {branchNet} N
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="md"
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
