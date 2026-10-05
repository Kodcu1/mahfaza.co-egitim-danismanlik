-- 0006_xp.sql
-- Mahfaza.co Gamification & XP Engine Architecture

CREATE TABLE IF NOT EXISTS public.students_xp_data (
    student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    lifetime_xp INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_xp >= 0),
    wallet_xp INTEGER NOT NULL DEFAULT 0 CHECK (wallet_xp >= 0),
    current_streak_days INTEGER NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
    last_activity_date DATE,
    today_earned_xp INTEGER NOT NULL DEFAULT 0 CHECK (today_earned_xp >= 0 AND today_earned_xp <= 150),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount != 0),
    transaction_type TEXT NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS set_students_xp_data_updated_at ON public.students_xp_data;
CREATE TRIGGER set_students_xp_data_updated_at
    BEFORE UPDATE ON public.students_xp_data
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to initialize XP data for new student profiles
CREATE OR REPLACE FUNCTION public.handle_new_student_xp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO public.students_xp_data (student_id, lifetime_xp, wallet_xp, current_streak_days, today_earned_xp)
        VALUES (NEW.id, 0, 0, 0, 0)
        ON CONFLICT (student_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_student_profile_created ON public.profiles;
CREATE TRIGGER on_student_profile_created
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_student_xp();

