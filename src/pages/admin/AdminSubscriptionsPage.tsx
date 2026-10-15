import React, { useState, useEffect, useCallback } from 'react';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { relationshipService } from '../../services/relationshipService';
import { Profile, SubscriptionPlan, SubscriptionPlanId, SubscriptionStatus, UserSubscription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  Search,
  Edit,
  Save,
  CheckCircle2,
  Coins,
  Tag,
  RefreshCw,
} from 'lucide-react';

export const AdminSubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(ALL_COMMERCIAL_PLANS);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSubs, setUserSubs] = useState<Record<string, UserSubscription>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Dynamic Pricing Editor State
  const [priceEdits, setPriceEdits] = useState<Record<string, { monthly: string; yearly: string }>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [priceFeedback, setPriceFeedback] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'student' | 'coach' | 'teacher' | 'counselor'>('student');

  // Edit User Subscription Modal State
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

      // Initialize price edit fields
      const initialEdits: Record<string, { monthly: string; yearly: string }> = {};
      planList.forEach((p) => {
        initialEdits[p.id] = {
          monthly: String(p.monthly_price),
          yearly: String(p.yearly_price),
        };
      });
      setPriceEdits(initialEdits);

      const subMap: Record<string, UserSubscription> = {};
      for (const u of allUsers.slice(0, 50)) {
        const s = await subscriptionService.getUserSubscription(u.id);
        subMap[u.id] = s;
      }
      setUserSubs(subMap);
    } catch (err) {
      console.warn('Subscription admin data notice:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePriceInputChange = (planId: string, field: 'monthly' | 'yearly', val: string) => {
    setPriceEdits((prev) => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || { monthly: '0', yearly: '0' }),
        [field]: val,
      },
    }));
  };

  const handleSavePlanPrice = async (plan: SubscriptionPlan) => {
    const edited = priceEdits[plan.id];
    if (!edited) return;

    const monthlyVal = Math.max(0, Number(edited.monthly) || 0);
    const yearlyVal = Math.max(0, Number(edited.yearly) || 0);

    setSavingPriceId(plan.id);
    setPriceFeedback(null);

    try {
      await subscriptionService.updateSystemPackagePrice(plan.id, monthlyVal, yearlyVal);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id
            ? { ...p, monthly_price: monthlyVal, yearly_price: yearlyVal }
            : p
        )
      );
      setPriceFeedback(
        `'${plan.name}' paket fiyatı güncellendi (${monthlyVal.toLocaleString('tr-TR')} ₺/ay — ${yearlyVal.toLocaleString('tr-TR')} ₺/yıl).`
      );
    } catch (err: any) {
      setPriceFeedback(err.message || 'Fiyat güncellenirken hata oluştu.');
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleOpenEdit = (u: Profile) => {
    setSelectedUser(u);
    const currentSub = userSubs[u.id];
    setSelectedPlanId((currentSub?.plan_id || u.package || u.subscription_plan || 'free') as SubscriptionPlanId);
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
      setFeedback('Kullanıcı abonelik paketi başarıyla güncellendi ve yetkilendirildi.');
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

  const filteredPlans = plans.filter((p) => p.category === activeCategoryFilter);

  if (loading) {
    return <LoadingState message="Abonelik ve dinamik fiyat yönetim masası yükleniyor..." />;
  }

  return (
    <div className="space-y-6 bg-slate-50 text-gray-800 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs font-mono text-amber-600 font-bold uppercase tracking-wider">
            Finans, Dinamik Fiyatlandırma & Lisanslama
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-0.5">
            Fiyat Yönetimi & Abonelik Masası
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            2026 paket fiyatlarını dinamik olarak güncelleyin ve kullanıcıların paket seviyelerini yönetin.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={loadData}
        >
          Verileri Yenile
        </Button>
      </div>

      {priceFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{priceFeedback}</span>
        </div>
      )}

      {/* SECTION 1: DYNAMIC PRICING EDITOR (FİYAT YÖNETİMİ) */}
      <Card
        title="Dinamik Paket Fiyat Yönetimi (2026)"
        subtitle="Buradan değiştirdiğiniz aylık ve yıllık fiyatlar Üyelik Paketleri sayfasında anında yayınlanır."
        action={
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'student', label: 'Öğrenci Paketleri' },
                { key: 'coach', label: 'Koç Paketleri' },
                { key: 'teacher', label: 'Öğretmen' },
                { key: 'counselor', label: 'Rehberlik' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveCategoryFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeCategoryFilter === tab.key
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-slate-100 text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredPlans.map((p) => {
            const editState = priceEdits[p.id] || {
              monthly: String(p.monthly_price),
              yearly: String(p.yearly_price),
            };

            return (
              <div
                key={p.id}
                className="bg-slate-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      {p.name}
                    </span>
                    <Badge variant="amber">{p.id}</Badge>
                  </div>
                  <p className="text-[11px] text-gray-600 line-clamp-2 mt-1 min-h-[30px]">
                    {p.description}
                  </p>

                  <div className="space-y-3 mt-4 pt-3 border-t border-gray-200">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1">
                        Aylık Fiyat (₺)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          disabled={p.id === 'free'}
                          value={editState.monthly}
                          onChange={(e) => handlePriceInputChange(p.id, 'monthly', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-amber-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-gray-400">
                          ₺ / ay
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-500 font-bold mb-1">
                        Yıllık Fiyat (₺)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          disabled={p.id === 'free'}
                          value={editState.yearly}
                          onChange={(e) => handlePriceInputChange(p.id, 'yearly', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-800 focus:outline-none focus:border-amber-500 disabled:bg-gray-100 disabled:text-gray-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-gray-400">
                          ₺ / yıl
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  variant={p.id === 'free' ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  disabled={p.id === 'free'}
                  isLoading={savingPriceId === p.id}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                  onClick={() => handleSavePlanPrice(p)}
                >
                  {p.id === 'free' ? 'Sabit Ücretsiz Plan' : 'Fiyatı Kaydet'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* SECTION 2: USER SUBSCRIPTIONS & HIERARCHICAL PACKAGE MANAGEMENT */}
      <Card
        title="Kullanıcı Paket & Lisans Atama Masası"
        subtitle="Herhangi bir öğrenci veya koçun paketini manuel olarak Başlangıç, Standart, Pro veya Premium VIP seviyesine yükseltin"
        action={
          <div className="w-64">
            <Input
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-gray-400" />}
            />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-slate-50 text-gray-600 font-semibold text-[10px] border-b border-gray-200 uppercase">
              <tr>
                <th className="py-3 px-4">Kullanıcı</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Aktif Paket</th>
                <th className="py-3 px-4">Yıllık Bedel</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-right">Hızlı Paket Değiştir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((u) => {
                const sub = userSubs[u.id];
                const resolvedPlanId = sub?.plan_id || u.package || u.subscription_plan || 'free';
                const planObj =
                  plans.find((p) => p.id === resolvedPlanId) ||
                  plans.find((p) => p.id === 'free')!;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-mono text-[11px] text-gray-600">{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          resolvedPlanId === 'premium' || resolvedPlanId === 'pro'
                            ? 'amber'
                            : resolvedPlanId === 'standard'
                            ? 'success'
                            : 'neutral'
                        }
                      >
                        {planObj.name}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                      {planObj.yearly_price === 0
                        ? 'Ücretsiz'
                        : `${planObj.yearly_price.toLocaleString('tr-TR')} ₺/yıl`}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={sub?.status === 'active' ? 'success' : 'neutral'}>
                        {sub?.status || 'active'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Edit className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenEdit(u)}
                      >
                        Paket Ata / Yükselt
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
          title={`Paket Ata: ${selectedUser.first_name} ${selectedUser.last_name}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSaveSubscription} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs border font-medium ${
                  feedback.includes('başarıyla')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {feedback}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Yeni Abonelik Paketi Seçin
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value as SubscriptionPlanId)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-amber-500 font-semibold"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.yearly_price === 0 ? 'Ücretsiz' : `${p.yearly_price.toLocaleString('tr-TR')} ₺/yıl`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lisans Durumu</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as SubscriptionStatus)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:border-amber-500"
              >
                <option value="active">Aktif (Active)</option>
                <option value="past_due">Ödeme Bekliyor (Past Due)</option>
                <option value="cancelled">İptal Edildi (Cancelled)</option>
                <option value="trialing">Deneme Sürecinde (Trialing)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
                Vazgeç
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={saving} leftIcon={<Coins className="w-3.5 h-3.5" />}>
                Paketi Tanımla
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

