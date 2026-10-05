import React, { useState, useEffect } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { xpService } from '../../services/xpService';
import { academicService } from '../../services/academicService';
import { Subject, StudentXPData } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingState } from '../../components/ui/EmptyState';
import { Play, Pause, RotateCcw, Clock, Award, CheckCircle2, Flame } from 'lucide-react';
import { previewAwardCalculation, DAILY_XP_HARD_CAP } from '../../utils/xpEngine';

export const StudentSessionsPage: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer State
  const [seconds, setSeconds] = useState(1500); // 25 min default
  const [isActive, setIsActive] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      academicService.getSubjects(),
      xpService.getStudentXP(user.id),
    ]).then(([subs, xp]) => {
      setSubjects(subs);
      if (subs.length > 0) setSelectedSubject(subs[0].id);
      setXpData(xp);
      setLoading(false);
    });
  }, [user?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
        setElapsedMinutes((prev) => prev + 1 / 60);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetDuration = (mins: number) => {
    setIsActive(false);
    setSeconds(mins * 60);
    setElapsedMinutes(0);
  };

  const handleFinishAndAward = async () => {
    if (!user?.id || !xpData) return;
    setSavingSession(true);
    setSuccessMessage(null);

    // Determine XP bracket according to Section 22:
    // 15-29m = 10 XP | 30-59m = 20 XP | 60-89m = 35 XP | 90-120+m = 50 XP
    const completedMins = Math.max(15, Math.round(elapsedMinutes));
    let baseXP = 10;
    if (completedMins >= 90) baseXP = 50;
    else if (completedMins >= 60) baseXP = 35;
    else if (completedMins >= 30) baseXP = 20;

    const subName = subjects.find((s) => s.id === selectedSubject)?.name || 'Bireysel';

    try {
      const res = await xpService.awardXPAtomic({
        student_id: user.id,
        base_amount: baseXP,
        action_type: 'study_session',
        description: `${completedMins} dk ${subName} Seansı${sessionNotes ? ` - ${sessionNotes}` : ''}`,
      });

      if (res.success) {
        setSuccessMessage(`Harika odaklanma! ${res.awarded_xp} XP kazandınız! (${res.streak}. gün disiplin serisi)`);
        const freshXP = await xpService.getStudentXP(user.id);
        setXpData(freshXP);
        setTimeout(() => {
          handleSetDuration(25);
          setSessionNotes('');
          setSuccessMessage(null);
        }, 2500);
      } else {
        setSuccessMessage(res.message || 'Seans kaydedildi ancak kota dolmuş olabilir.');
      }
    } catch (err: any) {
      setSuccessMessage(err.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setSavingSession(false);
    }
  };

  if (loading) {
    return <LoadingState message="Çalışma odası hazırlanıyor..." />;
  }

  const currentPreview = xpData ? previewAwardCalculation(20, xpData.current_streak_days, xpData.today_earned_xp) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-zinc-800">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Odaklanma Seansı</span>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
          Pomodoro & Derin Çalışma
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          "Planını Kur. Disiplinini Koru. Hedefine Ulaş."
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timer Card */}
        <Card className="md:col-span-2 text-center flex flex-col items-center justify-center py-10">
          {/* Preset Buttons */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => handleSetDuration(15)}
              className="px-3 py-1 text-xs rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              15 dk
            </button>
            <button
              onClick={() => handleSetDuration(25)}
              className="px-3 py-1 text-xs rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-medium cursor-pointer"
            >
              25 dk
            </button>
            <button
              onClick={() => handleSetDuration(45)}
              className="px-3 py-1 text-xs rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              45 dk
            </button>
            <button
              onClick={() => handleSetDuration(60)}
              className="px-3 py-1 text-xs rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              60 dk
            </button>
          </div>

          {/* Clock Display */}
          <div className="font-mono text-6xl sm:text-7xl font-bold text-zinc-100 tabular-nums tracking-tight my-4">
            {formatTime(seconds)}
          </div>

          <p className="text-xs text-zinc-500 mb-8">
            Geçen Süre: {Math.floor(elapsedMinutes)} dakika
          </p>

          {/* Timer Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant={isActive ? 'secondary' : 'primary'}
              size="lg"
              onClick={() => setIsActive(!isActive)}
              leftIcon={isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            >
              {isActive ? 'Duraklat' : 'Başlat'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleSetDuration(25)}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Sıfırla
            </Button>
          </div>

          {/* Award Action */}
          <div className="mt-8 pt-6 border-t border-zinc-800 w-full max-w-md">
            <Button
              variant="secondary"
              className="w-full text-xs font-semibold"
              disabled={elapsedMinutes < 0.2 && seconds > 0}
              onClick={handleFinishAndAward}
              isLoading={savingSession}
              leftIcon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            >
              Seansı Tamamla ve XP Kazan
            </Button>
          </div>

          {successMessage && (
            <div className="mt-4 p-3 rounded bg-zinc-950 border border-zinc-800 text-xs text-amber-400 font-medium">
              {successMessage}
            </div>
          )}
        </Card>

        {/* Configuration & XP Info */}
        <div className="space-y-4">
          <Card title="Seans Detayları">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Ders Seçimi</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                  {subjects.length === 0 && <option value="">Genel Çalışma</option>}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Seans Notu</label>
                <input
                  type="text"
                  placeholder="Hedef soru veya konu"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </Card>

          <Card title="XP Kazanım Kuralları">
            <div className="space-y-2 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>15-29 dk:</span>
                <span className="text-zinc-200">10 XP</span>
              </div>
              <div className="flex justify-between">
                <span>30-59 dk:</span>
                <span className="text-zinc-200">20 XP</span>
              </div>
              <div className="flex justify-between">
                <span>60-89 dk:</span>
                <span className="text-zinc-200">35 XP</span>
              </div>
              <div className="flex justify-between">
                <span>90+ dk:</span>
                <span className="text-zinc-200">50 XP</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500">
                Günlük tavan: 150 XP. Seri çarpanı taban XP'ye uygulanır.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
