-- 0014_commercial_plans_and_applications.sql
-- Mahfaza.co Commercial Architecture: Plans, Entitlements, Capacity, and Professional Applications

-- 1. Extend Subscription Plans Table
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'student' CHECK (category IN ('student', 'coach', 'teacher', 'counselor', 'institution'));
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS student_capacity INTEGER DEFAULT NULL;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS entitlements JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Seed All Commercial Plans (Students, Coaches, Teachers, Counselors)
INSERT INTO public.subscription_plans (
    id, name, description, category, monthly_price, yearly_price, student_capacity, features, limits, entitlements, is_active, display_order
)
VALUES
    -- STUDENT PLANS
    ('free', 'Başlangıç (Ücretsiz)', 'Temel çalışma seansları ve günlük çalışma disiplini.', 'student', 0, 0, NULL,
     '["Temel profil ve ders programı", "Temel ders notu ve özetlere erişim", "Sınırlı ödev teslimi (Maks 10)", "Günlük 150 XP kazanım kotası", "Seri takibi ve rozetler", "Temel sınav ve deneme sonuçları", "Genel duyurular ve temel bildirimler"]'::jsonb,
     '{"daily_xp_cap": 150, "max_active_tasks": 10, "can_message_teachers": false, "vip_content": false}'::jsonb,
     '["student.profile.basic", "student.content.basic", "student.tasks.basic", "student.schedule.basic", "student.xp.basic", "student.streak.basic", "student.exam.basic", "student.announcements", "student.notifications.basic", "student.messaging.basic"]'::jsonb,
     true, 1),

    ('standard', 'Standart Akademik', 'Kapsamlı ders notları, PDF arşivi ve deneme analizi.', 'student', 349.00, 3490.00, NULL,
     '["Ücretsiz plandaki tüm özellikler", "Genişletilmiş ders notları ve PDF arşivi", "Genişletilmiş ödev ve görev sistemi", "Detaylı sınav net analizi ve karne", "Gelişmiş gelişim ve performans takibi", "Standart veli paylaşım raporları", "Standart akademik mesajlaşma"]'::jsonb,
     '{"daily_xp_cap": 150, "max_active_tasks": 50, "can_message_teachers": false, "vip_content": false}'::jsonb,
     '["student.profile.basic", "student.content.basic", "student.content.expanded", "student.tasks.basic", "student.tasks.expanded", "student.schedule.basic", "student.xp.basic", "student.streak.basic", "student.exam.basic", "student.exam.results", "student.exam.analysis_standard", "student.progress.expanded", "student.reports.standard", "student.parent_sharing.standard", "student.messaging.standard", "student.academic_tools.expanded", "student.announcements", "student.notifications.basic"]'::jsonb,
     true, 2),

    ('pro', 'Pro Akademi', 'Gelişmiş analizler, hedefler ve video ders modülleri.', 'student', 549.00, 5490.00, NULL,
     '["Standart plandaki tüm özellikler", "İleri düzey deneme net analizi ve zayıf konu tespiti", "Gelişmiş çalışma planlaması ve hedef takibi", "Performans trendleri ve başarı grafikleri", "Kapsamlı veli denetim ve karne raporları", "Premium ders içerikleri ve video dersler", "Gelişmiş bildirimler ve hatırlatmalar"]'::jsonb,
     '{"daily_xp_cap": 250, "max_active_tasks": 200, "can_message_teachers": true, "vip_content": true}'::jsonb,
     '["student.profile.basic", "student.content.basic", "student.content.expanded", "student.content.premium", "student.tasks.basic", "student.tasks.expanded", "student.tasks.advanced", "student.schedule.basic", "student.xp.basic", "student.streak.basic", "student.exam.basic", "student.exam.results", "student.exam.analysis_standard", "student.exam.analysis_advanced", "student.progress.expanded", "student.reports.standard", "student.reports.advanced", "student.analytics.advanced", "student.planning.advanced", "student.goal_tracking", "student.performance_trends", "student.parent_reports.advanced", "student.messaging.standard", "student.academic_tools.expanded", "student.notifications.advanced"]'::jsonb,
     true, 3),

    ('premium', 'Premium VIP', 'Birebir rehberlik, tam veli deneyimi ve sınırsız araçlar.', 'student', 849.00, 8490.00, NULL,
     '["Pro plandaki tüm özellikler", "Tüm dijital ve premium ders içeriklerine tam erişim", "Kapsamlı analitik ve derinlemesine akademik teşhis", "İleri düzey kişiselleştirme ve çalışma planı optimizasyonu", "Eksiksiz gelişim ve veli takip deneyimi", "Tüm öğrenci üretkenlik ve disiplin araçları"]'::jsonb,
     '{"daily_xp_cap": 500, "max_active_tasks": 999, "can_message_teachers": true, "vip_content": true}'::jsonb,
     '["student.profile.basic", "student.content.basic", "student.content.expanded", "student.content.premium", "student.content.full_premium", "student.tasks.basic", "student.tasks.expanded", "student.tasks.advanced", "student.schedule.basic", "student.xp.basic", "student.streak.basic", "student.exam.basic", "student.exam.results", "student.exam.analysis_standard", "student.exam.analysis_advanced", "student.analytics.comprehensive", "student.reports.full", "student.parent_experience.full", "student.personalization.advanced", "student.productivity.full", "student.messaging.standard", "student.notifications.advanced"]'::jsonb,
     true, 4),

    -- COACH PLANS
    ('coach_starter', 'Koç Başlangıç', '10 öğrenciye kadar profesyonel koçluk yönetimi.', 'coach', 999.00, 9990.00, 10,
     '["10 öğrenci kapasitesi", "Öğrenci yönetimi ve profil kartları", "Görev ve çalışma planlaması", "Öğrenci gelişim takibi ve temel raporlar", "Doğrudan mesajlaşma ve veli görünürlüğü", "Temel deneme ve net analizi"]'::jsonb,
     '{"student_capacity": 10}'::jsonb,
     '["coach.student_management", "coach.task_management", "coach.study_planning", "coach.student_progress", "coach.reports.basic", "coach.messaging", "coach.parent_visibility", "coach.exam_analysis.basic"]'::jsonb,
     true, 5),

    ('coach_pro', 'Koç Profesyonel', '30 öğrenciye kadar gelişmiş analitik ve risk takibi.', 'coach', 1999.00, 19990.00, 30,
     '["30 öğrenci kapasitesi", "Koç Başlangıçtaki tüm özellikler", "Gelişmiş öğrenci analitiği ve risk tespiti", "İleri düzey çalışma planlaması ve hedef takibi", "Genişletilmiş veli raporlaması", "Toplu işlemler ve gelişmiş bildirimler"]'::jsonb,
     '{"student_capacity": 30}'::jsonb,
     '["coach.student_management", "coach.task_management", "coach.study_planning", "coach.study_planning.advanced", "coach.student_progress", "coach.reports.basic", "coach.reports.advanced", "coach.analytics.advanced", "coach.performance_risk_tracking", "coach.parent_reporting.expanded", "coach.bulk_operations", "coach.messaging", "coach.notifications.advanced", "coach.exam_analysis.basic"]'::jsonb,
     true, 6),

    ('coach_elite', 'Koç Elit', '75 öğrenciye kadar kapsamlı koçluk masası.', 'coach', 3499.00, 34990.00, 75,
     '["75 öğrenci kapasitesi", "Koç Profesyoneldeki tüm özellikler", "İleri düzey profesyonel analitik ve derin raporlama", "Genişletilmiş öğrenci ve portföy yönetimi", "Toplu yönetim araçları ve profesyonel kontrol paneli"]'::jsonb,
     '{"student_capacity": 75}'::jsonb,
     '["coach.student_management", "coach.student_management.expanded", "coach.task_management", "coach.study_planning", "coach.study_planning.advanced", "coach.student_progress", "coach.reports.basic", "coach.reports.advanced", "coach.analytics.advanced", "coach.analytics.professional", "coach.performance_risk_tracking", "coach.parent_reporting.expanded", "coach.bulk_operations", "coach.bulk_management", "coach.dashboard.professional", "coach.messaging", "coach.notifications.advanced"]'::jsonb,
     true, 7),

    -- TEACHER PLANS
    ('teacher_starter', 'Öğretmen Başlangıç', '30 öğrenciye kadar sınıf ve ders yönetimi.', 'teacher', 799.00, 7990.00, 30,
     '["30 öğrenci kapasitesi", "Sınıf ve şube yönetimi", "Öğrenci yönetimi ve listesi", "İçerik yayınlama ve ders materyalleri", "Ödev ve deneme sınavı yönetimi", "Yoklama alma ve temel raporlar", "Doğrudan mesajlaşma"]'::jsonb,
     '{"student_capacity": 30}'::jsonb,
     '["teacher.class_management", "teacher.student_management", "teacher.content_publishing", "teacher.homework", "teacher.exams", "teacher.attendance", "teacher.reports.basic", "teacher.messaging"]'::jsonb,
     true, 8),

    ('teacher_pro', 'Öğretmen Profesyonel', '100 öğrenciye kadar genişletilmiş sınıf araçları.', 'teacher', 1499.00, 14990.00, 100,
     '["100 öğrenci kapasitesi", "Öğretmen Başlangıçtaki tüm özellikler", "Genişletilmiş sınıf ve şube kapasitesi", "Gelişmiş akademik analitik ve raporlar", "Genişletilmiş içerik yönetimi", "İleri düzey öğrenci ilerleme takibi ve toplu işlemler"]'::jsonb,
     '{"student_capacity": 100}'::jsonb,
     '["teacher.class_management", "teacher.class_management.expanded", "teacher.student_management", "teacher.content_publishing", "teacher.content_management.expanded", "teacher.homework", "teacher.exams", "teacher.attendance", "teacher.reports.basic", "teacher.reports.advanced", "teacher.analytics.advanced", "teacher.student_progress.advanced", "teacher.bulk_operations", "teacher.messaging"]'::jsonb,
     true, 9),

    ('teacher_elite', 'Öğretmen Elit', '250 öğrenciye kadar büyük ölçekli akademik yönetim.', 'teacher', 2499.00, 24990.00, 250,
     '["250 öğrenci kapasitesi", "Öğretmen Profesyoneldeki tüm özellikler", "İleri düzey akademik analitik", "Büyük ölçekli öğrenci yönetimi", "Gelişmiş raporlama ve içerik araçları", "Gelişmiş idari yetenekler"]'::jsonb,
     '{"student_capacity": 250}'::jsonb,
     '["teacher.class_management", "teacher.class_management.expanded", "teacher.student_management", "teacher.student_management.large_scale", "teacher.content_publishing", "teacher.content_management.expanded", "teacher.content_tools.expanded", "teacher.homework", "teacher.exams", "teacher.attendance", "teacher.reports.basic", "teacher.reports.advanced", "teacher.analytics.advanced", "teacher.student_progress.advanced", "teacher.bulk_operations", "teacher.administrative.authorized", "teacher.messaging"]'::jsonb,
     true, 10),

    -- COUNSELOR PLANS
    ('counselor_starter', 'Rehberlik Başlangıç', '30 öğrenciye kadar rehberlik takibi.', 'counselor', 1199.00, 11990.00, 30,
     '["30 öğrenci kapasitesi", "Öğrenci gelişim takibi", "Gizli rehberlik notları (RLS korumalı)", "Öğrenci takip ve görüşme planı", "Veli raporlaması ve akademik ilerleme", "Güvenli iletişim araçları"]'::jsonb,
     '{"student_capacity": 30}'::jsonb,
     '["counselor.student_development", "counselor.guidance_notes", "counselor.student_follow_up", "counselor.parent_reporting", "counselor.academic_progress", "counselor.communication", "counselor.reports"]'::jsonb,
     true, 11),

    ('counselor_pro', 'Rehberlik Profesyonel', '100 öğrenciye kadar genişletilmiş danışmanlık.', 'counselor', 2199.00, 21990.00, 100,
     '["100 öğrenci kapasitesi", "Rehberlik Başlangıçtaki tüm özellikler", "Gelişmiş rehberlik analitiği", "Kapsamlı gelişim takibi ve raporlar", "Toplu işlemler ve iletişim araçları"]'::jsonb,
     '{"student_capacity": 100}'::jsonb,
     '["counselor.student_development", "counselor.guidance_notes", "counselor.student_follow_up", "counselor.parent_reporting", "counselor.academic_progress", "counselor.communication", "counselor.reports", "counselor.analytics.advanced", "counselor.bulk_operations"]'::jsonb,
     true, 12),

    ('counselor_elite', 'Rehberlik Elit', '250 öğrenciye kadar büyük ölçekli rehberlik masası.', 'counselor', 3499.00, 34990.00, 250,
     '["250 öğrenci kapasitesi", "Rehberlik Profesyoneldeki tüm özellikler", "İleri düzey profesyonel analitik", "Büyük ölçekli danışan portföyü", "Kapsamlı veli ve okul raporlama modülü"]'::jsonb,
     '{"student_capacity": 250}'::jsonb,
     '["counselor.student_development", "counselor.guidance_notes", "counselor.student_follow_up", "counselor.parent_reporting", "counselor.academic_progress", "counselor.communication", "counselor.reports", "counselor.analytics.advanced", "counselor.analytics.professional", "counselor.large_scale", "counselor.bulk_operations"]'::jsonb,
     true, 13)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    student_capacity = EXCLUDED.student_capacity,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    entitlements = EXCLUDED.entitlements,
    display_order = EXCLUDED.display_order;

