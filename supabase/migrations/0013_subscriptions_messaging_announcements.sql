-- 0013_subscriptions_messaging_announcements.sql
-- Subscriptions, Real Messaging, Announcements, and Enhanced Profile Attributes

-- 1. Extend Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 12);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY, -- 'free', 'standard', 'pro', 'premium'
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    yearly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Subscription Plans
INSERT INTO public.subscription_plans (id, name, description, monthly_price, yearly_price, features, limits, is_active, display_order)
VALUES
    ('free', 'Başlangıç (Ücretsiz)', 'Temel çalışma seansları ve günlük çalışma disiplini.', 0, 0,
     '["Günlük 150 XP kazanım kotası", "Pomodoro çalışma kronometresi", "Temel ödev ve görev teslimi", "Sınıf ders programı görüntüleme", "Genel duyurulara erişim"]'::jsonb,
     '{"daily_xp_cap": 150, "max_active_tasks": 10, "can_message_teachers": false, "vip_content": false}'::jsonb,
     true, 1),
    ('standard', 'Standart Akademik', 'Kapsamlı ders notları, PDF arşivi ve deneme takibi.', 149.00, 1490.00,
     '["Ücretsiz plandaki tüm özellikler", "Tüm ders notları ve PDF dokümanlarına sınırsız erişim", "Haftalık ve aylık çalışma analitiği", "Deneme sınavı net karnesi ve grafikler", "Ödül mağazasında indirimli XP harcama"]'::jsonb,
     '{"daily_xp_cap": 150, "max_active_tasks": 50, "can_message_teachers": false, "vip_content": false}'::jsonb,
     true, 2),
    ('pro', 'Pro Akademi', 'Video dersler, interaktif testler ve eğitmen mesajlaşması.', 299.00, 2990.00,
     '["Standart plandaki tüm özellikler", "HD video dersler ve online test modülleri", "Öğretmenler ve danışmanlarla doğrudan mesajlaşma", "Yapay zeka koçluk analizi ve zayıf konu tespiti", "Öncelikli ödev değerlendirme"]'::jsonb,
     '{"daily_xp_cap": 250, "max_active_tasks": 200, "can_message_teachers": true, "vip_content": true}'::jsonb,
     true, 3),
    ('premium', 'Premium VIP', 'Birebir rehberlik seansları, veli raporları ve tam mentorluk.', 499.00, 4990.00,
     '["Pro plandaki tüm özellikler", "Birebir eğitim koçu ve rehberlik randevuları", "Detaylı veli gelişim ve denetim raporları", "VIP deneme sınavları ve soru çözüm desteği", "Özel mentörlük ve 7/24 öncelikli destek"]'::jsonb,
     '{"daily_xp_cap": 500, "max_active_tasks": 999, "can_message_teachers": true, "vip_content": true}'::jsonb,
     true, 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    features = EXCLUDED.features,
    limits = EXCLUDED.limits,
    display_order = EXCLUDED.display_order;

-- 3. User Subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_subscription UNIQUE (user_id)
);

-- 4. Messaging Architecture (Conversations, Participants, Messages)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Announcements System
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_role user_role, -- NULL means all roles
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT true,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(is_published, target_role, created_at DESC);

-- Enable RLS across all new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Subscription Plans RLS: Everyone can read plans
CREATE POLICY "subscription_plans_read" ON public.subscription_plans
    FOR SELECT TO authenticated USING (true);

-- User Subscriptions RLS: Users can view their own, admins can view/manage all
CREATE POLICY "user_subscriptions_read" ON public.user_subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "user_subscriptions_admin_write" ON public.user_subscriptions
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Conversations RLS: Only participants can view
CREATE POLICY "conversations_participant_select" ON public.conversations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
        )
        OR public.is_admin()
    );

-- Conversation Participants RLS:
CREATE POLICY "conv_participants_select" ON public.conversation_participants
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "conv_participants_insert" ON public.conversation_participants
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "conv_participants_update" ON public.conversation_participants
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Messages RLS: Only conversation participants can view and send messages
CREATE POLICY "messages_participant_select" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "messages_participant_insert" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
        )
    );

-- Announcements RLS:
CREATE POLICY "announcements_read" ON public.announcements
    FOR SELECT TO authenticated
    USING (
        (is_published = true AND (target_role IS NULL OR target_role = (SELECT role FROM public.profiles WHERE id = auth.uid())))
        OR public.is_admin()
    );

CREATE POLICY "announcements_admin_manage" ON public.announcements
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
