import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { Profile, StudentXPData, ExamResult } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Users,
  Search,
  UserPlus,
  Flame,
  Award,
  Target,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Coins,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoachStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentXPMap, setStudentXPMap] = useState<Record<string, StudentXPData | null>>({});
  const [studentExamsMap, setStudentExamsMap] = useState<Record<string, ExamResult[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pairing Modal
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);

  // Manual XP Modal
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [selectedStudentForXP, setSelectedStudentForXP] = useState<Profile | null>(null);
  const [xpMode, setXpMode] = useState<'add' | 'deduct'>('add');
  const [xpAmount, setXpAmount] = useState<number>(50);
  const [xpReason, setXpReason] = useState<string>('');
  const [xpSubmitting, setXpSubmitting] = useState(false);
  const [xpError, setXpError] = useState<string | null>(null);
  const [xpSuccess, setXpSuccess] = useState<string | null>(null);
  const [coachInviteCode, setCoachInviteCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleCopyInviteCode = async () => {
    if (!coachInviteCode) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(coachInviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // safe fallback
    }
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [studs, myInviteCode] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        relationshipService.getCoachInviteCode(user.id),
      ]);
      setStudents(studs);
      setCoachInviteCode(myInviteCode);

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
      console.error('Error loading coach students portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePairStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !studentInput.trim()) return;

    setPairingLoading(true);
    setPairError(null);
    setPairSuccess(null);

    try {
      const added = await relationshipService.pairStudentWithCoach(user.id, studentInput.trim());
      setPairSuccess(`'${added.first_name} ${added.last_name}' başarıyla portföyünüze eklendi!`);
      setStudentInput('');
      await loadData();
      setTimeout(() => {
        setPairModalOpen(false);
        setPairSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPairError(err.message || 'Öğrenci eklenirken bir hata meydana geldi.');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleUnlink = async (studentId: string, studentName: string) => {
    if (!user?.id) return;
    if (!window.confirm(`'${studentName}' isimli öğrenciyi portföyünüzden çıkarmak istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await relationshipService.unlinkCoachStudent(user.id, studentId);
      await loadData();
    } catch (err) {
      console.error('Unlink error:', err);
    }
  };

  const filteredStudents = students.filter((s) => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || s.email?.toLowerCase().includes(term);
  });

  if (loading) {
    return <LoadingState message="Öğrenci portföyü yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Öğrenci Portföy Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Öğrenci Portföyüm
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Yalnızca size atanmış danışanların akademik geçmişi, çalışma disiplini ve performans kayıtları.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setPairModalOpen(true)}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Öğrenci Ekle / Davet Et
        </Button>
      </div>

      {/* Coach Unique Invite Code Banner Card */}
      {coachInviteCode && (
        <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900/90 to-zinc-900 border border-purple-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest block font-bold">
              Öğrenci Davet Kodunuz
            </span>
            <div className="text-xl font-mono font-extrabold text-zinc-100 tracking-wider mt-0.5 select-all">
              {coachInviteCode}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Öğrencileriniz kayıt olurken bu kodu girerek doğrudan portföyünüze dahil olur.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyInviteCode}
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? '✓ Kopyalandı' : 'Kodu Kopyala'}
            </Button>
          </div>
        </div>
      )}

      {/* Search Input */}
      {students.length > 0 && (
        <div className="max-w-md">
          <Input
            placeholder="Öğrenci adı veya e-posta ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
          />
        </div>
      )}

      {/* Student List */}
      {students.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-zinc-800 bg-zinc-950/40">
          <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-zinc-100">Öğrenci Ekleyin</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
            Öğrencinizi e-posta adresi veya davet kodu ile portföyünüze ekleyin.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setPairModalOpen(true)}
            >
              Öğrenci Ekle / Davet Et
            </Button>
          </div>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <EmptyState
          title="Sonuç Bulunamadı"
          description={`'${searchTerm}' aramasına uygun öğrenci bulunamadı.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const xp = studentXPMap[student.id];
            const exams = studentExamsMap[student.id] || [];
            const latestExam = exams[0];

            return (
              <div
                key={student.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-purple-500/40 rounded-xl p-4 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Student Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                        {student.first_name?.[0] || 'Ö'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-zinc-100 truncate">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 font-mono truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnlink(student.id, `${student.first_name} ${student.last_name}`)}
                      title="Portföyden Çıkar"
                      className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Academic Indicators */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-850 mb-3 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">Streak</span>
                      <span className="text-xs font-bold font-mono text-amber-400 flex items-center justify-center gap-0.5 mt-0.5">
                        <Flame className="w-3 h-3" />
                        {xp?.current_streak_days || 0} g
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">Toplam XP</span>
                      <span className="text-xs font-bold font-mono text-zinc-200 mt-0.5 block">
                        {xp?.lifetime_xp?.toLocaleString('tr-TR') || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono block uppercase">Son Deneme</span>
                      <span className="text-xs font-bold font-mono text-emerald-400 mt-0.5 block">
                        {latestExam?.total_net ? `${latestExam.total_net} N` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center text-xs"
                    leftIcon={<Coins className="w-3 h-3 text-amber-400" />}
                    onClick={() => {
                      setSelectedStudentForXP(student);
                      setXpError(null);
                      setXpSuccess(null);
                      setXpReason('');
                      setXpModalOpen(true);
                    }}
                  >
                    Manuel XP
                  </Button>

                  <Link to={`/coach/students/${student.id}`} className="w-full">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs"
                      rightIcon={<ArrowRight className="w-3 h-3" />}
                    >
                      360° İncele
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAIR STUDENT MODAL */}
      {pairModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setPairModalOpen(false)}
          title="Öğrenci Ekle / Davet Et"
          maxWidth="md"
        >
          <form onSubmit={handlePairStudent} className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Öğrencinizi sistemde kayıtlı e-posta adresini veya davet kodunu girerek koçluk portföyünüze dahil edin.
            </p>

            {pairError && (
              <div className="p-3 rounded-md bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pairError}</span>
              </div>
            )}

            {pairSuccess && (
              <div className="p-3 rounded-md bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{pairSuccess}</span>
              </div>
            )}

            {/* Coach Unique Invite Code Banner */}
            {coachInviteCode && (
              <div className="p-3.5 rounded-lg bg-purple-950/30 border border-purple-500/30 space-y-1">
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">
                  Sizin Benzersiz Koç Davet Kodunuz
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-bold text-zinc-100 select-all tracking-wider">
                    {coachInviteCode}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Öğrencileriniz kayıt olurken bu kodu girerek doğrudan sizinle eşleşebilir.
                  </span>
                </div>
              </div>
            )}

            <Input
              label="Öğrenci E-Posta Adresi veya Davet Kodu"
              required
              placeholder="ornek@ogrenci.com veya demo.ogrenci@mahfaza.co"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setPairModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={pairingLoading}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Portföye Ekle
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MANUEL XP İŞLEMİ MODALI */}
      {xpModalOpen && selectedStudentForXP && (
        <Modal
          isOpen={xpModalOpen}
          onClose={() => setXpModalOpen(false)}
          title="Öğrenciye Manuel XP İşlemi"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedStudentForXP) return;
              if (!xpAmount || xpAmount <= 0) {
                setXpError('Geçerli bir XP miktarı giriniz.');
                return;
              }
              if (!xpReason.trim()) {
                setXpError('İşlem gerekçesi zorunludur.');
                return;
              }

              setXpSubmitting(true);
              setXpError(null);
              setXpSuccess(null);

              const finalAmount = xpMode === 'add' ? Number(xpAmount) : -Number(xpAmount);

              try {
                await xpService.adjustManualXP({
                  student_id: selectedStudentForXP.id,
                  amount: finalAmount,
                  reason: xpReason.trim(),
                });
                setXpSuccess(`Başarılı! ${finalAmount > 0 ? '+' : ''}${finalAmount} XP bakiyeye yansıtıldı.`);
                await loadData();
                setTimeout(() => {
                  setXpModalOpen(false);
                  setXpSuccess(null);
                  setXpReason('');
                }, 1500);
              } catch (err: any) {
                setXpError(err.message || 'XP işlemi gerçekleştirilemedi.');
              } finally {
                setXpSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block">Öğrenci:</span>
                <span className="text-zinc-100 font-semibold">
                  {selectedStudentForXP.first_name} {selectedStudentForXP.last_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-zinc-400 block">Mevcut Cüzdan:</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  {studentXPMap[selectedStudentForXP.id]?.wallet_xp || 0} XP
                </span>
              </div>
            </div>

            {/* Operation Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">İşlem Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setXpMode('add')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    xpMode === 'add'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  XP Ekle (+)
                </button>
                <button
                  type="button"
                  onClick={() => setXpMode('deduct')}
                  className={`p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    xpMode === 'deduct'
                      ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-lg leading-none font-bold text-rose-400">-</span>
                  XP Düşür (-)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">XP Miktarı</label>
              <Input
                type="number"
                min="1"
                max="500"
                value={xpAmount}
                onChange={(e) => setXpAmount(Math.max(1, parseInt(e.target.value) || 0))}
                required
              />
            </div>

            {/* Mandatory Reason */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                İşlem Gerekçesi (Zorunlu)
              </label>
              <textarea
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
                placeholder="Örn: Haftalık çalışma hedefi başarısı tebriği, ödev telafisi vb."
                className="w-full h-20 p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Preview Balance */}
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">İşlem Sonrası Cüzdan:</span>
              <span className="text-zinc-100 font-bold">
                {Math.max(
                  0,
                  (studentXPMap[selectedStudentForXP.id]?.wallet_xp || 0) +
                    (xpMode === 'add' ? xpAmount : -xpAmount)
                )}{' '}
                XP
              </span>
            </div>

            {xpError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {xpError}
              </div>
            )}

            {xpSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {xpSuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setXpModalOpen(false)}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={xpSubmitting}
              >
                İşlemi Onayla ve Kaydet
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
