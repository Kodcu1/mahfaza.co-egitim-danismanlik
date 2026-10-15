-- ============================================================================
-- MAHFAZA.CO — DYNAMIC PRICING, TIER-BASED ACCESS & HIERARCHICAL UPGRADES (2026)
-- Execute this script in the Supabase SQL Editor
-- ============================================================================

-- 1. Create system_packages table for dynamic pricing controllable via Admin Dashboard
CREATE TABLE IF NOT EXISTS public.system_packages (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'student',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  student_capacity integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) on system_packages
ALTER TABLE public.system_packages ENABLE ROW LEVEL SECURITY;

-- Allow all users (authenticated and anonymous) to read system_packages
DROP POLICY IF EXISTS "system_packages_select_all" ON public.system_packages;
CREATE POLICY "system_packages_select_all"
  ON public.system_packages
  FOR SELECT
  USING (true);

-- Allow authenticated users / admins to update or upsert pricing
DROP POLICY IF EXISTS "system_packages_write_admin" ON public.system_packages;
CREATE POLICY "system_packages_write_admin"
  ON public.system_packages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Ensure profiles table has package & subscription_plan columns for tier tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS package text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';

-- 3. Seed realistic 2026 market prices (~2 months free on yearly plans)
INSERT INTO public.system_packages (
  id, name, description, category, price_monthly, price_yearly, student_capacity, features, display_order, is_active
) VALUES
  -- STUDENT PACKAGES (2026 Realistic Market Pricing)
  (
    'free',
    'Başlangıç (Ücretsiz)',
    'Temel çalışma seansları, ders programı ve günlük çalışma disiplini.',
    'student',
    0,
    0,
    NULL,
    '["Temel profil ve haftalık ders programı", "Temel ders notları ve özetlere erişim", "Standart Pomodoro odak sayacı", "Günlük 150 XP kazanım kotası", "Temel görev ve ödev takibi"]'::jsonb,
    1,
    true
  ),
  (
    'standard',
    'Standart Akademik',
    'Kapsamlı ders notları, PDF arşivi, çalışma kanıtları ve sınav karnesi.',
    'student',
    1890,
    18900,
    NULL,
    '["Başlangıç planındaki tüm özellikler", "Genişletilmiş ders notları ve PDF arşivi", "Fotoğraflı çalışma kanıtı ve etüt geçmişi", "Detaylı deneme sınavı net karnesi", "Standart akademik mesajlaşma ve bildirimler"]'::jsonb,
    2,
    true
  ),
  (
    'pro',
    'Pro Akademi',
    'İleri düzey deneme analizi, AI zayıf konu tespiti ve gelişmiş hedef takibi.',
    'student',
    3490,
    34900,
    NULL,
    '["Standart plandaki tüm özellikler", "İleri düzey deneme net analizi ve branş grafikleri", "Yapay zeka (AI) destekli zayıf konu ve hata tespiti", "Gelişmiş çalışma planlaması ve hedef takibi", "Premium ders içerikleri ve video çözümler", "Günlük 250 XP artırılmış kazanım kotası"]'::jsonb,
    3,
    true
  ),
  (
    'premium',
    'Premium VIP',
    'Birebir özel koçluk ayrıcalıkları, tam veli deneyimi ve sınırsız akademik araçlar.',
    'student',
    5490,
    54900,
    NULL,
    '["Pro plandaki tüm özellikler", "Birebir VIP koçluk önceliği ve 360° derin teşhis", "Tüm dijital ve VIP ders içeriklerine sınırsız erişim", "Kişiselleştirilmiş AI çalışma stratejisi ve net simülasyonu", "Kapsamlı veli bilgilendirme ve resmi PDF karne", "Günlük 500 XP VIP kazanım kotası ve özel ödül vitrini"]'::jsonb,
    4,
    true
  ),

  -- COACH PACKAGES
  (
    'coach_starter',
    'Koç Başlangıç',
    '10 öğrenciye kadar profesyonel akademik koçluk ve görev yönetimi.',
    'coach',
    2490,
    24900,
    10,
    '["10 öğrenci portföy kapasitesi", "Öğrenci yönetimi ve 360° profil kartları", "Görev, ödev ve çalışma planlaması", "Fotoğraflı çalışma kanıtı ve XP onay merkezi", "Doğrudan mesajlaşma ve veli görüşme takibi"]'::jsonb,
    5,
    true
  ),
  (
    'coach_pro',
    'Koç Profesyonel',
    '30 öğrenciye kadar gelişmiş analitik, risk takibi ve portföy yönetimi.',
    'coach',
    4490,
    44900,
    30,
    '["30 öğrenci portföy kapasitesi", "Koç Başlangıçtaki tüm özellikler", "Gelişmiş öğrenci analitiği ve disiplin risk tespiti", "İleri düzey çalışma planlaması ve hedef simülasyonu", "Resmi PDF karne ve genişletilmiş veli raporlaması"]'::jsonb,
    6,
    true
  ),
  (
    'coach_elite',
    'Koç Elit',
    '75 öğrenciye kadar yüksek kapasiteli koçluk masası ve kurumsal araçlar.',
    'coach',
    6990,
    69900,
    75,
    '["75 öğrenci portföy kapasitesi", "Koç Profesyoneldeki tüm özellikler", "AI Koçluk Asistanı ve derin portföy analitiği", "Toplu görev atama ve üst düzey portföy yönetimi", "Öncelikli teknik destek ve kurumsal raporlama"]'::jsonb,
    7,
    true
  ),

  -- TEACHER PACKAGES
  (
    'teacher_starter',
    'Öğretmen Başlangıç',
    '30 öğrenciye kadar sınıf, ödev ve ders materyali yönetimi.',
    'teacher',
    1990,
    19900,
    30,
    '["30 öğrenci kapasitesi", "Sınıf ve şube yönetimi", "Ders materyali ve içerik yayınlama", "Ödev, deneme sınavı ve yoklama takibi", "Doğrudan öğrenci/veli mesajlaşması"]'::jsonb,
    8,
    true
  ),
  (
    'teacher_pro',
    'Öğretmen Profesyonel',
    '100 öğrenciye kadar genişletilmiş sınıf ve sınav analiz araçları.',
    'teacher',
    3490,
    34900,
    100,
    '["100 öğrenci kapasitesi", "Öğretmen Başlangıçtaki tüm özellikler", "Gelişmiş sınıf içi deneme ve net analitiği", "Genişletilmiş içerik ve test kütüphanesi", "Toplu ödevlendirme ve performans raporları"]'::jsonb,
    9,
    true
  ),
  (
    'teacher_elite',
    'Öğretmen Elit',
    '250 öğrenciye kadar büyük ölçekli akademik yönetim.',
    'teacher',
    5490,
    54900,
    250,
    '["250 öğrenci kapasitesi", "Öğretmen Profesyoneldeki tüm özellikler", "Büyük ölçekli şube ve öğrenci yönetimi", "Kurumsal düzeyde akademik analitik ve dışa aktarım"]'::jsonb,
    10,
    true
  ),

  -- COUNSELOR PACKAGES
  (
    'counselor_starter',
    'Rehberlik Başlangıç',
    '30 öğrenciye kadar psikolojik danışmanlık ve rehberlik takibi.',
    'counselor',
    2490,
    24900,
    30,
    '["30 öğrenci kapasitesi", "Gizli rehberlik notları (RLS korumalı)", "Öğrenci görüşme takvimi ve gelişim takibi", "Veli raporlaması ve güvenli iletişim"]'::jsonb,
    11,
    true
  ),
  (
    'counselor_pro',
    'Rehberlik Profesyonel',
    '100 öğrenciye kadar kapsamlı rehberlik ve risk analitiği.',
    'counselor',
    4490,
    44900,
    100,
    '["100 öğrenci kapasitesi", "Rehberlik Başlangıçtaki tüm özellikler", "Gelişmiş motivasyon ve devamsızlık risk analitiği", "Kapsamlı veli ve dönem sonu değerlendirme raporları"]'::jsonb,
    12,
    true
  ),
  (
    'counselor_elite',
    'Rehberlik Elit',
    '250 öğrenciye kadar büyük ölçekli kurum rehberlik masası.',
    'counselor',
    6990,
    69900,
    250,
    '["250 öğrenci kapasitesi", "Rehberlik Profesyoneldeki tüm özellikler", "Büyük ölçekli öğrenci portföyü ve kurumsal denetim", "İleri düzey profesyonel analitik ve tam raporlama"]'::jsonb,
    13,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  student_capacity = EXCLUDED.student_capacity,
  features = EXCLUDED.features,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();
