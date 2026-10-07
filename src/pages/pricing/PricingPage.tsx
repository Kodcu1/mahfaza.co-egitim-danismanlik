import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { subscriptionService, ALL_COMMERCIAL_PLANS } from '../../services/subscriptionService';
import { SubscriptionPlan, UserSubscription, SubscriptionCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/EmptyState';
import {
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Building,
  GraduationCap,
  Users,
  Target,
  Briefcase,
  ClipboardList,
  Sparkles,
  Lock,
  ArrowRight,
  Mail,
} from 'lucide-react';

type MainSection = 'students' | 'professionals' | 'institutions';
type ProfessionalRoleTab = 'teacher' | 'coach' | 'counselor';

export const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(ALL_COMMERCIAL_PLANS);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigations & Toggles
  const [activeSection, setActiveSection] = useState<MainSection>('students');
  const [activeProfTab, setActiveProfTab] = useState<ProfessionalRoleTab>('teacher');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Modal & Feedback
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
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

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    setCancelling(true);
    setFeedbackMessage(null);
    try {
      await subscriptionService.cancelSubscription(user.id);
      setFeedbackMessage('Aboneliğiniz dönem sonunda yenilenmeyecek şekilde iptal edildi.');
      await loadData();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'İptal işlemi gerçekleştirilemedi.');
    } finally {
      setCancelling(false);
    }
  };

  const currentPlanId = userSubscription?.plan_id || 'free';

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
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto pt-2">
        <span className="text-xs font-mono text-amber-400 uppercase tracking-widest px-3 py-1 rounded bg-amber-500/10 border border-amber-500/20">
          Ticari Plan & Yetkilendirme Masası
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight mt-3">
          Mahfaza.co Akademik & Profesyonel Planlar
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Öğrenciler için sınav disiplini, eğitim profesyonelleri ve kurumlar için yüksek kapasiteli yönetim araçları.
        </p>

        {/* Section Tabs: Students, Professionals, Institutions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setActiveSection('students')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'students'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Öğrenciler
          </button>

          <button
            onClick={() => setActiveSection('professionals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'professionals'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Eğitim Profesyonelleri
          </button>

          <button
            onClick={() => setActiveSection('institutions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSection === 'institutions'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
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
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeProfTab === 'teacher'
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Öğretmen
            </button>
            <button
              onClick={() => setActiveProfTab('coach')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeProfTab === 'coach'
                  ? 'bg-zinc-800 text-purple-400 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Akademik Koç
            </button>
            <button
              onClick={() => setActiveProfTab('counselor')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeProfTab === 'counselor'
                  ? 'bg-zinc-800 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Rehberlik & Psikolojik Danışman
            </button>
          </div>
        )}

        {/* Monthly / Yearly Toggle (Calculated from real values) */}
        {activeSection !== 'institutions' && (
          <div className="inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-lg mt-5 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-zinc-800 text-amber-400 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Aylık Ödeme
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-zinc-800 text-amber-400 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Yıllık Ödeme</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                ~2 Ay Kazanç
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Real Database Membership State Banner */}
      {userSubscription && (
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Veritabanındaki Mevcut Planınız:</span>
                <span className="text-sm font-bold text-zinc-100">{userSubscription.plan?.name || 'Başlangıç (Ücretsiz)'}</span>
                <Badge
                  variant={
                    userSubscription.status === 'active'
                      ? 'success'
                      : userSubscription.status === 'trialing'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {userSubscription.status === 'active'
                    ? 'Aktif'
                    : userSubscription.status === 'trialing'
                    ? 'Aktivasyon / Ödeme Bekleniyor'
                    : 'İptal Edildi'}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Kaynak: Supabase `subscriptions` tablosu (RLS yetkilendirmeli gerçek zamanlı durum).
              </p>
            </div>
          </div>

          {userSubscription.plan_id !== 'free' && userSubscription.status === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={cancelling}
              onClick={handleCancelSubscription}
            >
              Aboneliği İptal Et
            </Button>
          )}
        </div>
      )}

      {feedbackMessage && (
        <div className="p-4 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-300 text-xs text-center max-w-md mx-auto">
          {feedbackMessage}
        </div>
      )}

      {/* SECTION 1 & 2: PLANS GRID */}
      {activeSection !== 'institutions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayedPlans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isFeatured = plan.id === 'pro' || plan.id === 'coach_pro' || plan.id === 'teacher_pro';
            const price = billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
            const fullYearlyCost = plan.monthly_price * 12;
            const savings = fullYearlyCost - plan.yearly_price;

            return (
              <div
                key={plan.id}
                className={`rounded-xl p-6 flex flex-col justify-between transition-all relative ${
                  isFeatured
                    ? 'bg-gradient-to-b from-amber-950/20 to-zinc-900/95 border-2 border-amber-500/50 shadow-xl shadow-amber-500/5'
                    : 'bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                    Önerilen Paket
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-zinc-100">{plan.name}</h3>
                    {isCurrent && <Badge variant="success">Mevcut Planınız</Badge>}
                  </div>

                  <p className="text-xs text-zinc-400 mb-4 min-h-[32px]">{plan.description}</p>

                  {/* Student Capacity (if professional plan) */}
                  {plan.student_capacity && (
                    <div className="mb-3 p-2 rounded bg-zinc-950/60 border border-zinc-800 text-[11px] font-mono text-amber-400 flex items-center justify-between">
                      <span>Öğrenci Kapasitesi:</span>
                      <span className="font-bold">{plan.student_capacity} Öğrenci</span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-5 pb-5 border-b border-zinc-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-zinc-100 font-mono">
                        {price === 0 ? 'Ücretsiz' : `${price.toLocaleString('tr-TR')} ₺`}
                      </span>
                      {price > 0 && (
                        <span className="text-xs text-zinc-500 font-mono">
                          /{billingCycle === 'yearly' ? 'yıl' : 'ay'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && price > 0 && savings > 0 && (
                      <span className="text-[11px] text-emerald-400 font-mono block mt-1">
                        Yıllık {savings.toLocaleString('tr-TR')} ₺ tasarruf
                      </span>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 mb-6">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Dahil Edilen Yetkiler
                    </span>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-zinc-800/80">
                  {isCurrent ? (
                    <div className="space-y-2">
                      <Button variant="secondary" size="md" className="w-full" disabled>
                        Aktif Kullandığınız Plan
                      </Button>
                      {plan.id !== 'free' && (
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="w-full text-center text-[11px] text-zinc-500 hover:text-rose-400 transition-colors py-1"
                        >
                          {cancelling ? 'İptal ediliyor...' : 'Yenilemeyi İptal Et'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant={isFeatured ? 'primary' : 'secondary'}
                      size="md"
                      className="w-full"
                      onClick={() => setSelectedPlanForUpgrade(plan)}
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
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-8 max-w-3xl mx-auto shadow-xl">
          <div className="text-center max-w-lg mx-auto mb-6">
            <Building className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-zinc-100">Kurumsal & Okul Lisansları</h2>
            <p className="text-xs text-zinc-400 mt-2">
              Kolejler, dershaneler, etüt merkezleri ve belediye eğitim merkezleri için 250+ öğrenci kapasiteli özel lisanslama.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-zinc-200">Sınırsız Öğrenci & Şube</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tüm okul kampüsleriniz ve öğretmen kadronuz için tek merkezden yetkilendirme ve rol denetimi.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-zinc-200">Özel Alan Adı & Entegrasyon</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kurumsal MEB/e-Okul uyumlu karne çıktıları, özel analitik raporları ve API entegrasyonu.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-zinc-200">Merkezi Veli İletişimi</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Toplu duyuru, yoklama ve deneme neti SMS/WhatsApp bilgilendirme altyapısı.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-zinc-200">Özel Müşteri Temsilcisi</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kurumunuza özel atanmış eğitim teknolojileri uzmanı ve 7/24 öncelikli teknik destek.
              </p>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-zinc-800">
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

      {/* Upgrade / Payment Safety Modal (Section 15) */}
      {selectedPlanForUpgrade && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPlanForUpgrade(null)}
          title={`Paket Tercihi: ${selectedPlanForUpgrade.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-zinc-200">Seçilen Abonelik</span>
                <Badge variant="warning">{selectedPlanForUpgrade.name}</Badge>
              </div>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {billingCycle === 'yearly'
                  ? `${selectedPlanForUpgrade.yearly_price.toLocaleString('tr-TR')} ₺ / yıl`
                  : `${selectedPlanForUpgrade.monthly_price.toLocaleString('tr-TR')} ₺ / ay`}
              </div>
              <p className="text-xs text-zinc-400 mt-2">{selectedPlanForUpgrade.description}</p>
            </div>

            {/* Truthful Payment Safety Notice (Section 15) */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-2 text-zinc-300">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Ödeme Güvenliği ve Aktivasyon Protokolü</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Mahfaza.co kurumsal ticari lisanslama ilkeleri gereği: Canlı ödeme ağ geçidi (Iyzico / Stripe 3D Secure)
                tahsilatı onaylamadan ücretli planlar hesaba <strong>otomatik olarak sahte bir şekilde tanımlanmaz</strong>.
                Başlangıç (FREE) planımız kesintisiz olarak kullanımınızda kalacaktır.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPlanForUpgrade(null)}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                onClick={async () => {
                  try {
                    if (user?.id) {
                      const updatedSub = await subscriptionService.requestPlanChange(
                        user.id,
                        selectedPlanForUpgrade.id
                      );
                      setUserSubscription(updatedSub);
                      setFeedbackMessage(
                        `'${selectedPlanForUpgrade.name}' paketine geçiş talebiniz veritabanına kaydedildi (${updatedSub.status === 'active' ? 'Aktif' : 'Aktivasyon / Ödeme Bekleniyor'}).`
                      );
                    } else {
                      setFeedbackMessage(
                        `'${selectedPlanForUpgrade.name}' paketine geçiş yapabilmek için lütfen önce giriş yapın.`
                      );
                    }
                  } catch (err: any) {
                    setFeedbackMessage(err.message || 'Plan değişikliği veritabanına kaydedilemedi.');
                  } finally {
                    setSelectedPlanForUpgrade(null);
                  }
                }}
              >
                Plan Tercihini Kaydet
              </Button>
            </div>
          </div>
        </Modal>
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
            <p className="text-xs text-zinc-300">
              Kurumunuza özel öğrenci kapasitesi, özel entegrasyonlar ve fiyat teklifi için talebinizi iletebilirsiniz.
            </p>
            <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div><strong>Kurumsal İletişim:</strong> kurumsal@mahfaza.co</div>
              <div><strong>Telefon:</strong> +90 (212) 800 20 26</div>
              <div><strong>Adres:</strong> Mahfaza Eğitim Teknolojileri A.Ş., İstanbul</div>
            </div>
            <div className="flex justify-end pt-3 border-t border-zinc-800">
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
