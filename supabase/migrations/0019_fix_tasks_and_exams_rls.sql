-- ==============================================================================
-- 0019: Fix Database Constraints and RLS Policies for Tasks, Exam Results, and Study Proofs
-- ==============================================================================

-- 1. Ensure tasks table foreign key references profiles(id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_student_id_fkey;
    ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_student_id_fkey 
      FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Coaches can create tasks for their students" ON public.tasks;
    CREATE POLICY "Coaches can create tasks for their students"
      ON public.tasks FOR INSERT
      TO authenticated
      WITH CHECK (coach_id = auth.uid());

    DROP POLICY IF EXISTS "Students can view their assigned tasks" ON public.tasks;
    CREATE POLICY "Students can view their assigned tasks"
      ON public.tasks FOR SELECT
      TO authenticated
      USING (student_id = auth.uid() OR coach_id = auth.uid());

    DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
    CREATE POLICY "Users can update their tasks"
      ON public.tasks FOR UPDATE
      TO authenticated
      USING (student_id = auth.uid() OR coach_id = auth.uid())
      WITH CHECK (student_id = auth.uid() OR coach_id = auth.uid());

    DROP POLICY IF EXISTS "Coaches can delete tasks" ON public.tasks;
    CREATE POLICY "Coaches can delete tasks"
      ON public.tasks FOR DELETE
      TO authenticated
      USING (coach_id = auth.uid());
  END IF;
END $$;

-- 2. Ensure exam_results RLS policies allow students to insert and view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_results') THEN
    ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Students can insert own exam results" ON public.exam_results;
    CREATE POLICY "Students can insert own exam results"
      ON public.exam_results FOR INSERT
      TO authenticated
      WITH CHECK (student_id = auth.uid());

    DROP POLICY IF EXISTS "Users can view their exam results" ON public.exam_results;
    CREATE POLICY "Users can view their exam results"
      ON public.exam_results FOR SELECT
      TO authenticated
      USING (
        student_id = auth.uid() 
        OR EXISTS (
          SELECT 1 FROM public.coach_students cs 
          WHERE cs.student_id = public.exam_results.student_id 
          AND cs.coach_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.coach_student_links csl
          WHERE csl.student_id = public.exam_results.student_id
          AND csl.coach_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Students can update their exam results" ON public.exam_results;
    CREATE POLICY "Students can update their exam results"
      ON public.exam_results FOR UPDATE
      TO authenticated
      USING (student_id = auth.uid())
      WITH CHECK (student_id = auth.uid());
  END IF;
END $$;

-- 3. Ensure study_proofs table has study_type column and robust RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_proofs') THEN
    ALTER TABLE public.study_proofs ADD COLUMN IF NOT EXISTS study_type TEXT DEFAULT 'Soru Çözümü';
  END IF;
END $$;
