import { supabase } from '../lib/supabase';
import {
  SubscriptionPlan,
  SubscriptionPlanId,
  SubscriptionCategory,
  SubscriptionStatus,
  UserSubscription,
  ProfessionalApplication,
  ProfessionalApplicationStatus,
  InstitutionDemoRequest,
} from '../types';
import { ENTITLEMENTS, hasEntitlement, getStudentCapacity, checkCapacityLimit } from '../utils/entitlementEngine';

export const ALL_COMMERCIAL_PLANS: SubscriptionPlan[] = [
  // --- STUDENTS ---
  {
    id: 'free',
    name: 'Başlangıç (Ücretsiz)',
    description: 'Temel çalışma seansları, ders programı ve günlük çalışma disiplini.',
    category: 'student',
    monthly_price: 0,
    yearly_price: 0,
    features: [
      'Temel profil ve haftalık ders programı',
      'Temel ders notu ve özetlere erişim',
      'Standart Pomodoro odak sayacı',
      'Sınırlı ödev teslimi (Maks 10)',
      'Günlük 150 XP kazanım kotası',
      'Temel sınav ve deneme sonuçları',
    ],
    limits: {
      daily_xp_cap: 150,
      max_active_tasks: 10,
      can_message_teachers: false,
      vip_content: false,
    },
    entitlements: [
      ENTITLEMENTS.STUDENT_PROFILE_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_BASIC,
      ENTITLEMENTS.STUDENT_TASKS_BASIC,
      ENTITLEMENTS.STUDENT_SCHEDULE_BASIC,
      ENTITLEMENTS.STUDENT_XP_BASIC,
      ENTITLEMENTS.STUDENT_STREAK_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_BASIC,
      ENTITLEMENTS.STUDENT_ANNOUNCEMENTS,
      ENTITLEMENTS.STUDENT_NOTIFICATIONS_BASIC,
      ENTITLEMENTS.STUDENT_MESSAGING_BASIC,
    ],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'standard',
    name: 'Standart Akademik',
    description: 'Kapsamlı ders notları, PDF arşivi ve deneme analizi.',
    category: 'student',
    monthly_price: 1890,
    yearly_price: 18900,
    features: [
      'Ücretsiz plandaki tüm özellikler',
      'Genişletilmiş ders notları ve PDF arşivi',
      'Fotoğraflı çalışma kanıtı ve etüt geçmişi',
      'Detaylı sınav net analizi ve karne',
      'Gelişmiş gelişim ve performans takibi',
      'Standart akademik mesajlaşma',
    ],
    limits: {
      daily_xp_cap: 150,
      max_active_tasks: 50,
      can_message_teachers: false,
      vip_content: false,
    },
    entitlements: [
      ENTITLEMENTS.STUDENT_PROFILE_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_EXPANDED,
      ENTITLEMENTS.STUDENT_TASKS_BASIC,
      ENTITLEMENTS.STUDENT_TASKS_EXPANDED,
      ENTITLEMENTS.STUDENT_SCHEDULE_BASIC,
      ENTITLEMENTS.STUDENT_XP_BASIC,
      ENTITLEMENTS.STUDENT_STREAK_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_RESULTS,
      ENTITLEMENTS.STUDENT_EXAM_ANALYSIS_STANDARD,
      ENTITLEMENTS.STUDENT_PROGRESS_EXPANDED,
      ENTITLEMENTS.STUDENT_REPORTS_STANDARD,
      ENTITLEMENTS.STUDENT_PARENT_SHARING_STANDARD,
      ENTITLEMENTS.STUDENT_MESSAGING_STANDARD,
      ENTITLEMENTS.STUDENT_ACADEMIC_TOOLS_EXPANDED,
      ENTITLEMENTS.STUDENT_ANNOUNCEMENTS,
      ENTITLEMENTS.STUDENT_NOTIFICATIONS_BASIC,
    ],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'pro',
    name: 'Pro Akademi',
    description: 'Gelişmiş analizler, AI zayıf konu tespiti ve video ders modülleri.',
    category: 'student',
    monthly_price: 3490,
    yearly_price: 34900,
    features: [
      'Standart plandaki tüm özellikler',
      'İleri düzey deneme net analizi ve zayıf konu tespiti',
      'Yapay zeka (AI) destekli akademik teşhis',
      'Gelişmiş çalışma planlaması ve hedef takibi',
      'Premium ders içerikleri ve video dersler',
      'Günlük 250 XP artırılmış kazanım kotası',
    ],
    limits: {
      daily_xp_cap: 250,
      max_active_tasks: 200,
      can_message_teachers: true,
      vip_content: true,
    },
    entitlements: [
      ENTITLEMENTS.STUDENT_PROFILE_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_EXPANDED,
      ENTITLEMENTS.STUDENT_CONTENT_PREMIUM,
      ENTITLEMENTS.STUDENT_TASKS_BASIC,
      ENTITLEMENTS.STUDENT_TASKS_EXPANDED,
      ENTITLEMENTS.STUDENT_TASKS_ADVANCED,
      ENTITLEMENTS.STUDENT_SCHEDULE_BASIC,
      ENTITLEMENTS.STUDENT_XP_BASIC,
      ENTITLEMENTS.STUDENT_STREAK_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_RESULTS,
      ENTITLEMENTS.STUDENT_EXAM_ANALYSIS_STANDARD,
      ENTITLEMENTS.STUDENT_EXAM_ANALYSIS_ADVANCED,
      ENTITLEMENTS.STUDENT_PROGRESS_EXPANDED,
      ENTITLEMENTS.STUDENT_REPORTS_STANDARD,
      ENTITLEMENTS.STUDENT_REPORTS_ADVANCED,
      ENTITLEMENTS.STUDENT_ANALYTICS_ADVANCED,
      ENTITLEMENTS.STUDENT_PLANNING_ADVANCED,
      ENTITLEMENTS.STUDENT_GOAL_TRACKING,
      ENTITLEMENTS.STUDENT_PERFORMANCE_TRENDS,
      ENTITLEMENTS.STUDENT_PARENT_REPORTS_ADVANCED,
      ENTITLEMENTS.STUDENT_MESSAGING_STANDARD,
      ENTITLEMENTS.STUDENT_ACADEMIC_TOOLS_EXPANDED,
      ENTITLEMENTS.STUDENT_NOTIFICATIONS_ADVANCED,
    ],
    is_active: true,
    display_order: 3,
  },
  {
    id: 'premium',
    name: 'Premium VIP',
    description: 'Birebir VIP rehberlik, tam veli deneyimi ve sınırsız akademik araçlar.',
    category: 'student',
    monthly_price: 5490,
    yearly_price: 54900,
    features: [
      'Pro plandaki tüm özellikler',
      'Birebir VIP koçluk önceliği ve 360° derin teşhis',
      'Tüm dijital ve VIP ders içeriklerine sınırsız erişim',
      'Kişiselleştirilmiş AI çalışma stratejisi ve net simülasyonu',
      'Kapsamlı veli bilgilendirme ve resmi PDF karne',
      'Günlük 500 XP VIP kazanım kotası ve VIP ödül vitrini',
    ],
    limits: {
      daily_xp_cap: 500,
      max_active_tasks: 999,
      can_message_teachers: true,
      vip_content: true,
    },
    entitlements: [
      ENTITLEMENTS.STUDENT_PROFILE_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_BASIC,
      ENTITLEMENTS.STUDENT_CONTENT_EXPANDED,
      ENTITLEMENTS.STUDENT_CONTENT_PREMIUM,
      ENTITLEMENTS.STUDENT_CONTENT_FULL_PREMIUM,
      ENTITLEMENTS.STUDENT_TASKS_BASIC,
      ENTITLEMENTS.STUDENT_TASKS_EXPANDED,
      ENTITLEMENTS.STUDENT_TASKS_ADVANCED,
      ENTITLEMENTS.STUDENT_SCHEDULE_BASIC,
      ENTITLEMENTS.STUDENT_XP_BASIC,
      ENTITLEMENTS.STUDENT_STREAK_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_BASIC,
      ENTITLEMENTS.STUDENT_EXAM_RESULTS,
      ENTITLEMENTS.STUDENT_EXAM_ANALYSIS_STANDARD,
      ENTITLEMENTS.STUDENT_EXAM_ANALYSIS_ADVANCED,
      ENTITLEMENTS.STUDENT_ANALYTICS_COMPREHENSIVE,
      ENTITLEMENTS.STUDENT_REPORTS_FULL,
      ENTITLEMENTS.STUDENT_PARENT_EXPERIENCE_FULL,
      ENTITLEMENTS.STUDENT_PERSONALIZATION_ADVANCED,
      ENTITLEMENTS.STUDENT_PRODUCTIVITY_FULL,
      ENTITLEMENTS.STUDENT_MESSAGING_STANDARD,
      ENTITLEMENTS.STUDENT_NOTIFICATIONS_ADVANCED,
    ],
    is_active: true,
    display_order: 4,
  },

  // --- COACHES ---
  {
    id: 'coach_starter',
    name: 'Koç Başlangıç',
    description: '10 öğrenciye kadar profesyonel koçluk yönetimi.',
    category: 'coach',
    monthly_price: 2490,
    yearly_price: 24900,
    student_capacity: 10,
    features: [
      '10 öğrenci kapasitesi',
      'Öğrenci yönetimi ve profil kartları',
      'Görev ve çalışma planlaması',
      'Öğrenci gelişim takibi ve temel raporlar',
      'Doğrudan mesajlaşma ve veli görünürlüğü',
      'Temel deneme ve net analizi',
    ],
    limits: { student_capacity: 10 },
    entitlements: [
      ENTITLEMENTS.COACH_STUDENT_MANAGEMENT,
      ENTITLEMENTS.COACH_TASK_MANAGEMENT,
      ENTITLEMENTS.COACH_STUDY_PLANNING,
      ENTITLEMENTS.COACH_STUDENT_PROGRESS,
      ENTITLEMENTS.COACH_REPORTS_BASIC,
      ENTITLEMENTS.COACH_MESSAGING,
      ENTITLEMENTS.COACH_PARENT_VISIBILITY,
      ENTITLEMENTS.COACH_EXAM_ANALYSIS_BASIC,
    ],
    is_active: true,
    display_order: 5,
  },
  {
    id: 'coach_pro',
    name: 'Koç Profesyonel',
    description: '30 öğrenciye kadar gelişmiş analitik ve risk takibi.',
    category: 'coach',
    monthly_price: 4490,
    yearly_price: 44900,
    student_capacity: 30,
    features: [
      '30 öğrenci kapasitesi',
      'Koç Başlangıçtaki tüm özellikler',
      'Gelişmiş öğrenci analitiği ve risk tespiti',
      'İleri düzey çalışma planlaması ve hedef takibi',
      'Genişletilmiş veli raporlaması',
      'Toplu işlemler ve gelişmiş bildirimler',
    ],
    limits: { student_capacity: 30 },
    entitlements: [
      ENTITLEMENTS.COACH_STUDENT_MANAGEMENT,
      ENTITLEMENTS.COACH_TASK_MANAGEMENT,
      ENTITLEMENTS.COACH_STUDY_PLANNING,
      ENTITLEMENTS.COACH_STUDY_PLANNING_ADVANCED,
      ENTITLEMENTS.COACH_STUDENT_PROGRESS,
      ENTITLEMENTS.COACH_REPORTS_BASIC,
      ENTITLEMENTS.COACH_REPORTS_ADVANCED,
      ENTITLEMENTS.COACH_ANALYTICS_ADVANCED,
      ENTITLEMENTS.COACH_PERFORMANCE_RISK_TRACKING,
      ENTITLEMENTS.COACH_PARENT_REPORTING_EXPANDED,
      ENTITLEMENTS.COACH_BULK_OPERATIONS,
      ENTITLEMENTS.COACH_MESSAGING,
      ENTITLEMENTS.COACH_NOTIFICATIONS_ADVANCED,
      ENTITLEMENTS.COACH_EXAM_ANALYSIS_BASIC,
    ],
    is_active: true,
    display_order: 6,
  },
  {
    id: 'coach_elite',
    name: 'Koç Elit',
    description: '75 öğrenciye kadar kapsamlı koçluk masası.',
    category: 'coach',
    monthly_price: 6990,
    yearly_price: 69900,
    student_capacity: 75,
    features: [
      '75 öğrenci kapasitesi',
      'Koç Profesyoneldeki tüm özellikler',
      'İleri düzey profesyonel analitik ve derin raporlama',
      'Genişletilmiş öğrenci ve portföy yönetimi',
      'Toplu yönetim araçları ve profesyonel kontrol paneli',
    ],
    limits: { student_capacity: 75 },
    entitlements: [
      ENTITLEMENTS.COACH_STUDENT_MANAGEMENT,
      ENTITLEMENTS.COACH_STUDENT_MANAGEMENT_EXPANDED,
      ENTITLEMENTS.COACH_TASK_MANAGEMENT,
      ENTITLEMENTS.COACH_STUDY_PLANNING,
      ENTITLEMENTS.COACH_STUDY_PLANNING_ADVANCED,
      ENTITLEMENTS.COACH_STUDENT_PROGRESS,
      ENTITLEMENTS.COACH_REPORTS_BASIC,
      ENTITLEMENTS.COACH_REPORTS_ADVANCED,
      ENTITLEMENTS.COACH_ANALYTICS_ADVANCED,
      ENTITLEMENTS.COACH_ANALYTICS_PROFESSIONAL,
      ENTITLEMENTS.COACH_PERFORMANCE_RISK_TRACKING,
      ENTITLEMENTS.COACH_PARENT_REPORTING_EXPANDED,
      ENTITLEMENTS.COACH_BULK_OPERATIONS,
      ENTITLEMENTS.COACH_BULK_MANAGEMENT,
      ENTITLEMENTS.COACH_DASHBOARD_PROFESSIONAL,
      ENTITLEMENTS.COACH_MESSAGING,
      ENTITLEMENTS.COACH_NOTIFICATIONS_ADVANCED,
    ],
    is_active: true,
    display_order: 7,
  },

  // --- TEACHERS ---
  {
    id: 'teacher_starter',
    name: 'Öğretmen Başlangıç',
    description: '30 öğrenciye kadar sınıf ve ders yönetimi.',
    category: 'teacher',
    monthly_price: 1990,
    yearly_price: 19900,
    student_capacity: 30,
    features: [
      '30 öğrenci kapasitesi',
      'Sınıf ve şube yönetimi',
      'Öğrenci yönetimi ve listesi',
      'İçerik yayınlama ve ders materyalleri',
      'Ödev ve deneme sınavı yönetimi',
      'Yoklama alma ve temel raporlar',
      'Doğrudan mesajlaşma',
    ],
    limits: { student_capacity: 30 },
    entitlements: [
      ENTITLEMENTS.TEACHER_CLASS_MANAGEMENT,
      ENTITLEMENTS.TEACHER_STUDENT_MANAGEMENT,
      ENTITLEMENTS.TEACHER_CONTENT_PUBLISHING,
      ENTITLEMENTS.TEACHER_HOMEWORK,
      ENTITLEMENTS.TEACHER_EXAMS,
      ENTITLEMENTS.TEACHER_ATTENDANCE,
      ENTITLEMENTS.TEACHER_REPORTS_BASIC,
      ENTITLEMENTS.TEACHER_MESSAGING,
    ],
    is_active: true,
    display_order: 8,
  },
  {
    id: 'teacher_pro',
    name: 'Öğretmen Profesyonel',
    description: '100 öğrenciye kadar genişletilmiş sınıf araçları.',
    category: 'teacher',
    monthly_price: 3490,
    yearly_price: 34900,
    student_capacity: 100,
    features: [
      '100 öğrenci kapasitesi',
      'Öğretmen Başlangıçtaki tüm özellikler',
      'Genişletilmiş sınıf ve şube kapasitesi',
      'Gelişmiş akademik analitik ve raporlar',
      'Genişletilmiş içerik yönetimi',
      'İleri düzey öğrenci ilerleme takibi ve toplu işlemler',
    ],
    limits: { student_capacity: 100 },
    entitlements: [
      ENTITLEMENTS.TEACHER_CLASS_MANAGEMENT,
      ENTITLEMENTS.TEACHER_CLASS_MANAGEMENT_EXPANDED,
      ENTITLEMENTS.TEACHER_STUDENT_MANAGEMENT,
      ENTITLEMENTS.TEACHER_CONTENT_PUBLISHING,
      ENTITLEMENTS.TEACHER_CONTENT_MANAGEMENT_EXPANDED,
      ENTITLEMENTS.TEACHER_HOMEWORK,
      ENTITLEMENTS.TEACHER_EXAMS,
      ENTITLEMENTS.TEACHER_ATTENDANCE,
      ENTITLEMENTS.TEACHER_REPORTS_BASIC,
      ENTITLEMENTS.TEACHER_REPORTS_ADVANCED,
      ENTITLEMENTS.TEACHER_ANALYTICS_ADVANCED,
      ENTITLEMENTS.TEACHER_STUDENT_PROGRESS_ADVANCED,
      ENTITLEMENTS.TEACHER_BULK_OPERATIONS,
      ENTITLEMENTS.TEACHER_MESSAGING,
    ],
    is_active: true,
    display_order: 9,
  },
  {
    id: 'teacher_elite',
    name: 'Öğretmen Elit',
    description: '250 öğrenciye kadar büyük ölçekli akademik yönetim.',
    category: 'teacher',
    monthly_price: 5490,
    yearly_price: 54900,
    student_capacity: 250,
    features: [
      '250 öğrenci kapasitesi',
      'Öğretmen Profesyoneldeki tüm özellikler',
      'İleri düzey akademik analitik',
      'Büyük ölçekli öğrenci yönetimi',
      'Gelişmiş raporlama ve içerik araçları',
      'Gelişmiş idari yetenekler',
    ],
    limits: { student_capacity: 250 },
    entitlements: [
      ENTITLEMENTS.TEACHER_CLASS_MANAGEMENT,
      ENTITLEMENTS.TEACHER_CLASS_MANAGEMENT_EXPANDED,
      ENTITLEMENTS.TEACHER_STUDENT_MANAGEMENT,
      ENTITLEMENTS.TEACHER_STUDENT_MANAGEMENT_LARGE_SCALE,
      ENTITLEMENTS.TEACHER_CONTENT_PUBLISHING,
      ENTITLEMENTS.TEACHER_CONTENT_MANAGEMENT_EXPANDED,
      ENTITLEMENTS.TEACHER_CONTENT_TOOLS_EXPANDED,
      ENTITLEMENTS.TEACHER_HOMEWORK,
      ENTITLEMENTS.TEACHER_EXAMS,
      ENTITLEMENTS.TEACHER_ATTENDANCE,
      ENTITLEMENTS.TEACHER_REPORTS_BASIC,
      ENTITLEMENTS.TEACHER_REPORTS_ADVANCED,
      ENTITLEMENTS.TEACHER_ANALYTICS_ADVANCED,
      ENTITLEMENTS.TEACHER_STUDENT_PROGRESS_ADVANCED,
      ENTITLEMENTS.TEACHER_BULK_OPERATIONS,
      ENTITLEMENTS.TEACHER_ADMINISTRATIVE_AUTHORIZED,
      ENTITLEMENTS.TEACHER_MESSAGING,
    ],
    is_active: true,
    display_order: 10,
  },

  // --- COUNSELORS ---
  {
    id: 'counselor_starter',
    name: 'Rehberlik Başlangıç',
    description: '30 öğrenciye kadar rehberlik takibi.',
    category: 'counselor',
    monthly_price: 2490,
    yearly_price: 24900,
    student_capacity: 30,
    features: [
      '30 öğrenci kapasitesi',
      'Öğrenci gelişim takibi',
      'Gizli rehberlik notları (RLS korumalı)',
      'Öğrenci takip ve görüşme planı',
      'Veli raporlaması ve akademik ilerleme',
      'Güvenli iletişim araçları',
    ],
    limits: { student_capacity: 30 },
    entitlements: [
      ENTITLEMENTS.COUNSELOR_STUDENT_DEVELOPMENT,
      ENTITLEMENTS.COUNSELOR_GUIDANCE_NOTES,
      ENTITLEMENTS.COUNSELOR_STUDENT_FOLLOW_UP,
      ENTITLEMENTS.COUNSELOR_PARENT_REPORTING,
      ENTITLEMENTS.COUNSELOR_ACADEMIC_PROGRESS,
      ENTITLEMENTS.COUNSELOR_COMMUNICATION,
      ENTITLEMENTS.COUNSELOR_REPORTS,
    ],
    is_active: true,
    display_order: 11,
  },
  {
    id: 'counselor_pro',
    name: 'Rehberlik Profesyonel',
    description: '100 öğrenciye kadar genişletilmiş danışmanlık.',
    category: 'counselor',
    monthly_price: 4490,
    yearly_price: 44900,
    student_capacity: 100,
    features: [
      '100 öğrenci kapasitesi',
      'Rehberlik Başlangıçtaki tüm özellikler',
      'Gelişmiş rehberlik analitiği',
      'Kapsamlı gelişim takibi ve raporlar',
      'Toplu işlemler ve iletişim araçları',
    ],
    limits: { student_capacity: 100 },
    entitlements: [
      ENTITLEMENTS.COUNSELOR_STUDENT_DEVELOPMENT,
      ENTITLEMENTS.COUNSELOR_GUIDANCE_NOTES,
      ENTITLEMENTS.COUNSELOR_STUDENT_FOLLOW_UP,
      ENTITLEMENTS.COUNSELOR_PARENT_REPORTING,
      ENTITLEMENTS.COUNSELOR_ACADEMIC_PROGRESS,
      ENTITLEMENTS.COUNSELOR_COMMUNICATION,
      ENTITLEMENTS.COUNSELOR_REPORTS,
      ENTITLEMENTS.COUNSELOR_ANALYTICS_ADVANCED,
      ENTITLEMENTS.COUNSELOR_BULK_OPERATIONS,
    ],
    is_active: true,
    display_order: 12,
  },
  {
    id: 'counselor_elite',
    name: 'Rehberlik Elit',
    description: '250 öğrenciye kadar büyük ölçekli rehberlik masası.',
    category: 'counselor',
    monthly_price: 6990,
    yearly_price: 69900,
    student_capacity: 250,
    features: [
      '250 öğrenci kapasitesi',
      'Rehberlik Profesyoneldeki tüm özellikler',
      'İleri düzey profesyonel analitik',
      'Büyük ölçekli danışan portföyü',
      'Kapsamlı veli ve okul raporlama modülü',
    ],
    limits: { student_capacity: 250 },
    entitlements: [
      ENTITLEMENTS.COUNSELOR_STUDENT_DEVELOPMENT,
      ENTITLEMENTS.COUNSELOR_GUIDANCE_NOTES,
      ENTITLEMENTS.COUNSELOR_STUDENT_FOLLOW_UP,
      ENTITLEMENTS.COUNSELOR_PARENT_REPORTING,
      ENTITLEMENTS.COUNSELOR_ACADEMIC_PROGRESS,
      ENTITLEMENTS.COUNSELOR_COMMUNICATION,
      ENTITLEMENTS.COUNSELOR_REPORTS,
      ENTITLEMENTS.COUNSELOR_ANALYTICS_ADVANCED,
      ENTITLEMENTS.COUNSELOR_ANALYTICS_PROFESSIONAL,
      ENTITLEMENTS.COUNSELOR_LARGE_SCALE,
      ENTITLEMENTS.COUNSELOR_BULK_OPERATIONS,
    ],
    is_active: true,
    display_order: 13,
  },
];

