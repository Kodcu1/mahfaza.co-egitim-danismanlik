import React, { useState, useEffect, useCallback } from 'react';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { relationshipService } from '../../services/relationshipService';
import { Profile, SubscriptionPlan, SubscriptionPlanId, SubscriptionStatus, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, LoadingState } from '../../components/ui/EmptyState';
import {
  CreditCard,
  Search,
  User,
  CheckCircle2,
  Edit,
  ShieldCheck,
  Calendar,
  Users,
} from 'lucide-react';

export const AdminSubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(ALL_COMMERCIAL_PLANS);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSubs, setUserSubs] = useState<Record<string, UserSubscription>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>('free');
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>('active');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [planList, allUsers] = await Promise.all([
        subscriptionService.getPlans(),
        relationshipService.getAllUsersAdmin(),
      ]);
      setPlans(planList);
      setUsers(allUsers);

      const subMap: Record<string, UserSubscription> = {};
      for (const u of allUsers.slice(0, 50)) {
        const s = await subscriptionService.getUserSubscription(u.id);
        subMap[u.id] = s;
      }
      setUserSubs(subMap);
    } catch (err) {
      console.error('Error loading subscription administration data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEdit = (u: Profile) => {
    setSelectedUser(u);
    const currentSub = userSubs[u.id];
    setSelectedPlanId(currentSub?.plan_id || 'free');
    setSelectedStatus(currentSub?.status || 'active');
    setFeedback(null);
    setEditModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setFeedback(null);

    try {
      await subscriptionService.adminUpdateUserSubscription(
        selectedUser.id,
        selectedPlanId,
        selectedStatus
      );
      setFeedback('Kullanıcı abonelik durumu başarıyla güncellendi.');
      await loadData();
      setTimeout(() => {
        setEditModalOpen(false);
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback(err.message || 'Güncelleme gerçekleştirilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <LoadingState message="Abonelik ve üyelik yönetim masası yükleniyor..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Finans & Lisanslama
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-0.5">
            Abonelik & Plan Yönetimi
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kullanıcıların aktif abonelik planlarını, limitlerini ve lisans durumlarını denetleyin.
          </p>
        </div>
      </div>

      {/* Plan Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-zinc-200">{p.name}</span>
              <span className="text-[10px] font-mono text-amber-400">
                {p.monthly_price === 0 ? 'Ücretsiz' : `${p.monthly_price} ₺/ay`}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{p.description}</p>
          </div>
        ))}
      </div>

      {/* User Subscriptions Table */}
      <Card
        title="Kullanıcı Lisans Listesi"
        subtitle="Platform üyelerinin güncel paket ve lisans durumları"
        action={
          <div className="w-64">
            <Input
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-zinc-500" />}
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 font-mono text-[10px] border-b border-zinc-800 uppercase">
              <tr>
                <th className="py-2.5 px-3">Kullanıcı</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3">Aktif Plan</th>
                <th className="py-2.5 px-3">Abonelik Durumu</th>
                <th className="py-2.5 px-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredUsers.map((u) => {
                const sub = userSubs[u.id];
                const planName =
                  plans.find((p) => p.id === sub?.plan_id)?.name || 'Başlangıç (Ücretsiz)';

                return (
                  <tr key={u.id} className="hover:bg-zinc-850/40 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-zinc-200">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-[11px] text-zinc-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-mono text-[11px] text-zinc-400">{u.role}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-amber-400 font-mono">{planName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={sub?.status === 'active' ? 'success' : 'neutral'}>
                        {sub?.status || 'active'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(u)}
                      >
                        Plan Değiştir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      {editModalOpen && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditModalOpen(false)}
          title={`Abonelik Düzenle: ${selectedUser.first_name} ${selectedUser.last_name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveSubscription} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded text-xs border ${
                  feedback.includes('başarıyla')
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Abonelik Planı</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value as SubscriptionPlanId)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.monthly_price === 0 ? 'Ücretsiz' : `${p.monthly_price} ₺/ay`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Durum</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SubscriptionStatus)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                <option value="active">Aktif (Active)</option>
                <option value="past_due">Ödeme Bekliyor (Past Due)</option>
                <option value="cancelled">İptal Edildi (Cancelled)</option>
                <option value="trialing">Deneme Sürecinde (Trialing)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
                Vazgeç
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={saving}>
                Kaydet
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
