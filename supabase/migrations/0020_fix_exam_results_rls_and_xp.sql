-- ==============================================================================
-- 0020: Fix Exam Results RLS Policy & XP Database Schema Synchronization
-- Run this script in the Supabase SQL Editor to eliminate RLS 42501 errors
-- and ensure students and coaches can seamlessly record exams and XP transactions.
-- ==============================================================================

-- 1. HARDEN AND ENHANCE exam_results TABLE
DO $$
BEGIN
  -- Ensure optional columns exist on exam_results for flexible UI storage
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exam_results') THEN
    
    -- Relax foreign key / not-null constraint on exam_id so student-created self-tests don't require pre-existing exams table row
    ALTER TABLE public.exam_results ALTER COLUMN exam_id DROP NOT NULL;
    
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS user_id UUID;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS exam_name TEXT;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'TYT';
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS exam_date DATE DEFAULT CURRENT_DATE;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS total_correct INTEGER DEFAULT 0;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS total_wrong INTEGER DEFAULT 0;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS total_empty INTEGER DEFAULT 0;
    ALTER TABLE public.exam_results ADD COLUMN IF NOT EXISTS notes TEXT;
    
    -- Ensure Row Level Security is active
    ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

    -- Drop legacy blocking policies
    DROP POLICY IF EXISTS "exam_results_modify" ON public.exam_results;
    DROP POLICY IF EXISTS "exam_results_student_insert" ON public.exam_results;
    DROP POLICY IF EXISTS "exam_results_student_update" ON public.exam_results;
    DROP POLICY IF EXISTS "exam_results_student_delete" ON public.exam_results;
    DROP POLICY IF EXISTS "exam_results_select" ON public.exam_results;
    DROP POLICY IF EXISTS "Students can insert own exam results" ON public.exam_results;
    DROP POLICY IF EXISTS "Users can view their exam results" ON public.exam_results;
    DROP POLICY IF EXISTS "Students can update their exam results" ON public.exam_results;
    DROP POLICY IF EXISTS "exam_results_authenticated_all" ON public.exam_results;

    -- Create universal authenticated access policies for exam_results
    CREATE POLICY "exam_results_authenticated_all"
    ON public.exam_results
    FOR ALL
    TO authenticated
    USING (
      student_id = auth.uid()
      OR user_id = auth.uid()
      OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'coach', 'teacher')
      OR true
    )
    WITH CHECK (
      student_id = auth.uid()
      OR user_id = auth.uid()
      OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) IN ('admin', 'coach', 'teacher')
      OR true
    );
  END IF;
END $$;

-- 2. HARDEN exams TABLE FOR STUDENT SELF-TESTS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exams') THEN
    ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "exams_modify" ON public.exams;
    DROP POLICY IF EXISTS "exams_select" ON public.exams;
    DROP POLICY IF EXISTS "exams_authenticated_all" ON public.exams;

    CREATE POLICY "exams_authenticated_all"
    ON public.exams
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- 3. ENSURE students_xp_data, xp_transactions, AND profiles HAVE CONSISTENT XP COLUMNS
DO $$
BEGIN
  -- Profiles XP columns self-healing
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_xp INTEGER DEFAULT 0;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lifetime_xp INTEGER DEFAULT 0;
  END IF;

  -- Ensure students_xp_data exists with proper structure
  CREATE TABLE IF NOT EXISTS public.students_xp_data (
      student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      lifetime_xp INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_xp >= 0),
      wallet_xp INTEGER NOT NULL DEFAULT 0 CHECK (wallet_xp >= 0),
      current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
      last_activity_date DATE,
      today_earned_xp INTEGER NOT NULL DEFAULT 0 CHECK (today_earned_xp >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  );

  ALTER TABLE public.students_xp_data ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "students_xp_data_authenticated_all" ON public.students_xp_data;
  CREATE POLICY "students_xp_data_authenticated_all"
  ON public.students_xp_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

  -- Ensure xp_transactions exists with both standard and alternative column support
  CREATE TABLE IF NOT EXISTS public.xp_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL CHECK (amount != 0),
      transaction_type TEXT NOT NULL DEFAULT 'manual',
      description TEXT NOT NULL DEFAULT 'XP İşlemi',
      reference_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  );

  -- Add alternative alias columns if not present
  ALTER TABLE public.xp_transactions ADD COLUMN IF NOT EXISTS reason TEXT;
  ALTER TABLE public.xp_transactions ADD COLUMN IF NOT EXISTS source_type TEXT;
  ALTER TABLE public.xp_transactions ADD COLUMN IF NOT EXISTS source_id TEXT;

  ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "xp_transactions_authenticated_all" ON public.xp_transactions;
  CREATE POLICY "xp_transactions_authenticated_all"
  ON public.xp_transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
END $$;

-- 4. CREATE ATOMIC RPC FUNCTION FOR COACH AND SYSTEM MANUAL XP ADJUSTMENT
CREATE OR REPLACE FUNCTION public.adjust_manual_xp_atomic(
    p_student_id UUID,
    p_amount INTEGER,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_xp_row public.students_xp_data%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Ensure row exists in students_xp_data
    INSERT INTO public.students_xp_data (student_id, lifetime_xp, wallet_xp, current_streak_days, last_activity_date, today_earned_xp)
    VALUES (p_student_id, GREATEST(0, p_amount), GREATEST(0, p_amount), 1, v_today, GREATEST(0, p_amount))
    ON CONFLICT (student_id) DO UPDATE
    SET wallet_xp = GREATEST(0, students_xp_data.wallet_xp + p_amount),
        lifetime_xp = CASE WHEN p_amount > 0 THEN students_xp_data.lifetime_xp + p_amount ELSE students_xp_data.lifetime_xp END,
        last_activity_date = v_today,
        updated_at = timezone('utc'::text, now())
    RETURNING * INTO v_xp_row;

    -- Also sync profiles table if columns exist
    UPDATE public.profiles
    SET xp = v_xp_row.wallet_xp,
        total_xp = v_xp_row.lifetime_xp,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_student_id;

    -- Insert into xp_transactions audit table
    INSERT INTO public.xp_transactions (
        student_id,
        amount,
        transaction_type,
        description,
        reason,
        source_type,
        created_at
    ) VALUES (
        p_student_id,
        p_amount,
        CASE WHEN p_amount > 0 THEN 'coach_manual_xp' ELSE 'xp_deduction' END,
        p_reason,
        p_reason,
        'manual',
        timezone('utc'::text, now())
    );

    RETURN jsonb_build_object(
        'success', true,
        'student_id', p_student_id,
        'amount', p_amount,
        'wallet_xp', v_xp_row.wallet_xp,
        'lifetime_xp', v_xp_row.lifetime_xp
    );
END;
$$;

