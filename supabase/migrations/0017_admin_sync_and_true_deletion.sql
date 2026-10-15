-- ============================================================================
-- MAHFAZA.CO — ADMIN SYNC, TRUE ACCOUNT DELETION & COACH-STUDENT RELATIONSHIP
-- ============================================================================

-- 1. TRUE ACCOUNT DELETION RPC (Deletes from auth.users AND public.profiles + cascades)
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Clean up relational links & activity records
  DELETE FROM public.coach_students WHERE coach_id = target_user_id OR student_id = target_user_id;
  DELETE FROM public.coach_student_links WHERE coach_id = target_user_id OR student_id = target_user_id;
  DELETE FROM public.coach_invitations WHERE coach_id = target_user_id;
  DELETE FROM public.coach_tasks WHERE coach_id = target_user_id OR student_id = target_user_id;
  DELETE FROM public.parent_meetings WHERE coach_id = target_user_id OR student_id = target_user_id;
  DELETE FROM public.messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.xp_transactions WHERE student_id = target_user_id;
  DELETE FROM public.subscriptions WHERE user_id = target_user_id;

  -- Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id OR user_id = target_user_id;

  -- Delete from auth.users (frees the email address for re-registration)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO anon, authenticated, service_role;

-- 2. RELIABLE AUTH -> PROFILES TRIGGER & BACKFILL FOR MISSING PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_full_name := TRIM(BOTH ' ' FROM COALESCE(NEW.raw_user_meta_data->>'full_name', v_first_name || ' ' || v_last_name));
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  INSERT INTO public.profiles (id, user_id, email, full_name, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    v_full_name,
    v_full_name,
    v_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    name = COALESCE(NULLIF(public.profiles.name, ''), EXCLUDED.name),
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth.users that are missing from public.profiles
INSERT INTO public.profiles (id, user_id, email, full_name, name, role, created_at, updated_at)
SELECT
  u.id,
  u.id,
  u.email,
  TRIM(BOTH ' ' FROM COALESCE(u.raw_user_meta_data->>'full_name', COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)) || ' ' || COALESCE(u.raw_user_meta_data->>'last_name', ''))),
  TRIM(BOTH ' ' FROM COALESCE(u.raw_user_meta_data->>'full_name', COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)) || ' ' || COALESCE(u.raw_user_meta_data->>'last_name', ''))),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. CLEAN OVERSIZED BASE64 AVATAR FROM AUTH.USERS METADATA (Fixes 400 Header Too Large)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'avatar_url'
WHERE LENGTH(COALESCE(raw_user_meta_data->>'avatar_url', '')) > 2000;

-- 4. ENSURE DEMO COACH <-> DEMO STUDENT RELATIONSHIP IN BOTH TABLES
DO $$
DECLARE
  v_coach_id UUID;
  v_student_id UUID;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE LOWER(email) = 'demo.koc@mahfaza.co' LIMIT 1;
  SELECT id INTO v_student_id FROM public.profiles WHERE LOWER(email) = 'demo.ogrenci@mahfaza.co' LIMIT 1;

  IF v_coach_id IS NOT NULL AND v_student_id IS NOT NULL THEN
    INSERT INTO public.coach_students (coach_id, student_id)
    VALUES (v_coach_id, v_student_id)
    ON CONFLICT (coach_id, student_id) DO NOTHING;

    INSERT INTO public.coach_student_links (coach_id, student_id, status)
    VALUES (v_coach_id, v_student_id, 'active')
    ON CONFLICT (coach_id, student_id) DO NOTHING;
  END IF;
END $$;
