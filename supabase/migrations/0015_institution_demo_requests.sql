-- 0015_institution_demo_requests.sql
-- Mahfaza.co Institutional Demo & Lead Request Architecture
-- Prevents public admin self-registration while safely capturing B2B institutional requests.

CREATE TABLE IF NOT EXISTS public.institution_demo_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    institution_type TEXT,
    student_count INTEGER,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.institution_demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON public.institution_demo_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.institution_demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/authenticated) to submit an institutional demo request
DROP POLICY IF EXISTS "demo_requests_insert_public" ON public.institution_demo_requests;
CREATE POLICY "demo_requests_insert_public" ON public.institution_demo_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Only administrators can view, manage, and update demo requests
DROP POLICY IF EXISTS "demo_requests_admin_select" ON public.institution_demo_requests;
CREATE POLICY "demo_requests_admin_select" ON public.institution_demo_requests
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "demo_requests_admin_update" ON public.institution_demo_requests;
CREATE POLICY "demo_requests_admin_update" ON public.institution_demo_requests
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "demo_requests_admin_delete" ON public.institution_demo_requests;
CREATE POLICY "demo_requests_admin_delete" ON public.institution_demo_requests
    FOR DELETE TO authenticated
    USING (public.is_admin());
