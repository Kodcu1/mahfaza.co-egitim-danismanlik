-- 0005_guidance.sql
-- Mahfaza.co Counselor Guidance Notes (High Sensitivity Isolated Data)

CREATE TABLE IF NOT EXISTS public.guidance_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    counselor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    private_note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS set_guidance_notes_updated_at ON public.guidance_notes;
CREATE TRIGGER set_guidance_notes_updated_at
    BEFORE UPDATE ON public.guidance_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
