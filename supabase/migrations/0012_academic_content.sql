-- 0012_academic_content.sql
-- Academic Content Management (Ders Notları, PDF, Video, Görsel, Test)

CREATE TABLE IF NOT EXISTS public.academic_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('lesson_note', 'pdf', 'video', 'image', 'text', 'test')),
    thumbnail_url TEXT,
    body TEXT,
    file_url TEXT,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security
ALTER TABLE public.academic_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Read: Published content is viewable by all authenticated users. Unpublished content is viewable by its author or admin.
CREATE POLICY "academic_content_select"
    ON public.academic_content
    FOR SELECT
    TO authenticated
    USING (
        is_published = true
        OR author_id = auth.uid()
        OR public.is_admin()
    );

-- 2. Insert: Only teachers or admins can create content.
CREATE POLICY "academic_content_insert"
    ON public.academic_content
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_admin() OR public.is_teacher())
        AND author_id = auth.uid()
    );

-- 3. Update: Admins can update any content. Teachers can update only their own content.
CREATE POLICY "academic_content_update"
    ON public.academic_content
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (public.is_teacher() AND author_id = auth.uid())
    )
    WITH CHECK (
        public.is_admin()
        OR (public.is_teacher() AND author_id = auth.uid())
    );

-- 4. Delete: Admins can delete any content. Teachers can delete only their own content.
CREATE POLICY "academic_content_delete"
    ON public.academic_content
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (public.is_teacher() AND author_id = auth.uid())
    );

-- Indexes for lightning-fast queries and filters
CREATE INDEX IF NOT EXISTS idx_academic_content_category ON public.academic_content(category);
CREATE INDEX IF NOT EXISTS idx_academic_content_type ON public.academic_content(content_type);
CREATE INDEX IF NOT EXISTS idx_academic_content_subject ON public.academic_content(subject_id);
CREATE INDEX IF NOT EXISTS idx_academic_content_author ON public.academic_content(author_id);
CREATE INDEX IF NOT EXISTS idx_academic_content_published ON public.academic_content(is_published, created_at DESC);
