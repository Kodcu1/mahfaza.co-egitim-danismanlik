import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { examService } from '../../services/examService';
import { subscriptionService } from '../../services/subscriptionService';
import { Profile, StudentXPData, ExamResult, UserSubscription, SubscriptionPlanId } from '../../types';
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
  Crown,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoachStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Profile[]>([]);
  const [studentXPMap, setStudentXPMap] = useState<Record<string, StudentXPData | null>>({});
  const [studentExamsMap, setStudentExamsMap] = useState<Record<string, ExamResult[]>>({});
  const [studentSubMap, setStudentSubMap] = useState<Record<string, UserSubscription | null>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pairing Modal
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [studentInput, setStudentInput] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairSuccess, setPairSuccess] = useState<string | null>(null);

  // Unlink Confirmation Modal
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [studentToUnlink, setStudentToUnlink] = useState<Profile | null>(null);
  const [unlinkingLoading, setUnlinkingLoading] = useState(false);

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

  // Coach Student Package Upgrade Modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedStudentForUpgrade, setSelectedStudentForUpgrade] = useState<Profile | null>(null);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState<SubscriptionPlanId>('pro');
  const [upgradingPackage, setUpgradingPackage] = useState(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const getUnlinkedIds = useCallback(() => {
    if (!user?.id) return [];
    try {
      return JSON.parse(localStorage.getItem(`mahfaza_unlinked_${user.id}`) || '[]');
    } catch {
      return [];
    }
  }, [user?.id]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const cacheKey = `mahfaza_coach_students_${user.id}`;
    const unlinkedIds = getUnlinkedIds();

    // 1. Instant Cache Hydration (prevents blank screen or lag)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed: Profile[] = JSON.parse(cached);
        const filteredCached = parsed.filter((s) => !unlinkedIds.includes(s.id));
        if (filteredCached.length > 0) {
          setStudents(filteredCached);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }

    try {
      const [studs, myInviteCode] = await Promise.all([
        relationshipService.getCoachAssignedStudents(user.id),
        relationshipService.getCoachInviteCode(user.id),
      ]);

      // Filter out permanently deleted students (ghost data elimination)
      const validStudents = (studs || []).filter((s) => !unlinkedIds.includes(s.id));

      setStudents(validStudents);
      localStorage.setItem(cacheKey, JSON.stringify(validStudents));
      setCoachInviteCode(myInviteCode);

      const xpMap: Record<string, StudentXPData | null> = {};
      const examsMap: Record<string, ExamResult[]> = {};
      const subMap: Record<string, UserSubscription | null> = {};

      for (const s of validStudents) {
        const [xp, exams, sub] = await Promise.all([
          xpService.getStudentXP(s.id),
          examService.getStudentExamResults(s.id),
          subscriptionService.getUserSubscription(s.id).catch(() => null),
        ]);
        xpMap[s.id] = xp;
        examsMap[s.id] = exams;
        subMap[s.id] = sub;
      }

      setStudentXPMap(xpMap);
      setStudentExamsMap(examsMap);
      setStudentSubMap(subMap);
    } catch (err) {
      console.error('Error loading coach students portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, getUnlinkedIds]);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    const handleProfileUpdate = (e: any) => {
      if (e?.detail?.userId && e?.detail?.avatarUrl) {
        setStudents((prev) =>
          prev.map((s) => (s.id === e.detail.userId ? { ...s, avatar_url: e.detail.avatarUrl } : s))
        );
      }
    };

    window.addEventListener('mahfaza:xp-updated', handleSync);
    window.addEventListener('mahfaza:profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('mahfaza:xp-updated', handleSync);
      window.removeEventListener('mahfaza:profile-updated', handleProfileUpdate);
    };
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

  // ACTION 4: PERMANENT DELETION & GHOST DATA ELIMINATION
  const handleConfirmUnlink = async () => {
    if (!user?.id || !studentToUnlink) return;
    setUnlinkingLoading(true);
    const studentIdToRemove = studentToUnlink.id;

    try {
      // 1. Immediately record in unlinked list in localStorage so they NEVER reappear
      const unlinkedKey = `mahfaza_unlinked_${user.id}`;
      const existingUnlinked: string[] = JSON.parse(localStorage.getItem(unlinkedKey) || '[]');
      if (!existingUnlinked.includes(studentIdToRemove)) {
        existingUnlinked.push(studentIdToRemove);
        localStorage.setItem(unlinkedKey, JSON.stringify(existingUnlinked));
      }

      // 2. Immediately remove from React state & local coach students cache
      setStudents((prev) => {
        const filtered = prev.filter((s) => s.id !== studentIdToRemove);
        localStorage.setItem(`mahfaza_coach_students_${user.id}`, JSON.stringify(filtered));
        return filtered;
      });

      setUnlinkModalOpen(false);
      setStudentToUnlink(null);

      // 3. Perform backend unlink
      await relationshipService.unlinkCoachStudent(user.id, studentIdToRemove);
    } catch (err) {
      console.error('Unlink error:', err);
    } finally {
      setUnlinkingLoading(false);
    }
  };

  const handleOpenUpgradeModal = (student: Profile) => {
    const currentSub = studentSubMap[student.id];
    const currentPlanId = currentSub?.plan_id || student.package_tier || 'free';
    setSelectedStudentForUpgrade(student);
    setSelectedTargetPlan(currentPlanId === 'pro' ? 'premium' : 'pro');
    setUpgradeFeedback(null);
    setUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!user?.id || !selectedStudentForUpgrade) return;
    setUpgradingPackage(true);
    setUpgradeFeedback(null);
    try {
      const updatedSub = await subscriptionService.coachUpgradeStudentPackage(
        selectedStudentForUpgrade.id,
        selectedTargetPlan
      );
      setStudentSubMap((prev) => ({
        ...prev,
        [selectedStudentForUpgrade.id]: updatedSub,
      }));
      setStudents((prev) =>
        prev.map((st) =>
          st.id === selectedStudentForUpgrade.id
            ? ({
                ...st,
                package: selectedTargetPlan,
                subscription_plan: selectedTargetPlan,
                package_tier: selectedTargetPlan,
                subscription_tier: selectedTargetPlan,
              } as Profile)
            : st
        )
      );
      setUpgradeFeedback({
        type: 'success',
        text: `${selectedStudentForUpgrade.first_name} ${selectedStudentForUpgrade.last_name} adlı öğrencinin paketi başarıyla '${updatedSub.plan?.name || selectedTargetPlan.toUpperCase()}' seviyesine yükseltildi!`,
      });
      setTimeout(() => {
        setUpgradeModalOpen(false);
        setUpgradeFeedback(null);
      }, 1000);
    } catch (err: any) {
      setUpgradeFeedback({
        type: 'error',
        text: err.message || 'Paket yükseltme işlemi sırasında bir hata oluştu.',
      });
    } finally {
      setUpgradingPackage(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Öğrenci Portföy Yönetimi
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Öğrenci Portföyüm
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Yalnızca size atanmış danışanların akademik geçmişi, paket seviyeleri ve performans kayıtları.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setPairModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Öğrenci Ekle / Davet Et
        </Button>
      </div>

      {/* Coach Unique Invite Code Banner Card */}
      {coachInviteCode && (
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <span className="text-[10px] font-mono text-amber-700 uppercase tracking-widest block font-bold">
              Öğrenci Davet Kodunuz
            </span>
            <div className="text-2xl font-mono font-black text-slate-900 tracking-wider mt-1 select-all">
              {coachInviteCode}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Öğrencileriniz kayıt olurken bu kodu girerek doğrudan portföyünüze dahil olur.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleCopyInviteCode}
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
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
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      )}

      {/* Student List */}
      {students.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center border-dashed border-slate-200 bg-white">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Öğrenci Ekleyin</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
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
            const sub = studentSubMap[student.id];
            const activePlanId = sub?.plan_id || student.package_tier || 'free';
            const activePlanName =
              sub?.plan?.name ||
              (activePlanId === 'premium'
                ? 'Premium VIP'
                : activePlanId === 'pro'
                ? 'Pro Akademi'
                : activePlanId === 'standard'
                ? 'Standart Akademik'
                : 'Başlangıç (Ücretsiz)');

            return (
              <div
                key={student.id}
                className="bg-white border border-slate-200/80 hover:border-amber-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Student Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt={student.first_name || 'Öğrenci'}
                          className="w-11 h-11 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold text-base shrink-0 shadow-xs">
                          {student.first_name?.[0] || 'Ö'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentToUnlink(student);
                        setUnlinkModalOpen(true);
                      }}
                      title="Öğrenciyi Portföyden Çıkar / İlişkiyi Sonlandır"
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Active Package Tier Row + Quick Upgrade */}
                  <div className="mb-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-[11px] font-bold text-amber-900 truncate">
                        Paket: {activePlanName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenUpgradeModal(student)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      Paketi Yükselt
                    </button>
                  </div>

                  {/* Academic Indicators */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/70 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Streak</span>
                      <span className="text-xs font-bold text-amber-700 flex items-center justify-center gap-1 mt-0.5">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                        {xp?.current_streak_days || 0} g
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Toplam XP</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {xp?.lifetime_xp?.toLocaleString('tr-TR') || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Son Deneme</span>
                      <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
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
                    leftIcon={<Coins className="w-3 h-3 text-amber-600" />}
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
            <p className="text-xs text-gray-600 leading-relaxed">
              Öğrencinizi sistemde kayıtlı e-posta adresini veya davet kodunu girerek koçluk portföyünüze dahil edin.
            </p>

            {pairError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{pairError}</span>
              </div>
            )}

            {pairSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pairSuccess}</span>
              </div>
            )}

            {/* Coach Unique Invite Code Banner */}
            {coachInviteCode && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-[10px] font-mono text-amber-800 font-semibold uppercase tracking-wider block">
                  Sizin Benzersiz Koç Davet Kodunuz
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono font-bold text-gray-800 select-all tracking-wider">
                    {coachInviteCode}
                  </span>
                  <span className="text-[10px] text-gray-600">
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

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
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
                const updatedXP = await xpService.getStudentXP(selectedStudentForXP.id);
                setStudentXPMap((prev) => ({
                  ...prev,
                  [selectedStudentForXP.id]: updatedXP,
                }));
                setXpSuccess(`Başarılı! ${finalAmount > 0 ? '+' : ''}${finalAmount} XP bakiyeye yansıtıldı.`);
                setTimeout(() => {
                  setXpModalOpen(false);
                  setXpSuccess(null);
                  setXpReason('');
                }, 1000);
              } catch (err: any) {
                setXpError(err.message || 'XP işlemi gerçekleştirilemedi.');
              } finally {
                setXpSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-600 block">Öğrenci:</span>
                <span className="text-gray-800 font-bold">
                  {selectedStudentForXP.first_name} {selectedStudentForXP.last_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-600 block">Mevcut Cüzdan:</span>
                <span className="text-amber-700 font-mono font-bold text-sm">
                  {studentXPMap[selectedStudentForXP.id]?.wallet_xp || 0} XP
                </span>
              </div>
            </div>

            {/* Operation Direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">İşlem Türü</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setXpMode('add')}
                  className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    xpMode === 'add'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  XP Ekle (+)
                </button>
                <button
                  type="button"
                  onClick={() => setXpMode('deduct')}
                  className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    xpMode === 'deduct'
                      ? 'bg-rose-50 border-rose-500 text-rose-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span className="text-lg leading-none font-bold text-rose-600">-</span>
                  XP Düşür (-)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-800 block mb-1">XP Miktarı</label>
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
              <label className="text-xs font-semibold text-gray-800 block mb-1">
                İşlem Gerekçesi (Zorunlu)
              </label>
              <textarea
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
                placeholder="Örn: Haftalık çalışma hedefi başarısı tebriği, ödev telafisi vb."
                className="w-full h-20 p-2.5 text-xs rounded-xl bg-white border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Preview Balance */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-200 flex items-center justify-between text-xs font-mono">
              <span className="text-gray-600">İşlem Sonrası Cüzdan:</span>
              <span className="text-gray-800 font-bold">
                {Math.max(
                  0,
                  (studentXPMap[selectedStudentForXP.id]?.wallet_xp || 0) +
                    (xpMode === 'add' ? xpAmount : -xpAmount)
                )}{' '}
                XP
              </span>
            </div>

            {xpError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {xpError}
              </div>
            )}

            {xpSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
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

      {/* Modern Confirmation Dialog for Unlinking */}
      <Modal
        isOpen={unlinkModalOpen}
        onClose={() => {
          if (!unlinkingLoading) {
            setUnlinkModalOpen(false);
            setStudentToUnlink(null);
          }
        }}
        title="Öğrenciyi Portföyden Çıkar / İlişkiyi Sonlandır"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              <span className="font-bold text-rose-950">
                {studentToUnlink?.first_name} {studentToUnlink?.last_name}
              </span>{' '}
              ({studentToUnlink?.email}) isimli öğrenciyi danışan portföyünüzden çıkarmak üzeresiniz.
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <p className="flex items-center gap-2 text-slate-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Öğrencinin platformdaki ana hesabı, çözdüğü denemeler ve XP geçmişi silinmez.
            </p>
            <p className="flex items-center gap-2 text-slate-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Yalnızca bu koçluk ilişkisi güvenli biçimde sonlandırılır.
            </p>
            <p className="flex items-center gap-2 text-slate-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Öğrenci dilediğinde koç davet kodunuzla veya yeni bir koçla tekrar eşleşebilir.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              disabled={unlinkingLoading}
              onClick={() => {
                setUnlinkModalOpen(false);
                setStudentToUnlink(null);
              }}
            >
              Vazgeç
            </Button>
            <Button
              variant="danger"
              size="md"
              isLoading={unlinkingLoading}
              onClick={handleConfirmUnlink}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Öğrenciyi Portföyden Çıkar
            </Button>
          </div>
        </div>
      </Modal>

      {/* COACH STUDENT PACKAGE UPGRADE MODAL */}
      {upgradeModalOpen && selectedStudentForUpgrade && (
        <Modal
          isOpen={upgradeModalOpen}
          onClose={() => {
            if (!upgradingPackage) {
              setUpgradeModalOpen(false);
              setSelectedStudentForUpgrade(null);
            }
          }}
          title="Öğrenci Paketini Yükselt (Koç Yetkisi)"
          subtitle="Danışanınızın paket seviyesini tek tıkla Pro Akademi veya Premium VIP seviyesine yükseltin"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 block">Danışan Öğrenci:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedStudentForUpgrade.first_name} {selectedStudentForUpgrade.last_name}
                </span>
                <span className="text-[11px] font-mono text-slate-500 block">
                  {selectedStudentForUpgrade.email}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Mevcut Paket:</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs mt-0.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  {studentSubMap[selectedStudentForUpgrade.id]?.plan?.name || 'Başlangıç (Ücretsiz)'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-800">
                Hedef Akademik Paket Seçin
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: 'standard' as SubscriptionPlanId,
                    name: 'Standart Akademik',
                    price: '18.900 ₺ / yıl',
                    desc: 'Deneme net analizi, standart ders içerikleri ve ödev takibi.',
                  },
                  {
                    id: 'pro' as SubscriptionPlanId,
                    name: 'Pro Akademi (Önerilen)',
                    price: '34.900 ₺ / yıl',
                    desc: 'Gelişmiş deneme karnesi, AI koçluk analizleri, XP ödül mağazası ve 360° rapor.',
                  },
                  {
                    id: 'premium' as SubscriptionPlanId,
                    name: 'Premium VIP',
                    price: '54.900 ₺ / yıl',
                    desc: 'Tam kapsamlı VIP koçluk, sınırsız içerik, öncelikli ödül vitrini ve yönetici raporu.',
                  },
                ].map((tier) => {
                  const isSelected = selectedTargetPlan === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTargetPlan(tier.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          {tier.name}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{tier.desc}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-700 text-xs block">
                          {tier.price}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {upgradeFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  upgradeFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {upgradeFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{upgradeFeedback.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUpgradeModalOpen(false)}
                disabled={upgradingPackage}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={upgradingPackage}
                onClick={handleConfirmUpgrade}
                leftIcon={<Crown className="w-3.5 h-3.5" />}
              >
                Paketi Şimdi Yükselt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
