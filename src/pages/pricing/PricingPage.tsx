import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { SubscriptionPlan, UserSubscription } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  Check,
  Zap,
  ShieldCheck,
  Building,
  GraduationCap,
  Briefcase,
  Mail,
  CheckCircle2,
} from 'lucide-react';

type MainSection = 'students' | 'professionals' | 'institutions';
type ProfessionalRoleTab = 'teacher' | 'coach' | 'counselor';

export const PricingPage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(ALL_COMMERCIAL_PLANS);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigations & Toggles
  const [activeSection, setActiveSection] = useState<MainSection>('students');
  const [activeProfTab, setActiveProfTab] = useState<ProfessionalRoleTab>('teacher');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Direct package selection states
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedPlans, sub] = await Promise.all([
        subscriptionService.getPlans(),
        user?.id ? subscriptionService.getUserSubscription(user.id) : null,
      ]);
      if (fetchedPlans && fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
      }
      if (sub) {
        setUserSubscription(sub);
      }
    } catch (err) {
      console.error('Error loading plans:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Direct package activation without requiring external payment gateway
  const handleSelectPackage = async (plan: SubscriptionPlan) => {
    if (!user?.id) {
      setFeedbackMessage(`'${plan.name}' paketini seçebilmek için lütfen giriş yapın.`);
      return;
    }

    setSelectingPlanId(plan.id);
    setFeedbackMessage(null);
    try {
      const updatedSub = await subscriptionService.requestPlanChange(user.id, plan.id);
      setUserSubscription(updatedSub);
      await refreshProfile();
      setFeedbackMessage(`Paketiniz başarıyla güncellendi! Aktif Paket: ${plan.name}`);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Paket güncellenirken bir hata oluştu.');
    } finally {
      setSelectingPlanId(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    setCancelling(true);
    setFeedbackMessage(null);
    try {
      await subscriptionService.cancelSubscription(user.id);
      await loadData();
      await refreshProfile();
      setFeedbackMessage('Aboneliğiniz Başlangıç (Ücretsiz) planına döndürüldü.');
    } catch (err: any) {
      setFeedbackMessage(err.message || 'İptal işlemi gerçekleştirilemedi.');
    } finally {
      setCancelling(false);
    }
  };

  const currentPlanId = userSubscription?.plan_id || profile?.package || 'free';

  // Filter plans according to selected section & tab
  const displayedPlans = useMemo(() => {
    if (activeSection === 'students') {
      return plans.filter((p) => p.category === 'student');
    }
    if (activeSection === 'professionals') {
      return plans.filter((p) => p.category === activeProfTab);
    }
    return [];
  }, [plans, activeSection, activeProfTab]);

  if (loading) {
    return <LoadingState message="Abonelik ve ticari lisans paketleri yükleniyor..." />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 bg-slate-50 text-gray-800">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto pt-2">
        <span className="text-xs font-mono text-amber-700 font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
          Ticari Plan & Yetkilendirme Masası
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mt-3">
          Mahfaza.co Akademik & Profesyonel Planlar
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-2">
          Öğrenciler için sınav disiplini, eğitim profesyonelleri ve kurumlar için yüksek kapasiteli yönetim araçları.
        </p>

        {/* Section Tabs: Students, Professionals, Institutions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveSection('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'students'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Öğrenciler
          </button>

          <button
            onClick={() => setActiveSection('professionals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'professionals'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Eğitim Profesyonelleri
          </button>

          <button
            onClick={() => setActiveSection('institutions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'institutions'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-slate-50'
            }`}
          >
            <Building className="w-4 h-4" />
            Kurumlar & Okullar
          </button>
        </div>

        {/* Sub-tabs for Professionals */}
        {activeSection === 'professionals' && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setActiveProfTab('teacher')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeProfTab === 'teacher'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              Öğretmen
            </button>
            <button
              onClick={() => setActiveProfTab('coach')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeProfTab === 'coach'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              Akademik Koç
            </button>
            <button
              onClick={() => setActiveProfTab('counselor')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeProfTab === 'counselor'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              Rehberlik & Psikolojik Danışman
            </button>
          </div>
        )}

        {/* Monthly / Yearly Toggle */}
        {activeSection !== 'institutions' && (
          <div className="inline-flex items-center p-1 bg-white border border-gray-200 rounded-xl mt-5 shadow-2xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Aylık Ödeme
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Yıllık Ödeme</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-mono">
                ~2 Ay Kazanç
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Real Database Membership State Banner */}
      {userSubscription && (
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">Mevcut Aktif Planınız:</span>
                <span className="text-sm font-bold text-gray-900">
                  {userSubscription.plan?.name || 'Başlangıç (Ücretsiz)'}
                </span>
                <Badge variant="success">Aktif</Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Seçtiğiniz paket hesabınıza anında tanımlanır ve profilinizde aktif olarak görünür.
              </p>
            </div>
          </div>

          {currentPlanId !== 'free' && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={cancelling}
              onClick={handleCancelSubscription}
            >
              Ücretsiz Plana Dön
            </Button>
          )}
        </div>
      )}

      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-center gap-2 max-w-lg mx-auto shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* SECTION 1 & 2: PLANS GRID */}
      {activeSection !== 'institutions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayedPlans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isFeatured =
              plan.id === 'pro' || plan.id === 'coach_pro' || plan.id === 'teacher_pro';
            const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
            const fullYearlyCost = plan.monthly_price * 12;
            const savings = fullYearlyCost - plan.yearly_price;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative bg-white ${
                  isCurrent
                    ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/15 shadow-md'
                    : isFeatured
                    ? 'border-2 border-amber-500 shadow-md'
                    : 'border border-gray-200 hover:border-gray-300 shadow-xs'
                }`}
              >
                {isCurrent ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                    Aktif Paket
                  </div>
                ) : (
                  isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                      Önerilen Paket
                    </div>
                  )
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                    {isCurrent && <Badge variant="success">Mevcut Planınız</Badge>}
                  </div>

                  <p className="text-xs text-gray-600 mb-4 min-h-[32px]">{plan.description}</p>

                  {/* Student Capacity (if professional plan) */}
                  {plan.student_capacity && (
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-gray-200 text-[11px] font-mono text-amber-800 flex items-center justify-between">
                      <span>Öğrenci Kapasitesi:</span>
                      <span className="font-bold">{plan.student_capacity} Öğrenci</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-5 pb-5 border-b border-gray-200">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900 font-mono">
                        {price === 0 ? 'Ücretsiz' : `${price.toLocaleString('tr-TR')} ₺`}
                      </span>
                      {price > 0 && (
                        <span className="text-xs text-gray-500 font-mono">
                          /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && price > 0 && savings > 0 && (
                      <span className="text-[11px] text-emerald-700 font-semibold font-mono block mt-1">
                        Yıllık {savings.toLocaleString('tr-TR')} ₺ tasarruf
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-6">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                      Dahil Edilen Yetkiler
                    </span>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-gray-100">
                  {isCurrent ? (
                    <div className="space-y-2">
                      <Button variant="secondary" size="md" className="w-full" disabled>
                        Mevcut Planınız (Aktif)
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant={isFeatured ? 'primary' : 'secondary'}
                      size="md"
                      className="w-full"
                      isLoading={selectingPlanId === plan.id}
                      disabled={selectingPlanId !== null}
                      onClick={() => handleSelectPackage(plan)}
                    >
                      {plan.monthly_price === 0 ? 'Ücretsiz Plana Geç' : 'Bu Paketi Seç'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 3: INSTITUTIONS & CUSTOM PRICING */}
      {activeSection === 'institutions' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-3xl mx-auto shadow-sm">
          <div className="text-center max-w-lg mx-auto mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
              <Building className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Kurumsal & Okul Lisansları</h2>
            <p className="text-xs text-gray-600 mt-2">
              Kolejler, dershaneler, etüt merkezleri ve belediye eğitim merkezleri için 250+ öğrenci kapasiteli özel lisanslama.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <h4 className="text-xs font-bold text-gray-900">Sınırsız Öğrenci & Şube</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Tüm okul kampüsleriniz ve öğretmen kadronuz için tek merkezden yetkilendirme ve rol denetimi.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <h4 className="text-xs font-bold text-gray-900">Özel Alan Adı & Entegrasyon</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Kurumsal MEB/e-Okul uyumlu karne çıktıları, özel analitik raporları ve API entegrasyonu.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <h4 className="text-xs font-bold text-gray-900">Merkezi Veli İletişimi</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Toplu duyuru, yoklama ve deneme neti SMS/WhatsApp bilgilendirme altyapısı.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
              <h4 className="text-xs font-bold text-gray-900">Özel Müşteri Temsilcisi</h4>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Kurumunuza özel atanmış eğitim teknolojileri uzmanı ve 7/24 öncelikli teknik destek.
              </p>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-gray-200">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={() => setInstitutionModalOpen(true)}
            >
              Kurumsal Teklif ve Sunum İste
            </Button>
          </div>
        </div>
      )}

      {/* Institution Contact Modal */}
      {institutionModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setInstitutionModalOpen(false)}
          title="Kurumsal Teklif ve Sunum Talebi"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Kurumunuza özel öğrenci kapasitesi, özel entegrasyonlar ve fiyat teklifi için talebinizi iletebilirsiniz.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 text-xs text-gray-700 space-y-1.5">
              <div>
                <strong>Kurumsal İletişim:</strong> kurumsal@mahfaza.co
              </div>
              <div>
                <strong>Telefon:</strong> +90 (212) 800 20 26
              </div>
              <div>
                <strong>Adres:</strong> Mahfaza Eğitim Teknolojileri A.Ş., İstanbul
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t border-gray-200">
              <Button variant="primary" size="sm" onClick={() => setInstitutionModalOpen(false)}>
                Anladım
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