-- 3. Professional Applications Table
CREATE TABLE IF NOT EXISTS public.professional_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_role user_role NOT NULL CHECK (requested_role IN ('teacher', 'coach', 'counselor')),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    institution TEXT,
    experience_years INTEGER,
    bio TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_application UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_prof_apps_user ON public.professional_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_prof_apps_status ON public.professional_applications(status);

-- Enable Row Level Security on professional_applications
ALTER TABLE public.professional_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies on professional_applications
-- Applicant can see only their own application; Admins see all
CREATE POLICY "prof_apps_select" ON public.professional_applications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

-- User can submit their own application (cannot specify another user_id)
CREATE POLICY "prof_apps_insert" ON public.professional_applications
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Only admins can update applications (approve/reject/reason). Users CANNOT approve themselves.
CREATE POLICY "prof_apps_update" ON public.professional_applications
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete applications
CREATE POLICY "prof_apps_delete" ON public.professional_applications
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 5. Helper Function: Check Capacity in Backend/Database Logic
CREATE OR REPLACE FUNCTION public.get_professional_student_capacity(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_capacity INTEGER;
BEGIN
    SELECT COALESCE(sp.student_capacity, 9999) INTO v_capacity
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id AND us.status = 'active';

    IF v_capacity IS NULL THEN
        -- Default minimal fallback if no active subscription
        v_capacity := 10;
    END IF;

    RETURN v_capacity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