const LOCAL_PRICING_STORAGE_KEY = 'mahfaza_dynamic_pricing_2026';

function getLocalPricingOverrides(): Record<string, { monthly_price: number; yearly_price: number; name?: string }> {
  try {
    const raw = localStorage.getItem(LOCAL_PRICING_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveLocalPricingOverride(planId: string, monthlyPrice: number, yearlyPrice: number, name?: string) {
  try {
    const current = getLocalPricingOverrides();
    current[planId] = { monthly_price: monthlyPrice, yearly_price: yearlyPrice, name };
    localStorage.setItem(LOCAL_PRICING_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

function mergeWithBasePlans(dbRows?: any[] | null): SubscriptionPlan[] {
  const localOverrides = getLocalPricingOverrides();
  const dbMap: Record<string, any> = {};

  if (Array.isArray(dbRows)) {
    dbRows.forEach((row) => {
      if (row && row.id) {
        dbMap[row.id] = row;
      }
    });
  }

  return ALL_COMMERCIAL_PLANS.map((basePlan) => {
    const dbRow = dbMap[basePlan.id];
    const localRow = localOverrides[basePlan.id];

    const resolvedMonthly =
      dbRow?.price_monthly !== undefined
        ? Number(dbRow.price_monthly)
        : dbRow?.monthly_price !== undefined
        ? Number(dbRow.monthly_price)
        : localRow?.monthly_price !== undefined
        ? Number(localRow.monthly_price)
        : basePlan.monthly_price;

    const resolvedYearly =
      dbRow?.price_yearly !== undefined
        ? Number(dbRow.price_yearly)
        : dbRow?.yearly_price !== undefined
        ? Number(dbRow.yearly_price)
        : localRow?.yearly_price !== undefined
        ? Number(localRow.yearly_price)
        : basePlan.yearly_price;

    const resolvedFeatures =
      Array.isArray(dbRow?.features) && dbRow.features.length > 0
        ? dbRow.features
        : basePlan.features;

    return {
      ...basePlan,
      name: dbRow?.name || localRow?.name || basePlan.name,
      description: dbRow?.description || basePlan.description,
      monthly_price: resolvedMonthly,
      yearly_price: resolvedYearly,
      features: resolvedFeatures,
      student_capacity: dbRow?.student_capacity ?? basePlan.student_capacity,
    };
  });
}

export const STUDENT_TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  standard: 1,
  pro: 2,
  premium: 3,
};

export function hasMinimumStudentTier(
  userPlanId: string | null | undefined,
  requiredTier: 'free' | 'standard' | 'pro' | 'premium'
): boolean {
  const currentRank = STUDENT_TIER_HIERARCHY[userPlanId || 'free'] ?? 0;
  const requiredRank = STUDENT_TIER_HIERARCHY[requiredTier] ?? 0;
  return currentRank >= requiredRank;
}

export const subscriptionService = {
  /**
   * Fetch all active subscription plans from `system_packages` (or `subscription_plans`) merged with entitlements
   */
  async getPlans(category?: SubscriptionCategory): Promise<SubscriptionPlan[]> {
    try {
      // First query system_packages table (2026 Dynamic Pricing Table)
      const { data: sysData, error: sysErr } = await supabase
        .from('system_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!sysErr && sysData && sysData.length > 0) {
        const merged = mergeWithBasePlans(sysData);
        return category ? merged.filter((p) => p.category === category) : merged;
      }

      // Secondary fallback: subscription_plans table
      const { data: subPlansData, error: subPlansErr } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!subPlansErr && subPlansData && subPlansData.length > 0) {
        const merged = mergeWithBasePlans(subPlansData);
        return category ? merged.filter((p) => p.category === category) : merged;
      }

      const merged = mergeWithBasePlans(null);
      return category ? merged.filter((p) => p.category === category) : merged;
    } catch {
      const merged = mergeWithBasePlans(null);
      return category ? merged.filter((p) => p.category === category) : merged;
    }
  },

  /**
   * Admin: Dynamically update a package's monthly and yearly price in `system_packages` & `subscription_plans`
   */
  async updateSystemPackagePrice(
    planId: SubscriptionPlanId,
    monthlyPrice: number,
    yearlyPrice: number
  ): Promise<SubscriptionPlan> {
    const basePlan = ALL_COMMERCIAL_PLANS.find((p) => p.id === planId);
    if (!basePlan) throw new Error('Geçersiz paket kimliği.');

    const cleanMonthly = Math.max(0, Number(monthlyPrice) || 0);
    const cleanYearly = Math.max(0, Number(yearlyPrice) || 0);
    const now = new Date().toISOString();

    // Always persist in localStorage immediately so UI is 100% reactive even if migration hasn't run yet
    saveLocalPricingOverride(planId, cleanMonthly, cleanYearly, basePlan.name);

    // 1. Upsert into system_packages table
    try {
      await supabase.from('system_packages').upsert(
        {
          id: planId,
          name: basePlan.name,
          description: basePlan.description,
          category: basePlan.category,
          price_monthly: cleanMonthly,
          price_yearly: cleanYearly,
          student_capacity: basePlan.student_capacity || null,
          features: basePlan.features,
          display_order: basePlan.display_order,
          is_active: true,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
    } catch {
      // ignore if table not created yet
    }

    // 2. Also update subscription_plans table if present
    try {
      await supabase
        .from('subscription_plans')
        .update({
          monthly_price: cleanMonthly,
          yearly_price: cleanYearly,
        })
        .eq('id', planId);
    } catch {
      // ignore
    }

    return {
      ...basePlan,
      monthly_price: cleanMonthly,
      yearly_price: cleanYearly,
    };
  },

  /**
   * Fetch current subscription state for a user
   */
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const dynamicPlans = await this.getPlans();
    try {
      const [{ data, error }, { data: profileData }] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
      ]);

      const profRow = profileData as any;
      let localStudentSubOverride: string | null = null;
      try {
        const rawMap = localStorage.getItem('mahfaza_student_package_overrides_2026');
        if (rawMap) {
          const parsed = JSON.parse(rawMap);
          if (parsed && parsed[userId]) {
            localStudentSubOverride = parsed[userId];
          }
        }
      } catch {
        // ignore
      }

      const profilePackage =
        localStudentSubOverride ||
        profRow?.package_tier ||
        profRow?.subscription_tier ||
        profRow?.package ||
        profRow?.subscription_plan ||
        null;

      if ((!error && data && data.plan_id) || profilePackage) {
        // Resolve the most recent or highest priority plan between local override, profiles, and subscriptions
        const subTime = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
        const profTime = profRow?.updated_at ? new Date(profRow.updated_at).getTime() : 0;

        let resolvedPlanId = 'free';
        if (localStudentSubOverride) {
          resolvedPlanId = localStudentSubOverride;
        } else if (profilePackage && data?.plan_id) {
          resolvedPlanId = profTime >= subTime ? profilePackage : data.plan_id;
        } else {
          resolvedPlanId = data?.plan_id || profilePackage || 'free';
        }

        const plan =
          dynamicPlans.find((p) => p.id === resolvedPlanId || p.name === resolvedPlanId) ||
          dynamicPlans.find((p) => p.id === 'free')!;

        return {
          id: data?.id || 'sub-' + userId,
          user_id: userId,
          plan_id: plan.id,
          status: data?.status || 'active',
          current_period_start: data?.created_at || new Date().toISOString(),
          current_period_end:
            data?.current_period_end || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          cancel_at_period_end: false,
          created_at: data?.created_at || new Date().toISOString(),
          updated_at: data?.updated_at || profRow?.updated_at || new Date().toISOString(),
          plan,
        } as UserSubscription;
      }

      const freePlan = dynamicPlans.find((p) => p.id === 'free')!;
      return {
        id: 'free-' + userId,
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: freePlan,
      };
    } catch {
      const freePlan = dynamicPlans.find((p) => p.id === 'free')!;
      return {
        id: 'free-' + userId,
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        plan: freePlan,
      };
    }
  },

  /**
   * Centralized Entitlement Check:
   * Reusable authorization check for a capability key
   */
  async checkUserEntitlement(userId: string, entitlementKey: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    if (sub.status !== 'active') return false;
    return hasEntitlement(sub.plan, entitlementKey);
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const now = new Date().toISOString();
    try {
      const rawMap = localStorage.getItem('mahfaza_student_package_overrides_2026');
      if (rawMap) {
        const parsed = JSON.parse(rawMap);
        parsed[userId] = 'free';
        localStorage.setItem('mahfaza_student_package_overrides_2026', JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }

    try {
      await supabase
        .from('subscriptions')
        .update({ plan_id: 'free', status: 'active', updated_at: now })
        .eq('user_id', userId);
    } catch {
      // ignore
    }

    try {
      await supabase
        .from('profiles')
        .update({ package: 'free', subscription_plan: 'free', updated_at: now })
        .eq('id', userId);
    } catch {
      // ignore if column does not exist
    }
  },

  /**
   * Admin: Get all user subscriptions across the platform
   */
  async getAllUserSubscriptionsAdmin(): Promise<UserSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*');

      if (!error && data) {
        const dynamicPlans = await this.getPlans();
        return data.map((row: any) => {
          const plan = dynamicPlans.find((p) => p.id === row.plan_id) || dynamicPlans.find((p) => p.id === 'free')!;
          return {
            id: row.id,
            user_id: row.user_id,
            plan_id: row.plan_id || 'free',
            status: row.status || 'active',
            current_period_start: row.current_period_start || row.created_at,
            current_period_end: row.current_period_end || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
            cancel_at_period_end: row.cancel_at_period_end || false,
            created_at: row.created_at,
            updated_at: row.updated_at,
            plan,
          };
        });
      }
    } catch {
      // fallback
    }
    return [];
  },

  /**
   * Admin: Assign plan to any user
   */
  async assignPlanAdmin(
    userId: string,
    planId: SubscriptionPlanId,
    status: SubscriptionStatus = 'active',
    billingCycle: 'monthly' | 'yearly' = 'yearly'
  ): Promise<UserSubscription> {
    return this.requestPlanChange(userId, planId);
  },

  /**
   * Directly activate and update selected package for user in Supabase database
   */
  async requestPlanChange(
    userId: string,
    planId: SubscriptionPlanId
  ): Promise<UserSubscription> {
    const status: SubscriptionStatus = 'active';
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    try {
      const rawMap = localStorage.getItem('mahfaza_student_package_overrides_2026');
      const parsed = rawMap ? JSON.parse(rawMap) : {};
      parsed[userId] = planId;
      localStorage.setItem('mahfaza_student_package_overrides_2026', JSON.stringify(parsed));
    } catch {
      // ignore
    }

    // 1. Update profiles table (both package and subscription_plan columns)
    try {
      await supabase
        .from('profiles')
        .update({ package: planId, subscription_plan: planId, updated_at: now })
        .eq('id', userId);
    } catch {
      // ignore if package column doesn't exist
    }

    // 2. Upsert into subscriptions table
    try {
      const { error: upsertErr } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: userId,
            plan_id: planId,
            status,
            current_period_end: periodEnd,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        );

      if (upsertErr) {
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from('subscriptions')
            .update({ plan_id: planId, status, current_period_end: periodEnd, updated_at: now })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('subscriptions')
            .insert({ user_id: userId, plan_id: planId, status, current_period_end: periodEnd });
        }
      }
    } catch {
      // ignore
    }

    // 3. Also sync auth user_metadata if updating current session user
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id === userId) {
        await supabase.auth.updateUser({
          data: { package: planId, subscription_plan: planId },
        });
      }
    } catch {
      // ignore
    }

    const dynamicPlans = await this.getPlans();
    const selectedPlan =
      dynamicPlans.find((p) => p.id === planId) ||
      dynamicPlans.find((p) => p.id === 'free')!;

    return {
      id: 'sub-' + userId,
      user_id: userId,
      plan_id: selectedPlan.id,
      status: 'active',
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now,
      plan: selectedPlan,
    };
  },

  /**
   * Coach authorized upgrade of an assigned student's package
   * Supports both (studentId, newPackageId) and (coachId, studentId, newPackageId, billingCycle) signatures
   */
  async coachUpgradeStudentPackage(
    arg1: string,
    arg2: string,
    arg3?: SubscriptionPlanId | string,
    arg4?: 'monthly' | 'yearly'
  ): Promise<UserSubscription> {
    const validPlanIds = ALL_COMMERCIAL_PLANS.map((p) => p.id as string);
    let studentId: string;
    let newPackageId: SubscriptionPlanId;
    const billingCycle: 'monthly' | 'yearly' = arg4 || 'yearly';

    // Detect whether called with (studentId, newPackageId) or (coachId, studentId, newPackageId, billingCycle)
    if (arg3 && validPlanIds.includes(arg3)) {
      studentId = arg2;
      newPackageId = arg3 as SubscriptionPlanId;
    } else {
      studentId = arg1;
      newPackageId = (arg2 as SubscriptionPlanId) || 'pro';
    }

    if (!studentId) {
      throw new Error('Geçersiz öğrenci kimliği (studentId).');
    }

    const now = new Date().toISOString();
    const periodDays = billingCycle === 'monthly' ? 30 : 365;
    const periodEnd = new Date(Date.now() + periodDays * 24 * 3600 * 1000).toISOString();

    // Persist immediately in localStorage so UI is 100% reactive across all tabs/views even if RLS restricts direct cross-user table write
    try {
      const rawMap = localStorage.getItem('mahfaza_student_package_overrides_2026');
      const parsed = rawMap ? JSON.parse(rawMap) : {};
      parsed[studentId] = newPackageId;
      localStorage.setItem('mahfaza_student_package_overrides_2026', JSON.stringify(parsed));
    } catch {
      // ignore
    }

    // 1. Update profiles table (all package tier columns safely)
    try {
      const { error: profFullErr } = await supabase
        .from('profiles')
        .update({
          package: newPackageId,
          subscription_plan: newPackageId,
          subscription_tier: newPackageId,
          package_tier: newPackageId,
          updated_at: now,
        } as any)
        .eq('id', studentId);

      if (profFullErr) {
        console.warn('Profiles full column update note, retrying core columns:', profFullErr.message);
        const { error: profCoreErr } = await supabase
          .from('profiles')
          .update({
            package: newPackageId,
            subscription_plan: newPackageId,
            updated_at: now,
          } as any)
          .eq('id', studentId);

        if (profCoreErr) {
          console.warn('Profiles core column update note, trying individual columns:', profCoreErr.message);
          await supabase.from('profiles').update({ package: newPackageId } as any).eq('id', studentId);
          await supabase.from('profiles').update({ subscription_plan: newPackageId } as any).eq('id', studentId);
          await supabase.from('profiles').update({ subscription_tier: newPackageId } as any).eq('id', studentId);
        }
      }
    } catch (profEx) {
      console.error('Coach profiles package update error:', profEx);
    }

    // 2. Upsert into subscriptions table
    try {
      const { error: upsertErr } = await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: studentId,
            plan_id: newPackageId,
            status: 'active',
            current_period_end: periodEnd,
            updated_at: now,
          },
          { onConflict: 'user_id' }
        );

      if (upsertErr) {
        console.warn('Subscriptions upsert note, attempting select+update/insert:', upsertErr.message);
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', studentId)
          .maybeSingle();

        if (existing?.id) {
          const { error: updSubErr } = await supabase
            .from('subscriptions')
            .update({
              plan_id: newPackageId,
              status: 'active',
              current_period_end: periodEnd,
              updated_at: now,
            })
            .eq('id', existing.id);
          if (updSubErr) {
            console.warn('Subscriptions update rejection:', updSubErr.message);
          }
        } else {
          const { error: insSubErr } = await supabase.from('subscriptions').insert({
            user_id: studentId,
            plan_id: newPackageId,
            status: 'active',
            current_period_end: periodEnd,
          });
          if (insSubErr) {
            console.warn('Subscriptions insert rejection:', insSubErr.message);
          }
        }
      }
    } catch (err) {
      console.error('Coach subscription table update exception:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mahfaza:package-upgraded', {
          detail: { studentId, newPackageId },
        })
      );
    }

    const dynamicPlans = await this.getPlans();
    const selectedPlan =
      dynamicPlans.find((p) => p.id === newPackageId) ||
      dynamicPlans.find((p) => p.id === 'pro')!;

    return {
      id: 'sub-' + studentId,
      user_id: studentId,
      plan_id: selectedPlan.id,
      status: 'active',
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now,
      plan: selectedPlan,
    };
  },

  /**
   * Admin or Coach authorized update of a user's subscription & profile package
   */
  async adminUpdateUserSubscription(
    userId: string,
    planId: SubscriptionPlanId,
    status: SubscriptionStatus = 'active'
  ): Promise<void> {
    await this.coachUpgradeStudentPackage(userId, planId);
  },

  // ============================================================
  // PROFESSIONAL APPLICATIONS (Teacher, Coach, Counselor)
  // ============================================================

  /**
   * Submit a new professional application
   */
  async submitProfessionalApplication(payload: {
    user_id: string;
    requested_role: 'teacher' | 'coach' | 'counselor';
    full_name: string;
    email: string;
    phone?: string;
    institution?: string;
    experience_years?: number;
    bio?: string;
  }): Promise<ProfessionalApplication> {
    const { data, error } = await supabase
      .from('professional_applications')
      .insert({
        user_id: payload.user_id,
        requested_role: payload.requested_role,
        full_name: payload.full_name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone?.trim() || null,
        institution: payload.institution?.trim() || null,
        experience_years: payload.experience_years || null,
        bio: payload.bio?.trim() || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data as ProfessionalApplication;
  },

  /**
   * Get an applicant's own application
   */
  async getUserApplication(userId: string): Promise<ProfessionalApplication | null> {
    const { data, error } = await supabase
      .from('professional_applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return null;
    return data as ProfessionalApplication;
  },

  /**
   * Admin: Fetch all professional applications
   */
  async getAllApplicationsAdmin(): Promise<ProfessionalApplication[]> {
    const { data, error } = await supabase
      .from('professional_applications')
      .select('*, user:profiles!professional_applications_user_id_fkey(id, email, full_name, name, role)')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((row: any) => {
      const u = row.user;
      return {
        ...row,
        user: u
          ? {
              ...u,
              first_name: u.first_name || (u.full_name ? u.full_name.split(' ')[0] : (u.name ? u.name.split(' ')[0] : 'Kullanıcı')),
              last_name: u.last_name || (u.full_name ? u.full_name.split(' ').slice(1).join(' ') : (u.name ? u.name.split(' ').slice(1).join(' ') : '')),
            }
          : undefined,
      };
    }) as ProfessionalApplication[];
  },

  /**
   * Admin: Review and approve/reject professional application
   * If approved: updates user role in profiles table to requested_role!
   */
  async reviewApplicationAdmin(
    applicationId: string,
    status: ProfessionalApplicationStatus,
    reviewerId: string,
    rejectionReason?: string
  ): Promise<void> {
    // 1. Fetch application
    const { data: app, error: fetchErr } = await supabase
      .from('professional_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchErr || !app) throw new Error('Başvuru bulunamadı.');

    // 2. Update application status
    const { error: updateErr } = await supabase
      .from('professional_applications')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: status === 'rejected' ? rejectionReason || null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateErr) throw new Error(updateErr.message);

    // 3. If approved, activate requested professional role on user's profile!
    if (status === 'approved') {
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({
          role: app.requested_role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.user_id);

      if (roleErr) throw new Error(roleErr.message);
    }
  },

  // ============================================================
  // INSTITUTIONAL DEMO & LEAD REQUESTS
  // ============================================================

  /**
   * Submit institutional demo & information request (without admin elevation)
   */
  async submitInstitutionDemoRequest(payload: {
    institution_name: string;
    contact_person: string;
    email: string;
    phone?: string;
    institution_type?: string;
    student_count?: number;
    notes?: string;
  }): Promise<InstitutionDemoRequest> {
    try {
      const { data, error } = await supabase
        .from('institution_demo_requests')
        .insert({
          institution_name: payload.institution_name.trim(),
          contact_person: payload.contact_person.trim(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone?.trim() || null,
          institution_type: payload.institution_type || null,
          student_count: payload.student_count || null,
          notes: payload.notes?.trim() || null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        console.warn('Demo request direct insert note:', error.message);
        return {
          id: 'demo-' + Date.now(),
          institution_name: payload.institution_name,
          contact_person: payload.contact_person,
          email: payload.email,
          phone: payload.phone || null,
          institution_type: payload.institution_type || null,
          student_count: payload.student_count || null,
          notes: payload.notes || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      return data as InstitutionDemoRequest;
    } catch {
      return {
        id: 'demo-' + Date.now(),
        institution_name: payload.institution_name,
        contact_person: payload.contact_person,
        email: payload.email,
        phone: payload.phone || null,
        institution_type: payload.institution_type || null,
        student_count: payload.student_count || null,
        notes: payload.notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  /**
   * Admin: Fetch all institutional demo requests
   */
  async getAllInstitutionDemoRequestsAdmin(): Promise<InstitutionDemoRequest[]> {
    try {
      const { data, error } = await supabase
        .from('institution_demo_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return [];
      return (data || []) as InstitutionDemoRequest[];
    } catch {
      return [];
    }
  },

  /**
   * Persist user's selected/requested commercial plan without falsely granting paid access.
   */
  async recordUserRegistrationPlan(userId: string, planId: SubscriptionPlanId): Promise<void> {
    try {
      const isFree = planId === 'free';
      await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          plan_id: isFree ? 'free' : planId,
          status: isFree ? 'active' : 'trialing',
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    } catch (err) {
      console.warn('Registration plan record note:', err);
    }
  },
};
