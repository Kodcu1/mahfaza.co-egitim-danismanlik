-- 0010_indexes.sql
-- Mahfaza.co Indexing & Operational Audit Log Architecture

-- Core performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_teacher_id ON public.attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_class_id ON public.homeworks(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id ON public.homework_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_guidance_notes_student_id ON public.guidance_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_guidance_notes_counselor_id ON public.guidance_notes(counselor_id);
CREATE INDEX IF NOT EXISTS idx_coach_students_student_id ON public.coach_students(student_id);
CREATE INDEX IF NOT EXISTS idx_coach_students_coach_id ON public.coach_students(coach_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student_id ON public.parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_student_id ON public.xp_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_reward_requests_student_id ON public.reward_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_reward_requests_status ON public.reward_requests(status);

-- Section 39: Auditability Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS for audit_logs (Strictly Admin only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.is_admin());
