import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { academicService } from '../../services/academicService';
import { relationshipService } from '../../services/relationshipService';
import { studyProofService } from '../../services/studyProofService';
import { StudyProof } from '../../types';
import {
  LGS_SUBJECTS,
  YKS_SUBJECTS,
  ALL_CURRICULUM_SUBJECTS,
  getSubjectsForProgram,
  CurriculumSubject,
} from '../../constants/curriculum';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  ShieldCheck,
  Flame,
  Award,
  Plus,
  Coffee,
  Heart,
  Eye,
  BookOpen,
  FileText,
  ArrowRight,
} from 'lucide-react';

const FOCUS_QUOTES = [
  'Derinleş, zihnini sakinleştir, hedefine odaklan.',
  'Küçük adımların sürekliliği, büyük zaferleri doğurur.',
  'Şimdi harcadığın odak, yarınki özgürlüğünün temelidir.',
  'Zihnin bir nehir gibi sakin ve güçlü olsun.',
  'Her tamamlanan seans, hedefine atılmış sarsılmaz bir adımdır.',
];

const BREAK_QUOTES = [
  'Derin bir nefes al, zihnini dinlendir ve yenilen.',
  'Bir bardak su iç, gözlerini ekrandan uzaklaştır.',
  'Dinlenmek tembellik değil, bir sonraki seans için yakıttır.',
  'Omuzlarını gevşet, temiz hava al.',
];

const POMODORO_SEQUENCE_BUTTONS: Array<{ mins: number; mode: 'focus' | 'break'; label: string }> = [
  { mins: 25, mode: 'focus', label: '25 dk Odak' },
  { mins: 5, mode: 'break', label: '5 dk Mola' },
  { mins: 50, mode: 'focus', label: '50 dk Odak' },
  { mins: 10, mode: 'break', label: '10 dk Mola' },
];

