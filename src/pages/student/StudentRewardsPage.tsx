import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../features/auth/AuthContext';
import { rewardService } from '../../services/rewardService';
import { xpService } from '../../services/xpService';
import { subscriptionService } from '../../services/subscriptionService';
import { Reward, RewardRequest, StudentXPData, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Gift,
  Coins,
  Clock,
  Sparkles,
  BookOpen,
  Award,
  AlertCircle,
  CheckCircle2,
  Crown,
  Lock,
} from 'lucide-react';

export const StudentRewardsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Request modal state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [studentNote, setStudentNote] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const studentPrimaryId = profile?.id || user?.id || '';
  const studentSecondaryId = user?.id !== profile?.id ? user?.id : undefined;

  const loadData = useCallback(async () => {
    if (!studentPrimaryId) return;
    try {
      setLoading(true);

      const [rws, reqs, xp, sub] = await Promise.all([
        rewardService.getActiveRewards(),
        rewardService.getStudentRequests(studentPrimaryId),
        xpService.getStudentXP(studentPrimaryId, studentSecondaryId),
        subscriptionService.getUserSubscription(studentPrimaryId).catch(() => null),
      ]);
      setRewards(rws);
      setRequests(reqs);
      setXpData(xp);
      setSubscription(sub);
    } catch (err) {
      console.error('Error loading rewards data:', err);
    } finally {
      setLoading(false);
    }
  }, [studentPrimaryId, studentSecondaryId]);

  useEffect(() => {
    loadData();
    const handleLiveSync = () => {
      loadData();
    };
    window.addEventListener('mahfaza:xp-updated', handleLiveSync);
    window.addEventListener('mahfaza:package-upgraded', handleLiveSync);
    window.addEventListener('mahfaza:new_notification', handleLiveSync);
    window.addEventListener('mahfaza:counts-updated', handleLiveSync);

    let channel: any = null;
    if (studentPrimaryId) {
      channel = supabase
        .channel(`public:student_rewards_sync:${studentPrimaryId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reward_requests',
          },
          () => {
            loadData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'students_xp_data',
          },
          () => {
            loadData();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'xp_transactions',
          },
          () => {
            loadData();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('mahfaza:xp-updated', handleLiveSync);
      window.removeEventListener('mahfaza:package-upgraded', handleLiveSync);
      window.removeEventListener('mahfaza:new_notification', handleLiveSync);
      window.removeEventListener('mahfaza:counts-updated', handleLiveSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadData, studentPrimaryId]);

  const handleCreateRequest = async () => {
    if (!user?.id || !selectedReward) return;
    setRequesting(true);
    setRequestStatus(null);
    try {
      await rewardService.createRewardRequest(user.id, selectedReward.id, studentNote.trim() || undefined);
      setRequestStatus('Talebiniz başarıyla iletildi! Koç onayladığında ödülünüz tanımlanacaktır.');
      setTimeout(() => {
        setConfirmModalOpen(false);
        setSelectedReward(null);
        setStudentNote('');
        setRequestStatus(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setRequestStatus(err.message || 'Talep oluşturulurken bir hata oluştu.');
    } finally {
      setRequesting(false);
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (selectedCategory === 'all') return true;
    return r.category?.toLowerCase() === selectedCategory.toLowerCase();
  });

  const categoryLabels: Record<string, string> = {
    all: 'Tüm Ödüller',
    akademik: 'Akademik Ayrıcalıklar',
    seans: 'Birebir Koçluk Seansları',
    motivasyon: 'Motivasyon & Sosyal',
    materyal: 'Kitap & Deneme Setleri',
  };

  if (loading) {
    return <LoadingState message="Mahfaza ödül vitrini yükleniyor..." />;
  }

  const currentPlanId = subscription?.plan_id || 'free';
  const isFreePlan = currentPlanId === 'free';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Mahfaza Ödül Vitrini
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Ödüller & Ayrıcalıklar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kazandığın cüzdan XP'lerini akademik ayrıcalıklara ve birebir koçluk ödüllerine dönüştür.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl px-5 py-3 flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Kullanılabilir Bakiye</div>
            <div className="text-lg font-black font-mono text-amber-700 tabular-nums">
              {xpData?.wallet_xp || 0} XP
            </div>
          </div>
        </div>
      </div>

      {/* Tier Notice if Free */}
      {isFreePlan && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
              <Crown className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-slate-900">
                VIP Ödül Vitrini & Birebir Koçluk Seansları (Pro / Premium Ayrıcalığı)
              </div>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Başlangıç paketinde temel motivasyon ödüllerini görüntüleyebilirsiniz. Birebir koçluk seansı ve efsanevi (Legendary) ödülleri talep etmek için paketinizi <strong>Pro Akademi</strong> veya <strong>Premium VIP</strong> seviyesine yükseltin.
              </p>
            </div>
          </div>
          <Link to="/pricing" className="shrink-0">
            <Button variant="primary" size="sm" leftIcon={<Crown className="w-3.5 h-3.5" />}>
              Paketi Yükselt
            </Button>
          </Link>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'akademik', 'seans', 'motivasyon', 'materyal'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <EmptyState
          title="Henüz Ödül Tanımlanmamış"
          description="Bu kategoride henüz listelenmiş bir ödül bulunmuyor. Koç onaylı ödüller eklendiğinde burada sergilenecektir."
          icon={<Gift className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => {
            const cost = reward.cost_xp || reward.xp_price || 100;
            const hasEnoughXP = (xpData?.wallet_xp || 0) >= cost;
            const isOutOfStock = reward.stock !== null && reward.stock <= 0;
            const isLockedByTier =
              isFreePlan && (reward.rarity === 'legendary' || reward.category?.toLowerCase() === 'seans');

            return (
              <div
                key={reward.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {categoryLabels[reward.category?.toLowerCase()] || reward.category || 'Genel'}
                    </span>
                    <Badge variant={reward.rarity === 'legendary' ? 'amber' : 'neutral'}>
                      {(reward.rarity || 'Standart').toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{reward.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-3">
                    {reward.description || 'Bu ödülle ilgili özel açıklama bulunmuyor.'}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="font-mono">
                    <div className="text-base font-bold text-amber-700">{cost} XP</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {reward.stock !== null ? `Stok: ${reward.stock}` : 'Sınırsız'}
                    </div>
                  </div>

                  {isLockedByTier ? (
                    <Link to="/pricing">
                      <Button variant="secondary" size="sm" leftIcon={<Lock className="w-3.5 h-3.5 text-amber-600" />}>
                        Pro / VIP Gerekli
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={hasEnoughXP && !isOutOfStock ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={!hasEnoughXP || isOutOfStock}
                      onClick={() => {
                        setSelectedReward(reward);
                        setConfirmModalOpen(true);
                      }}
                    >
                      {isOutOfStock ? 'Tükendi' : hasEnoughXP ? 'Talep Et' : 'Yetersiz XP'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student's Recent Requests */}
      <Card
        title="Ödül Taleplerim"
        subtitle="Daha önce gönderdiğiniz talepler ve koçunuzun onay durumları"
      >
        {requests.length === 0 ? (
          <EmptyState
            title="Aktif Talep Bulunmuyor"
            description="Henüz bir ödül talebinde bulunmadınız."
            icon={<Clock className="w-6 h-6 text-slate-400" />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req.id} className="py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {req.reward?.title || 'Ödül'}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                    <span>{new Date(req.requested_at).toLocaleDateString('tr-TR')}</span>
                    <span aria-hidden="true">&bull;</span>
                    <span className="font-bold text-amber-700">{req.cost_xp || req.reward?.xp_price} XP</span>
                    {req.admin_note && (
                      <>
                        <span aria-hidden="true">&bull;</span>
                        <span className="text-slate-600 font-sans italic">Not: {req.admin_note}</span>
                      </>
                    )}
                  </div>
                </div>

                <Badge
                  variant={
                    req.status === 'approved'
                      ? 'success'
                      : req.status === 'rejected'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {req.status === 'approved'
                    ? 'Onaylandı'
                    : req.status === 'rejected'
                    ? 'Reddedildi'
                    : 'İncelemede'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Ödül Talebini Onayla"
        subtitle="Mahfaza vitrininden ödül talebi oluştur"
        maxWidth="sm"
      >
        {selectedReward && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
              <div className="font-bold text-slate-900 text-sm">{selectedReward.title}</div>
              <div className="font-mono text-amber-700 font-black text-base">
                {selectedReward.cost_xp || selectedReward.xp_price} XP
              </div>
              <p className="text-slate-600 text-[11px] pt-1">{selectedReward.description}</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Koçunuza Not (İsteğe Bağlı)
              </label>
              <textarea
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="Örn: Hafta sonu müsaitliğim var, 15:00 seansı için talep ediyorum..."
                rows={2}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs"
              />
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              Talebiniz koçunuzun inceleme paneline iletilecektir. Koç onayı anında{' '}
              <span className="font-mono font-bold text-amber-700">
                {selectedReward.cost_xp || selectedReward.xp_price} XP
              </span>{' '}
              cüzdanınızdan düşülecek, ömür boyu XP seviyeniz ise korunacaktır.
            </p>

            {requestStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  requestStatus.includes('başarıyla')
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {requestStatus.includes('başarıyla') ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{requestStatus}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmModalOpen(false)}
                disabled={requesting}
              >
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateRequest}
                isLoading={requesting}
              >
                Talebi Gönder
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
