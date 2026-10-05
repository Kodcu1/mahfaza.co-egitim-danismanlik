import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { rewardService } from '../../services/rewardService';
import { relationshipService } from '../../services/relationshipService';
import { xpService } from '../../services/xpService';
import { Reward, RewardRequest, RewardCategory } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  Gift,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BookOpen,
  Award,
  Video,
  Coffee,
  Target,
  AlertCircle,
  Coins,
  Search,
} from 'lucide-react';

export const CoachRewardsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'rewards' | 'requests'>('rewards');

  // Rewards state
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Requests state
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [studentXPMap, setStudentXPMap] = useState<Record<string, number>>({});

  // Reward Create/Edit Modal
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costXP, setCostXP] = useState<number>(200);
  const [category, setCategory] = useState<RewardCategory | string>('Akademik');
  const [icon, setIcon] = useState('Gift');
  const [stock, setStock] = useState<string>(''); // empty string = unlimited
  const [isActive, setIsActive] = useState(true);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  // Approval / Rejection Modal
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RewardRequest | null>(null);
  const [processAction, setProcessAction] = useState<'approve' | 'reject'>('approve');
  const [coachNote, setCoachNote] = useState('');
  const [processSubmitting, setProcessSubmitting] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // 1. Load coach rewards
      const rws = await rewardService.getCoachRewards(user.id);
      setRewards(rws);

      // 2. Load assigned students and their requests
      const assignedStudents = await relationshipService.getCoachAssignedStudents(user.id);
      const studentIds = assignedStudents.map((s) => s.id);

      if (studentIds.length > 0) {
        const reqs = await rewardService.getCoachPendingRequests(studentIds);
        setRequests(reqs);

        // Load XP for each student with pending requests
        const xpMap: Record<string, number> = {};
        for (const sId of studentIds) {
          const xp = await xpService.getStudentXP(sId);
          xpMap[sId] = xp?.wallet_xp || 0;
        }
        setStudentXPMap(xpMap);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error('Error loading coach rewards data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingRewardId(null);
    setTitle('');
    setDescription('');
    setCostXP(200);
    setCategory('Akademik');
    setIcon('Gift');
    setStock('');
    setIsActive(true);
    setRewardError(null);
    setRewardModalOpen(true);
  };

  const handleOpenEditModal = (r: Reward) => {
    setEditingRewardId(r.id);
    setTitle(r.title);
    setDescription(r.description);
    setCostXP(r.cost_xp || r.xp_price || 100);
    setCategory(r.category);
    setIcon(r.icon || 'Gift');
    setStock(r.stock !== null ? String(r.stock) : '');
    setIsActive(r.is_active);
    setRewardError(null);
    setRewardModalOpen(true);
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setRewardError('Ödül başlığı zorunludur.');
      return;
    }
    if (!costXP || costXP <= 0) {
      setRewardError('Gereken XP 0\'dan büyük olmalıdır.');
      return;
    }

    setRewardSubmitting(true);
    setRewardError(null);

    const stockVal = stock.trim() === '' ? null : Math.max(0, parseInt(stock) || 0);

    try {
      if (editingRewardId) {
        await rewardService.updateReward(editingRewardId, {
          title: title.trim(),
          description: description.trim(),
          cost_xp: costXP,
          category,
          icon,
          stock: stockVal,
          is_active: isActive,
        });
      } else {
        await rewardService.createReward({
          coach_id: user?.id,
          title: title.trim(),
          description: description.trim(),
          cost_xp: costXP,
          xp_price: costXP,
          category,
          icon,
          stock: stockVal,
          is_active: isActive,
        });
      }

      await loadData();
      setRewardModalOpen(false);
    } catch (err: any) {
      setRewardError(err.message || 'Ödül kaydedilirken bir hata oluştu.');
    } finally {
      setRewardSubmitting(false);
    }
  };

  const handleToggleStatus = async (r: Reward) => {
    try {
      await rewardService.updateReward(r.id, { is_active: !r.is_active });
      await loadData();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteReward = async (rewardId: string, rewardTitle: string) => {
    if (!window.confirm(`'${rewardTitle}' ödülünü silmek istediğinize emin misiniz?`)) return;
    try {
      await rewardService.deleteReward(rewardId);
      await loadData();
    } catch (err) {
      console.error('Error deleting reward:', err);
    }
  };

  const handleProcessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (processAction === 'reject' && !coachNote.trim()) {
      setProcessError('Talebi reddederken gerekçe belirtmek zorunludur.');
      return;
    }

    setProcessSubmitting(true);
    setProcessError(null);

    try {
      if (processAction === 'approve') {
        await rewardService.approveRewardAtomic(
          selectedRequest.id,
          coachNote.trim() || 'Koç tarafından onaylandı.'
        );
      } else {
        await rewardService.rejectRewardRequest(selectedRequest.id, coachNote.trim());
      }

      await loadData();
      setProcessModalOpen(false);
      setSelectedRequest(null);
      setCoachNote('');
    } catch (err: any) {
      setProcessError(err.message || 'İşlem gerçekleştirilemedi.');
    } finally {
      setProcessSubmitting(false);
    }
  };

  const filteredRewards = rewards.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? r.is_active
        : !r.is_active;
    return matchesSearch && matchesStatus;
  });

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  if (loading) {
    return <LoadingState message="Ödül yönetimi yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              Koçluk Ekosistemi
            </span>
            <span className="text-zinc-600">&bull;</span>
            <span className="text-xs font-mono text-zinc-400">Ödül Merkezi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            Ödül Yönetimi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Öğrencilerinizin kazandığı XP puanlarını harcayabileceği ödülleri tanımlayın ve talepleri onaylayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
          >
            Yeni Ödül Tanımla
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'rewards'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <Gift className="w-4 h-4" />
          Tanımlı Ödüller ({rewards.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <Coins className="w-4 h-4" />
          Öğrenci Talepleri
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: REWARDS INVENTORY */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Ödül ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'active', 'inactive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded transition-colors font-medium cursor-pointer ${
                    statusFilter === st
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {st === 'all' ? 'Tümü' : st === 'active' ? 'Aktif' : 'Pasif'}
                </button>
              ))}
            </div>
          </div>

          {filteredRewards.length === 0 ? (
            <EmptyState
              title="Tanımlı Ödül Bulunamadı"
              description="Arama kriterlerinize uygun veya tanımlanmış bir ödül bulunmuyor. Yeni bir ödül oluşturmak için yukarıdaki butonu kullanın."
              icon={<Gift className="w-8 h-8 text-zinc-600" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-colors ${
                    reward.is_active
                      ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                      : 'bg-zinc-950/50 border-zinc-850 opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {reward.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge variant={reward.is_active ? 'success' : 'neutral'}>
                          {reward.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-100">{reward.title}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {reward.description || 'Açıklama belirtilmedi.'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold font-mono text-amber-400">
                        {reward.cost_xp || reward.xp_price} XP
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {reward.stock !== null ? `Stok: ${reward.stock}` : 'Sınırsız Stok'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleStatus(reward)}
                        title={reward.is_active ? 'Pasife Al' : 'Aktif Yap'}
                      >
                        {reward.is_active ? 'Durdur' : 'Aktif Et'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEditModal(reward)}
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReward(reward.id, reward.title)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING / ALL REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <EmptyState
              title="Ödül Talebi Bulunmuyor"
              description="Öğrencileriniz ödül mağazasından talepte bulunduğunda burada listelenecektir."
              icon={<Coins className="w-8 h-8 text-zinc-600" />}
            />
          ) : (
            <div className="divide-y divide-zinc-850 border border-zinc-800 rounded-xl bg-zinc-900/60 overflow-hidden">
              {requests.map((req) => {
                const studentName = req.student
                  ? `${req.student.first_name || ''} ${req.student.last_name || ''}`.trim()
                  : 'Öğrenci';
                const currentWallet = studentXPMap[req.student_id] ?? 0;
                const cost = Number(req.cost_xp || req.reward?.cost_xp || req.reward?.xp_price || 0);
                const hasSufficient = currentWallet >= cost;

                return (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-850/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-100">{studentName}</span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-xs text-amber-400 font-semibold">
                          {req.reward?.title || 'Ödül'}
                        </span>
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
                            : 'Onay Bekliyor'}
                        </Badge>
                      </div>

                      <div className="text-xs text-zinc-400 flex items-center gap-3 font-mono">
                        <span>Gereken: {cost} XP</span>
                        <span>Mevcut Cüzdan: {currentWallet} XP</span>
                        <span>
                          Tarih: {new Date(req.requested_at).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {req.coach_notes && (
                        <p className="text-xs text-zinc-400 italic mt-1">
                          Not: "{req.coach_notes}"
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
                          onClick={() => {
                            setSelectedRequest(req);
                            setProcessAction('reject');
                            setCoachNote('');
                            setProcessError(null);
                            setProcessModalOpen(true);
                          }}
                        >
                          Reddet
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          disabled={!hasSufficient}
                          title={!hasSufficient ? 'Öğrencinin bakiyesi yetersiz' : undefined}
                          onClick={() => {
                            setSelectedRequest(req);
                            setProcessAction('approve');
                            setCoachNote('Koç tarafından onaylandı. Tebrikler!');
                            setProcessError(null);
                            setProcessModalOpen(true);
                          }}
                        >
                          Onayla (-{cost} XP)
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT REWARD MODAL */}
      <Modal
        isOpen={rewardModalOpen}
        onClose={() => setRewardModalOpen(false)}
        title={editingRewardId ? 'Ödülü Düzenle' : 'Yeni Ödül Tanımla'}
      >
        <form onSubmit={handleSaveReward} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Ödül Başlığı</label>
            <Input
              type="text"
              placeholder="Örn: 1-e-1 Özel Soru Çözüm Seansı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">Ödül Açıklaması</label>
            <textarea
              placeholder="Öğrencinin bu ödülle ne kazanacağını açıklayın..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-20 p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Gereken XP Puanı</label>
              <Input
                type="number"
                min="10"
                max="10000"
                step="10"
                value={costXP}
                onChange={(e) => setCostXP(Math.max(10, parseInt(e.target.value) || 0))}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="Akademik">Akademik</option>
                <option value="Seans">Birebir Seans</option>
                <option value="Motivasyon">Motivasyon</option>
                <option value="Materyal">Ders Materyali / Kitap</option>
                <option value="Genel">Genel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Stok Adedi (Boş = Sınırsız)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="Sınırsız için boş bırakın"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="text-xs font-medium text-zinc-300 block mb-1">Ödül Durumu</label>
              <div className="flex items-center gap-2 h-9">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-800 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="text-xs text-zinc-200 cursor-pointer">
                  Öğrenci mağazasında aktif göster
                </label>
              </div>
            </div>
          </div>

          {rewardError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {rewardError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
            <Button variant="secondary" size="sm" type="button" onClick={() => setRewardModalOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={rewardSubmitting}>
              {editingRewardId ? 'Güncellemeleri Kaydet' : 'Ödülü Yayınla'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* APPROVE / REJECT REQUEST MODAL */}
      <Modal
        isOpen={processModalOpen}
        onClose={() => setProcessModalOpen(false)}
        title={processAction === 'approve' ? 'Ödül Talebini Onayla' : 'Ödül Talebini Reddet'}
      >
        <form onSubmit={handleProcessRequest} className="space-y-4">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-400">Öğrenci:</span>
              <span className="text-zinc-100 font-semibold">
                {selectedRequest?.student?.first_name} {selectedRequest?.student?.last_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Ödül:</span>
              <span className="text-amber-400 font-semibold">
                {selectedRequest?.reward?.title}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-zinc-400">Düşülecek XP:</span>
              <span className="text-zinc-100 font-bold">
                -{selectedRequest?.cost_xp || selectedRequest?.reward?.cost_xp} XP
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              {processAction === 'approve' ? 'Öğrenciye Mesaj / Not (Opsiyonel)' : 'Ret Gerekçesi (Zorunlu)'}
            </label>
            <textarea
              value={coachNote}
              onChange={(e) => setCoachNote(e.target.value)}
              placeholder={
                processAction === 'approve'
                  ? 'Tebrikler! Seans tarihi için mesajla iletişime geçeceğiz...'
                  : 'Yetersiz çalışma performansı nedeniyle bu hafta ödül kullanılamaz...'
              }
              className="w-full h-20 p-2.5 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              required={processAction === 'reject'}
            />
          </div>

          {processError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {processError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
            <Button variant="secondary" size="sm" type="button" onClick={() => setProcessModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant={processAction === 'approve' ? 'primary' : 'danger'}
              size="sm"
              type="submit"
              isLoading={processSubmitting}
            >
              {processAction === 'approve' ? 'Onayla ve XP Düş' : 'Talebi Reddet'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
