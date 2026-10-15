-- ==============================================================================
-- 0019: Explicit Student INSERT & UPDATE permission on exam_results
-- ==============================================================================

-- Allow students to insert their own exam results
DROP POLICY IF EXISTS "exam_results_student_insert" ON public.exam_results;
CREATE POLICY "exam_results_student_insert" ON public.exam_results
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

-- Allow students to update their own exam results
DROP POLICY IF EXISTS "exam_results_student_update" ON public.exam_results;
CREATE POLICY "exam_results_student_update" ON public.exam_results
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Allow students to delete their own exam results
DROP POLICY IF EXISTS "exam_results_student_delete" ON public.exam_results;
CREATE POLICY "exam_results_student_delete" ON public.exam_results
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());
