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
    description: 'Temel çalışma seansları ve günlük çalışma disiplini.',
    category: 'student',
    monthly_price: 0,
    yearly_price: 0,
    features: [
      'Temel profil ve ders programı',
      'Temel ders notu ve özetlere erişim',
      'Sınırlı ödev teslimi (Maks 10)',
      'Günlük 150 XP kazanım kotası',
      'Seri takibi ve rozetler',
      'Temel sınav ve deneme sonuçları',
      'Genel duyurular ve temel bildirimler',
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
    monthly_price: 349,
    yearly_price: 3490,
    features: [
      'Ücretsiz plandaki tüm özellikler',
      'Genişletilmiş ders notları ve PDF arşivi',
      'Genişletilmiş ödev ve görev sistemi',
      'Detaylı sınav net analizi ve karne',
      'Gelişmiş gelişim ve performans takibi',
      'Standart veli paylaşım raporları',
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
    description: 'Gelişmiş analizler, hedefler ve video ders modülleri.',
    category: 'student',
    monthly_price: 549,
    yearly_price: 5490,
    features: [
      'Standart plandaki tüm özellikler',
      'İleri düzey deneme net analizi ve zayıf konu tespiti',
      'Gelişmiş çalışma planlaması ve hedef takibi',
      'Performans trendleri ve başarı grafikleri',
      'Kapsamlı veli denetim ve karne raporları',
      'Premium ders içerikleri ve video dersler',
      'Gelişmiş bildirimler ve hatırlatmalar',
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
    description: 'Birebir rehberlik, tam veli deneyimi ve sınırsız araçlar.',
    category: 'student',
    monthly_price: 849,
    yearly_price: 8490,
    features: [
      'Pro plandaki tüm özellikler',
      'Tüm dijital ve premium ders içeriklerine tam erişim',
      'Kapsamlı analitik ve derinlemesine akademik teşhis',
      'İleri düzey kişiselleştirme ve çalışma planı optimizasyonu',
      'Eksiksiz gelişim ve veli takip deneyimi',
      'Tüm öğrenci üretkenlik ve disiplin araçları',
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
    monthly_price: 999,
    yearly_price: 9990,
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
    monthly_price: 1999,
    yearly_price: 19990,
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
    monthly_price: 3499,
    yearly_price: 34990,
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
    monthly_price: 799,
    yearly_price: 7990,
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
    monthly_price: 1499,
    yearly_price: 14990,
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
    monthly_price: 2499,
    yearly_price: 24990,
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
    monthly_price: 1199,
    yearly_price: 11990,
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
    monthly_price: 2199,
    yearly_price: 21990,
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
    monthly_price: 3499,
    yearly_price: 34990,
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

export const subscriptionService = {
  /**
   * Fetch all active subscription plans optionally filtered by category
   */
  async getPlans(category?: SubscriptionCategory): Promise<SubscriptionPlan[]> {
    try {
      let query = supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        if (category) {
          return ALL_COMMERCIAL_PLANS.filter((p) => p.category === category);
        }
        return ALL_COMMERCIAL_PLANS;
      }
      return data as SubscriptionPlan[];
    } catch {
      if (category) {
        return ALL_COMMERCIAL_PLANS.filter((p) => p.category === category);
      }
      return ALL_COMMERCIAL_PLANS;
    }
  },

  /**
   * Fetch current subscription state for a user
   */
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) {
        const freePlan = ALL_COMMERCIAL_PLANS.find((p) => p.id === 'free')!;
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

      const plan = ALL_COMMERCIAL_PLANS.find((p) => p.id === data.plan_id) || ALL_COMMERCIAL_PLANS.find((p) => p.id === 'free')!;

      return {
        id: data.id,
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status || 'active',
        current_period_start: data.created_at || new Date().toISOString(),
        current_period_end: data.current_period_end || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        cancel_at_period_end: false,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
        plan,
      } as UserSubscription;
    } catch {
      const freePlan = ALL_COMMERCIAL_PLANS.find((p) => p.id === 'free')!;
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
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  /**
   * Request or change plan for user in Supabase database (source of truth)
   * Writes directly to subscriptions table without any localStorage fallback
   */
  async requestPlanChange(
    userId: string,
    planId: SubscriptionPlanId
  ): Promise<UserSubscription> {
    const isFree = planId === 'free';
    const status: SubscriptionStatus = isFree ? 'active' : 'trialing';

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status,
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw new Error(error.message);
    return await this.getUserSubscription(userId);
  },

  /**
   * Admin-authorized update of user subscription
   */
  async adminUpdateUserSubscription(
    userId: string,
    planId: SubscriptionPlanId,
    status: SubscriptionStatus = 'active'
  ): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status,
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw new Error(error.message);
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
      .select('*, user:profiles!professional_applications_user_id_fkey(id, email, first_name, last_name, role)')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []) as ProfessionalApplication[];
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
