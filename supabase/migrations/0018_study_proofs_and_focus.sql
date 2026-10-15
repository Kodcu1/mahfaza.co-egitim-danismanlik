-- ==============================================================================
-- 0018: Study Proofs & Coach Verification Pipeline
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.study_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subject_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 0,
    question_count INT NOT NULL DEFAULT 0,
    study_note TEXT,
    proof_photo_url TEXT NOT NULL, -- Zorunlu fotoğraflı kanıt
    calculated_xp INT NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    coach_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Indexing for fast queries
CREATE INDEX IF NOT EXISTS idx_study_proofs_student_id ON public.study_proofs(student_id);
CREATE INDEX IF NOT EXISTS idx_study_proofs_coach_id ON public.study_proofs(coach_id);
CREATE INDEX IF NOT EXISTS idx_study_proofs_status ON public.study_proofs(status);

-- Storage bucket for study proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('study_proofs', 'study_proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated users to upload study proof photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study_proofs');

CREATE POLICY "Allow public/authenticated to view study proof photos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'study_proofs');

-- Enable RLS
ALTER TABLE public.study_proofs ENABLE ROW LEVEL SECURITY;

-- Students can view their own proofs
CREATE POLICY "Students can view their own study proofs"
ON public.study_proofs FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Students can insert their own study proofs
CREATE POLICY "Students can insert their own study proofs"
ON public.study_proofs FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- Coaches can view study proofs of their assigned students
CREATE POLICY "Coaches can view assigned students study proofs"
ON public.study_proofs FOR SELECT
TO authenticated
USING (
    coach_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coach_students cs
        WHERE cs.coach_id = auth.uid() AND cs.student_id = public.study_proofs.student_id
    ) OR
    EXISTS (
        SELECT 1 FROM public.coach_student_links csl
        WHERE csl.coach_id = auth.uid() AND csl.student_id = public.study_proofs.student_id
    )
);

-- Coaches can update status and feedback of assigned students' study proofs
CREATE POLICY "Coaches can update assigned students study proofs"
ON public.study_proofs FOR UPDATE
TO authenticated
USING (
    coach_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coach_students cs
        WHERE cs.coach_id = auth.uid() AND cs.student_id = public.study_proofs.student_id
    ) OR
    EXISTS (
        SELECT 1 FROM public.coach_student_links csl
        WHERE csl.coach_id = auth.uid() AND csl.student_id = public.study_proofs.student_id
    )
)
WITH CHECK (
    coach_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.coach_students cs
        WHERE cs.coach_id = auth.uid() AND cs.student_id = public.study_proofs.student_id
    ) OR
    EXISTS (
        SELECT 1 FROM public.coach_student_links csl
        WHERE csl.coach_id = auth.uid() AND csl.student_id = public.study_proofs.student_id
    )
);
