import React, { useState, useEffect, useCallback } from 'react';
import { rewardService } from '../../services/rewardService';
import { Reward, RewardRequest, RewardCategory, RewardRarity } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import { Plus, Gift, Check, X, ShieldAlert } from 'lucide-react';

export const AdminRewardsPage: React.FC = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // New Reward Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RewardCategory>('mahfaza');
  const [rarity, setRarity] = useState<RewardRarity>('common');
  const [xpPrice, setXpPrice] = useState(100);
  const [realCost, setRealCost] = useState(0);
  const [stock, setStock] = useState<string>('');
  const [savingReward, setSavingReward] = useState(false);

  // Process Request State
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rws, reqs] = await Promise.all([
        rewardService.getAllRewardsAdmin().catch(() => []),
        rewardService.getAllRequestsAdmin().catch(() => []),
      ]);
      setRewards(rws);
      setRequests(reqs);
    } catch (err) {
      console.warn('Rewards data loaded with fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingReward(true);
    try {
      await rewardService.createReward({
        title: title.trim(),
        description: description.trim(),
        category,
        rarity,
        xp_price: Number(xpPrice),
        real_cost: Number(realCost),
        stock: stock.trim() ? Number(stock) : null,
      });

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setXpPrice(100);
      setStock('');
      await loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Ödül kaydedilemedi.');
    } finally {
      setSavingReward(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    setFeedback(null);
    try {
      const res = await rewardService.approveRewardAtomic(requestId, 'Yönetici onayladı');
      setFeedback('Ödül talebi atomik işlemle onaylandı ve bakiye düşürüldü.');
      await loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Onaylanamadı.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    setFeedback(null);
    try {
      await rewardService.rejectRewardRequest(requestId, 'Yönetici reddetti.');
      setFeedback('Talep reddedildi.');
      await loadData();
    } catch (err: any) {
      setFeedback(err.message || 'Hata oluştu.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Ödül ve talep envanteri yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-amber-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            Ödül Envanteri & Onay
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Ödüller & Talep Masası
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
            Mahfaza ödül vitrinini düzenleyin ve öğrenci taleplerini atomik olarak işleyin.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Yeni Ödül Ekle
        </Button>
      </div>

      {feedback && (
        <div className="p-3 rounded bg-zinc-900 border border-zinc-750 text-xs text-amber-400 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rewards Grid */}
      <Card title="Vitrin Ödülleri" subtitle="Öğrencilerin görüntülediği aktif ödül listesi">
        {rewards.length === 0 ? (
          <EmptyState
            title="Ödül Bulunmuyor"
            description="Henüz bir ödül eklenmemiş."
            actionText="Ödül Ekle"
            onAction={() => setCreateModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewards.map((r) => (
              <div key={r.id} className="p-3.5 rounded bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-400 capitalize">{r.category}</span>
                    <Badge variant={r.rarity === 'legendary' ? 'amber' : 'neutral'}>
                      {(r.rarity || 'Standart').toUpperCase()}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-100">{r.title}</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{r.description}</p>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-850 flex items-center justify-between font-mono text-xs">
                  <span className="text-amber-400 font-bold">{r.xp_price} XP</span>
                  <span className="text-zinc-500 text-[10px]">
                    {r.stock !== null ? `Stok: ${r.stock}` : 'Sınırsız'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Requests Management Table */}
      <Card
        title="Tüm Ödül Talepleri"
        subtitle="Öğrenciler tarafından iletilen geçmiş ve bekleyen talepler"
      >
        {requests.length === 0 ? (
          <EmptyState
            title="Talep Kaydı Yok"
            description="Henüz hiçbir öğrenci ödül talebinde bulunmadı."
            icon={<Gift className="w-6 h-6 text-zinc-500" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 text-zinc-500 font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Öğrenci</th>
                  <th className="py-2.5 px-3">Ödül</th>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">Durum</th>
                  <th className="py-2.5 px-3 text-right">Tutar</th>
                  <th className="py-2.5 px-3 text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-zinc-900/40">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200">
                        {req.student?.first_name} {req.student?.last_name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">{req.student?.email}</div>
                    </td>
                    <td className="py-3 px-3 text-zinc-200 font-medium">{req.reward?.title}</td>
                    <td className="py-3 px-3 text-zinc-400 font-mono">
                      {new Date(req.requested_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : 'Bekliyor'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                      {req.reward?.xp_price} XP
                    </td>
                    <td className="py-3 px-3 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={processingId === req.id}
                            onClick={() => handleReject(req.id)}
                          >
                            Reddet
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={processingId === req.id}
                            onClick={() => handleApprove(req.id)}
                          >
                            Onayla
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">İşlendi</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: New Reward */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yeni Vitrin Ödülü Ekle"
        subtitle="Mahfaza ödül vitrinine yeni bir ayrıcalık veya ürün ekleyin"
        maxWidth="md"
      >
        <form onSubmit={handleCreateReward} className="space-y-4 text-xs">
          <Input
            label="Ödül Başlığı"
            required
            placeholder="Örn: 1-e-1 Danışmanlık Seansı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Açıklama</label>
            <textarea
              rows={3}
              required
              placeholder="Ödülün kapsamı ve kullanım koşulları..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kategori"
              value={category}
              onChange={(e) => setCategory(e.target.value as RewardCategory)}
              options={[
                { value: 'mahfaza', label: '🏛️ Mahfaza' },
                { value: 'digital', label: '🎧 Dijital' },
                { value: 'academic', label: '📚 Akademik' },
                { value: 'legendary', label: '👑 Efsanevi' },
              ]}
            />
            <Select
              label="Nadirlik"
              value={rarity}
              onChange={(e) => setRarity(e.target.value as RewardRarity)}
              options={[
                { value: 'common', label: 'Yaygın (Common)' },
                { value: 'uncommon', label: 'Sıradışı (Uncommon)' },
                { value: 'rare', label: 'Nadir (Rare)' },
                { value: 'epic', label: 'Destansı (Epic)' },
                { value: 'legendary', label: 'Efsanevi (Legendary)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="XP Fiyatı"
              type="number"
              min={1}
              required
              value={xpPrice}
              onChange={(e) => setXpPrice(Number(e.target.value))}
            />
            <Input
              label="Stok Adedi (Boş = Sınırsız)"
              type="number"
              min={0}
              placeholder="Sınırsız"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              İptal
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={savingReward}>
              Ödülü Kaydet
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
