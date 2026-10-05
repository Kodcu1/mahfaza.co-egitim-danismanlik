-- 0016_coach_workspace_and_pairing.sql
-- Mahfaza.co Coach-Student Relationships, Coach Tasks, and Parent Meetings

CREATE TABLE IF NOT EXISTS public.coach_students (
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (coach_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.coach_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 10 AND xp_reward <= 150),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'verified', 'cancelled')),
    student_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.coach_parent_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    meeting_date TIMESTAMPTZ NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'online' CHECK (meeting_type IN ('online', 'in_person', 'phone')),
    notes TEXT,
    action_items TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.coach_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_parent_meetings ENABLE ROW LEVEL SECURITY;

-- Policies for coach_students
DROP POLICY IF EXISTS "coach_students_select" ON public.coach_students;
CREATE POLICY "coach_students_select" ON public.coach_students
    FOR SELECT TO authenticated
    USING (
        coach_id = auth.uid()
        OR student_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_students_insert" ON public.coach_students;
CREATE POLICY "coach_students_insert" ON public.coach_students
    FOR INSERT TO authenticated
    WITH CHECK (
        (coach_id = auth.uid() AND (public.is_coach() OR public.is_admin()))
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_students_delete" ON public.coach_students;
CREATE POLICY "coach_students_delete" ON public.coach_students
    FOR DELETE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    );

-- Policies for coach_tasks
DROP POLICY IF EXISTS "coach_tasks_select" ON public.coach_tasks;
CREATE POLICY "coach_tasks_select" ON public.coach_tasks
    FOR SELECT TO authenticated
    USING (
        coach_id = auth.uid()
        OR student_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_tasks_insert" ON public.coach_tasks;
CREATE POLICY "coach_tasks_insert" ON public.coach_tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        coach_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_tasks_update" ON public.coach_tasks;
CREATE POLICY "coach_tasks_update" ON public.coach_tasks
    FOR UPDATE TO authenticated
    USING (
        coach_id = auth.uid()
        OR student_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_tasks_delete" ON public.coach_tasks;
CREATE POLICY "coach_tasks_delete" ON public.coach_tasks
    FOR DELETE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    );

-- Policies for coach_parent_meetings
DROP POLICY IF EXISTS "coach_meetings_select" ON public.coach_parent_meetings;
CREATE POLICY "coach_meetings_select" ON public.coach_parent_meetings
    FOR SELECT TO authenticated
    USING (
        coach_id = auth.uid()
        OR student_id = auth.uid()
        OR parent_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_meetings_insert" ON public.coach_parent_meetings;
CREATE POLICY "coach_meetings_insert" ON public.coach_parent_meetings
    FOR INSERT TO authenticated
    WITH CHECK (
        coach_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_meetings_update" ON public.coach_parent_meetings;
CREATE POLICY "coach_meetings_update" ON public.coach_parent_meetings
    FOR UPDATE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "coach_meetings_delete" ON public.coach_parent_meetings;
CREATE POLICY "coach_meetings_delete" ON public.coach_parent_meetings
    FOR DELETE TO authenticated
    USING (
        coach_id = auth.uid()
        OR public.is_admin()
    );

-- Seed Demo Coach ↔ Demo Student Relationship (Idempotent)
DO $$
DECLARE
    v_coach_id UUID;
    v_student_id UUID;
BEGIN
    SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'demo.koc@mahfaza.co';
    SELECT id INTO v_student_id FROM public.profiles WHERE email = 'demo.ogrenci@mahfaza.co';

    IF v_coach_id IS NOT NULL AND v_student_id IS NOT NULL THEN
        INSERT INTO public.coach_students (coach_id, student_id)
        VALUES (v_coach_id, v_student_id)
        ON CONFLICT (coach_id, student_id) DO NOTHING;
    END IF;
END $$;
