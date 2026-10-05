import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { rewardService } from '../../services/rewardService';
import { xpService } from '../../services/xpService';
import { Reward, RewardRequest, StudentXPData, RewardCategory } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Gift, Coins, Check, Clock, AlertCircle } from 'lucide-react';

export const StudentRewardsPage: React.FC = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [xpData, setXpData] = useState<StudentXPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'all'>('all');

  // Purchase Request Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [rws, reqs, xp] = await Promise.all([
        rewardService.getRewards(),
        rewardService.getStudentRequests(user.id),
        xpService.getStudentXP(user.id),
      ]);
      setRewards(rws);
      setRequests(reqs);
      setXpData(xp);
    } catch (err) {
      console.error('Error loading rewards:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRequest = async () => {
    if (!user?.id || !selectedReward) return;
    setRequesting(true);
    setRequestStatus(null);

    try {
      await rewardService.requestReward(user.id, selectedReward.id);
      setRequestStatus('Talep başarıyla iletildi. Yönetici onayı sonrasında XP cüzdanınızdan düşülecektir.');
      await loadData();
      setTimeout(() => {
        setConfirmModalOpen(false);
        setSelectedReward(null);
        setRequestStatus(null);
      }, 1800);
    } catch (err: any) {
      setRequestStatus(err.message || 'Talep oluşturulurken bir hata oluştu.');
    } finally {
      setRequesting(false);
    }
  };

  const filteredRewards = selectedCategory === 'all'
    ? rewards
    : rewards.filter((r) => r.category === selectedCategory);

  const categoryLabels: Record<string, string> = {
    all: 'Tümü',
    mahfaza: '🏛️ Mahfaza',
    digital: '🎧 Dijital',
    academic: '📚 Akademik',
    legendary: '👑 Efsanevi',
    Akademik: '📚 Akademik',
    Genel: '🎁 Genel',
    Motivasyon: '⚡ Motivasyon',
    Seans: '👥 Birebir Seans',
  };

  if (loading) {
    return <LoadingState message="Mahfaza ödül vitrini yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Balance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Mahfaza Vitrini</span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Ödüller & Ayrıcalıklar
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kazandığın cüzdan XP'lerini akademik ayrıcalıklara ve ödüllere dönüştür.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 flex items-center gap-3">
          <Coins className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Kullanılabilir Bakiye</div>
            <div className="text-base font-bold font-mono text-amber-400 tabular-nums">
              {xpData?.wallet_xp || 0} XP
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs (Zero-pill button segmented controls) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['all', 'mahfaza', 'digital', 'academic', 'legendary'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      {filteredRewards.length === 0 ? (
        <EmptyState
          title="Henüz Ödül Tanımlanmamış"
          description="Bu kategoride henüz listelenmiş bir ödül bulunmuyor. Yönetici onaylı ödüller eklendiğinde burada sergilenecektir."
          icon={<Gift className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map((reward) => {
            const hasEnoughXP = (xpData?.wallet_xp || 0) >= reward.xp_price;
            const isOutOfStock = reward.stock !== null && reward.stock <= 0;

            return (
              <div
                key={reward.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <span className="text-zinc-400">{categoryLabels[reward.category] || reward.category || 'Genel'}</span>
                    <Badge variant={reward.rarity === 'legendary' ? 'amber' : 'neutral'}>
                      {(reward.rarity || 'Standart').toUpperCase()}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100">{reward.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {reward.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="font-mono">
                    <div className="text-sm font-bold text-amber-400">{reward.xp_price} XP</div>
                    <div className="text-[10px] text-zinc-500">
                      {reward.stock !== null ? `Stok: ${reward.stock}` : 'Sınırsız'}
                    </div>
                  </div>

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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student's Recent Requests */}
      <Card
        title="Ödül Taleplerim"
        subtitle="Daha önce gönderdiğiniz talepler ve onay durumları"
      >
        {requests.length === 0 ? (
          <EmptyState
            title="Aktif Talep Bulunmuyor"
            description="Henüz bir ödül talebinde bulunmadınız."
            icon={<Clock className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {requests.map((req) => (
              <div key={req.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {req.reward?.title || 'Ödül'}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    <span>{new Date(req.requested_at).toLocaleDateString('tr-TR')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-amber-400">{req.reward?.xp_price} XP</span>
                    {req.admin_note && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-zinc-400">Not: {req.admin_note}</span>
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
            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="font-semibold text-zinc-200">{selectedReward.title}</div>
              <div className="font-mono text-amber-400 text-sm">{selectedReward.xp_price} XP</div>
              <p className="text-zinc-400 text-[11px] pt-1">{selectedReward.description}</p>
            </div>

            <p className="text-zinc-400 text-[11px]">
              Talebiniz yönetici paneline iletilecektir. Yönetici onayı anında <span className="font-mono text-amber-400">{selectedReward.xp_price} XP</span> cüzdanınızdan düşülecek, ömür boyu XP seviyeniz ise korunacaktır.
            </p>

            {requestStatus && (
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-amber-400 text-center font-medium">
                {requestStatus}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
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