export const StudentSessionsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [coachId, setCoachId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Curriculum & Subject Resolution
  const programSubjects = useMemo(() => {
    return getSubjectsForProgram(profile?.target_program);
  }, [profile?.target_program]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    return programSubjects.subjects[0]?.id || 'yks_mat_temel';
  });

  // Mode: Focus vs Break
  const [mode, setMode] = useState<'focus' | 'break'>('focus');

  // Focus Timer States
  const [initialDuration, setInitialDuration] = useState(25 * 60); // seconds
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Study Proof Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [proofSubjectId, setProofSubjectId] = useState<string>(() => {
    return programSubjects.subjects[0]?.id || 'yks_mat_temel';
  });
  const [proofDuration, setProofDuration] = useState(25);
  const [proofQuestions, setProofQuestions] = useState<number>(0);
  const [proofNote, setProofNote] = useState('');
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Proof History State
  const [myProofs, setMyProofs] = useState<StudyProof[]>([]);
  const [selectedProofPreview, setSelectedProofPreview] = useState<StudyProof | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        setLoading(true);
        const [myCoach, proofs] = await Promise.all([
          user?.id ? relationshipService.getStudentAssignedCoach(user.id).catch(() => null) : Promise.resolve(null),
          user?.id ? studyProofService.getStudentStudyProofs(user.id).catch(() => []) : Promise.resolve([]),
        ]);

        if (isMounted) {
          if (myCoach) {
            setCoachId(myCoach.id);
          }
          setMyProofs(proofs || []);
        }
      } catch (err) {
        console.error('Initial load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Rotate quotes every 35 seconds
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      const quotesList = mode === 'focus' ? FOCUS_QUOTES : BREAK_QUOTES;
      setQuoteIndex((prev) => (prev + 1) % quotesList.length);
    }, 35000);
    return () => clearInterval(quoteInterval);
  }, [mode]);

  // Timer Tick Hook
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);

            if (mode === 'focus') {
              // Auto guide student to Submit Proof
              const completedMins = Math.round(initialDuration / 60);
              setProofDuration(completedMins);
              setProofSubjectId(selectedSubjectId);
              setProofModalOpen(true);
              setToastMessage({
                type: 'success',
                text: 'Harika bir odak seansı tamamladın! Şimdi koçuna çalışma kanıtını yükle.',
              });
            } else {
              setToastMessage({
                type: 'success',
                text: 'Mola bitti! Zihnin dinlendi, yeni bir odak seansına hazırsın.',
              });
              // Switch back to focus mode
              setMode('focus');
              setInitialDuration(25 * 60);
              return 25 * 60;
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode, initialDuration, selectedSubjectId]);

  const handleSelectPresetAndMode = (mins: number, targetMode: 'focus' | 'break') => {
    setIsActive(false);
    setMode(targetMode);
    const secs = mins * 60;
    setInitialDuration(secs);
    setSecondsLeft(secs);
  };

  const toggleTimer = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(initialDuration);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialDuration);
  };

  // Open manual proof dialog
  const handleOpenManualProof = () => {
    setProofDuration(30);
    setProofQuestions(0);
    setProofNote('');
    setProofImageFile(null);
    setProofImagePreview(null);
    setProofError(null);
    setProofSubjectId(selectedSubjectId || programSubjects.subjects[0]?.id || 'yks_mat_temel');
    setProofModalOpen(true);
  };

  // Calculate potential XP preview
  const potentialXP = useMemo(() => {
    const durationXP = Math.floor(proofDuration / 15) * 10;
    const questionsXP = Math.floor(proofQuestions / 10) * 5;
    return Math.min(150, Math.max(15, durationXP + questionsXP));
  }, [proofDuration, proofQuestions]);

  // Handle Photo Proof File selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProofError('Lütfen geçerli bir resim dosyası seçin (JPG, PNG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setProofError('Görsel boyutu en fazla 8MB olabilir.');
      return;
    }

    setProofImageFile(file);
    setProofError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setProofImageFile(null);
    setProofImagePreview(null);
  };

  // Resolve subject name from curriculum
  const resolveSubjectName = (subId: string): string => {
    const match = ALL_CURRICULUM_SUBJECTS.find((s) => s.id === subId);
    return match ? match.name : 'Genel Çalışma';
  };

  // Submit Study Proof
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!proofSubjectId) {
      setProofError('Lütfen çalıştığınız branş veya dersi seçin.');
      return;
    }

    if (!proofImagePreview) {
      setProofError('Koç doğrulaması için çalışma fotoğrafı (soru föyü/defter) zorunludur.');
      return;
    }

    setSubmittingProof(true);
    setProofError(null);

    try {
      const subjectName = resolveSubjectName(proofSubjectId);

      let finalPhotoUrl = proofImagePreview;
      if (proofImageFile) {
        finalPhotoUrl = await studyProofService.uploadProofPhoto(user.id, proofImageFile);
      }

      const created = await studyProofService.submitStudyProof({
        student_id: user.id,
        coach_id: coachId,
        subject_id: proofSubjectId,
        subject_name: subjectName,
        duration_minutes: Number(proofDuration) || 0,
        question_count: Number(proofQuestions) || 0,
        study_note: proofNote.trim() || undefined,
        proof_photo_url: finalPhotoUrl,
        calculated_xp: potentialXP,
      });

      setMyProofs((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setProofModalOpen(false);
      setProofNote('');
      setProofQuestions(0);
      setProofImageFile(null);
      setProofImagePreview(null);

      setToastMessage({
        type: 'success',
        text: 'Çalışma kanıtı koçuna iletildi! Koçun onayladığında XP cüzdanına yansıyacaktır.',
      });
    } catch (err: any) {
      setProofError(err.message || 'Kanıt gönderilirken bir hata oluştu.');
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loading) {
    return <LoadingState message="Odaklanma odası hazırlanıyor..." />;
  }

  // Format digital countdown
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

  // Circular SVG progress calculation
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progressFraction = initialDuration > 0 ? (initialDuration - secondsLeft) / initialDuration : 0;
  const strokeDashoffset = circumference - progressFraction * circumference;

  const currentQuotes = mode === 'focus' ? FOCUS_QUOTES : BREAK_QUOTES;
  const currentSubjectObj = ALL_CURRICULUM_SUBJECTS.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Toast Alert */}
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

      {/* Header & Mindful Quote Banner */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Derin Odaklanma & Zihin Odası</span>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {mode === 'focus' ? 'Zihnini Topla. Hedefine Odaklan.' : 'Derin Bir Nefes Al. Dinlen.'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 italic max-w-lg mx-auto transition-opacity duration-500">
          "{currentQuotes[quoteIndex]}"
        </p>
      </div>

      {/* Quick Manual Add */}
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4 text-amber-600" />}
          onClick={handleOpenManualProof}
          className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 font-semibold"
        >
          + Serbest Çalışma Kaydı Ekle
        </Button>
      </div>

      {/* Direct Study Logs Link Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-slate-600">
            Sayaç başlatmadan soru föyü veya etüt belgesi yüklemek mi istiyorsun?{' '}
            <strong className="text-slate-900">Çalışmanı doğrudan kaydetmek için Çalışma Kayıtlarım sayfasına git.</strong>
          </span>
        </div>
        <Link
          to="/student/study-logs"
          className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800 hover:underline shrink-0"
        >
          <span>Kayıtlara Git</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Focus Hub Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        {/* Soft Ambient Background Elements */}
        {mode === 'focus' ? (
          <>
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-100/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center">
          {/* Top Control: Subject Selection */}
          <div className="w-full flex items-center justify-center sm:justify-start gap-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {mode === 'focus' ? 'Ders:' : 'Durum:'}
              </span>
              {mode === 'focus' ? (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setProofSubjectId(e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="" disabled>
                    Lütfen ders seçiniz...
                  </option>
                  {programSubjects.isGrouped ? (
                    <>
                      <optgroup label="YKS / TYT / AYT Branşları">
                        {programSubjects.yks.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="LGS Branşları">
                        {programSubjects.lgs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : (
                    programSubjects.subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  Zihin Dinlendirme Seansı
                </span>
              )}
            </div>
          </div>

          {/* SVG Circular Countdown Timer */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-4 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
              <defs>
                {mode === 'focus' ? (
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                ) : (
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                )}
              </defs>

              {/* Background Track */}
              <circle
                cx="130"
                cy="130"
                r={radius}
                stroke="#F1F5F9"
                strokeWidth="12"
                fill="transparent"
              />

              {/* Animated Progress Ring */}
              <circle
                cx="130"
                cy="130"
                r={radius}
                stroke="url(#timerGradient)"
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Inner Digital Time & Status */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                {isActive
                  ? mode === 'focus'
                    ? '⚡ Akıştasın'
                    : '🌿 Dinleniyorsun'
                  : '⏸️ Hazırsın'}
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                {formattedMinutes}:{formattedSeconds}
              </div>
              <span
                className={`text-xs font-semibold mt-2 px-2.5 py-0.5 rounded-full border ${
                  mode === 'focus'
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                }`}
              >
                {mode === 'focus' ? currentSubjectObj?.name || 'Odak Seansı' : 'Mola Vakti'}
              </span>
            </div>
          </div>

          {/* Sequential Focus & Break Duration Buttons at the Bottom: [25 dk Odak] [5 dk Mola] [50 dk Odak] [10 dk Mola] */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 my-4">
            {POMODORO_SEQUENCE_BUTTONS.map((btn) => {
              const isSelected = mode === btn.mode && initialDuration === btn.mins * 60;
              return (
                <button
                  key={`${btn.mode}-${btn.mins}`}
                  type="button"
                  onClick={() => handleSelectPresetAndMode(btn.mins, btn.mode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? btn.mode === 'focus'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs shadow-amber-500/20'
                        : 'bg-emerald-500 text-white border-emerald-500 shadow-xs shadow-emerald-500/20'
                      : 'bg-slate-50 text-gray-800 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Start/Pause, Reset, and Manual Proof submission */}
          <div className="flex items-center gap-3 mt-4">
            <Button
              variant={isActive ? 'secondary' : 'primary'}
              size="lg"
              leftIcon={isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              onClick={toggleTimer}
              className="px-8"
            >
              {isActive ? 'Duraklat' : secondsLeft === 0 ? 'Tekrar Başlat' : 'Başlat'}
            </Button>

            <Button
              variant="outline"
              size="lg"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={resetTimer}
              title="Sıfırla"
            >
              Sıfırla
            </Button>

            {mode === 'focus' && (
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<Camera className="w-4 h-4 text-amber-600" />}
                onClick={() => {
                  const currentMins = Math.max(15, Math.round((initialDuration - secondsLeft) / 60) || 25);
                  setProofDuration(currentMins);
                  setProofModalOpen(true);
                }}
                className="bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 font-semibold"
              >
                Kanıt Gönder
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Proof Rule & Pipeline Note Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-900 block">
              Mahfaza.co Doğrulanmış Çalışma Prensibi:
            </span>
            <p className="text-amber-800/90 mt-0.5 leading-relaxed">
              XP kazanımları yalnızca sayacın çalıştırılmasıyla veya manuel sayı girişiyle otomatik verilmez. Her seans için fotoğraf yüklenmesi ve koçunuz tarafından incelenip onaylanması şarttır.
            </p>
          </div>
        </div>
      </div>

      {/* My Submitted Study Proofs History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Gönderilen Çalışma Kanıtlarım
            </h2>
            <p className="text-xs text-slate-500">
              Koçunuzun onayına sunulan tüm fotoğraflı çalışma ve soru çözüm seansları.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-400">
            Toplam {myProofs.length} Gönderim
          </span>
        </div>

        {myProofs.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-slate-200 bg-white">
            <Camera className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">Henüz Kanıt Gönderilmedi</h3>
            <p className="text-xs text-slate-400 mt-1">
              Bir odaklanma seansını tamamlayın veya serbest çalışma kaydıyla soru çözüm föyünüzü yükleyin.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myProofs.map((proof) => {
              const statusConfig = {
                pending: { label: 'Koç Onayı Bekliyor', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
                approved: { label: 'Onaylandı (+XP Cüzdanda)', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                rejected: { label: 'Revizyon İstendi', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
              };
              const config = statusConfig[proof.status] || statusConfig.pending;

              return (
                <Card
                  key={proof.id}
                  className="p-4 border border-slate-200/90 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer relative group"
                      onClick={() => setSelectedProofPreview(proof)}
                      title="Görseli Büyüt"
                    >
                      <img
                        src={proof.proof_photo_url}
                        alt="Kanıt"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {proof.subject_name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.bg}`}
                        >
                          {config.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                        <span>{proof.duration_minutes} dk seans</span>
                        {proof.question_count > 0 && (
                          <>
                            <span>&bull;</span>
                            <span>{proof.question_count} soru</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="text-amber-700 font-bold">+{proof.calculated_xp} XP</span>
                      </div>

                      {proof.study_note && (
                        <p className="text-xs text-slate-600 mt-1.5 line-clamp-1 italic">
                          "{proof.study_note}"
                        </p>
                      )}

                      {proof.coach_feedback && (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-500 block">Koç Geri Bildirimi:</span>
                          <p className="text-slate-800">{proof.coach_feedback}</p>
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                        {new Date(proof.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SUBMIT STUDY PROOF MODAL */}
      {proofModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setProofModalOpen(false)}
          title="Fotoğraflı Çalışma Kanıtı Gönder"
          subtitle="Çözdüğünüz soruların veya konu özetinizin fotoğrafını yükleyerek koçunuzdan onay talep edin."
          maxWidth="lg"
        >
          <form onSubmit={handleSubmitProof} className="space-y-5">
            {proofError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{proofError}</span>
              </div>
            )}

            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Çalışılan Branş / Ders <span className="text-rose-500">*</span>
              </label>
              <select
                value={proofSubjectId}
                onChange={(e) => setProofSubjectId(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="" disabled>
                  Lütfen ders seçiniz...
                </option>
                {programSubjects.isGrouped ? (
                  <>
                    <optgroup label="YKS / TYT / AYT Branşları">
                      {programSubjects.yks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="LGS Branşları">
                      {programSubjects.lgs.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  </>
                ) : (
                  programSubjects.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Duration & Questions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Çalışma Süresi (Dakika)"
                type="number"
                min={5}
                max={300}
                required
                value={proofDuration}
                onChange={(e) => setProofDuration(parseInt(e.target.value) || 0)}
              />

              <Input
                label="Çözülen Soru Sayısı"
                type="number"
                min={0}
                max={500}
                value={proofQuestions}
                onChange={(e) => setProofQuestions(parseInt(e.target.value) || 0)}
                placeholder="Örn: 40"
              />
            </div>

            {/* Study Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Çalışma Notu & Konu Kapsamı
              </label>
              <textarea
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                rows={2}
                placeholder="Örn: Trigonometri test 3 ve 4 çözüldü, formüller tekrar edildi."
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400"
              />
            </div>

            {/* Photo Proof Upload Area (Mandatory) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Çalışma Fotoğrafı (Soru Kitapçığı / Not Defteri) <span className="text-rose-500">*</span>
              </label>

              {proofImagePreview ? (
                <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group">
                  <img
                    src={proofImagePreview}
                    alt="Yüklenen Kanıt"
                    className="w-full max-h-60 object-contain mx-auto"
                  />
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-medium backdrop-blur-xs transition-colors"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-amber-500/80 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/20 transition-all text-center">
                  <Upload className="w-8 h-8 text-amber-500 mb-2" />
                  <span className="text-xs font-semibold text-slate-800">
                    Fotoğraf Seçin veya Sürükleyin
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    JPG, PNG formatları (Maks 8MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Potential XP Indicator */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Koç Onayı Sonrası Kazanılacak Tahmini XP:
              </span>
              <span className="font-mono font-bold text-amber-700 text-sm flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-600" />
                +{potentialXP} XP
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setProofModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={submittingProof}
                disabled={!proofImagePreview}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Kanıtı Koçuma İlet
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* LIGHTBOX MODAL FOR PREVIEWING ENLARGED PROOF PHOTO */}
      {selectedProofPreview && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProofPreview(null)}
          title={selectedProofPreview.subject_name}
          subtitle={`${selectedProofPreview.duration_minutes} dk • ${selectedProofPreview.question_count} soru`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="max-h-[65vh] overflow-auto rounded-xl bg-slate-100 flex items-center justify-center p-2">
              <img
                src={selectedProofPreview.proof_photo_url}
                alt="Kanıt Önizleme"
                className="max-h-[60vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            {selectedProofPreview.study_note && (
              <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{selectedProofPreview.study_note}"
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
