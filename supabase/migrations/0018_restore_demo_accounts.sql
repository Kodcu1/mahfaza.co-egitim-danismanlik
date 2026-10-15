-- ============================================================================
-- MAHFAZA.CO — RESTORE MISSING DEMO ACCOUNTS & ESTABLISH RELATIONSHIPS
-- ============================================================================
-- Bu SQL betiği Supabase SQL Editor'de doğrudan çalıştırılabilir.
-- pgcrypto eklentisini kullanarak demo.koc@mahfaza.co ve demo.ogrenci@mahfaza.co
-- hesaplarını şifrelenmiş ('123456') parolalarla auth.users, auth.identities,
-- public.profiles, public.students, public.coach_students ve
-- public.coach_student_links tablolarına güvenli (idempotent) şekilde ekler
-- ve birbirine bağlar.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_coach_id UUID;
  v_student_id UUID;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. DEMO KOÇ HESABI (demo.koc@mahfaza.co / 123456)
  -- --------------------------------------------------------------------------
  SELECT id INTO v_coach_id
  FROM auth.users
  WHERE LOWER(email) = 'demo.koc@mahfaza.co'
  LIMIT 1;

  IF v_coach_id IS NULL THEN
    v_coach_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_coach_id,
      'authenticated',
      'authenticated',
      'demo.koc@mahfaza.co',
      crypt('123456', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","first_name":"Demo","last_name":"Koç","full_name":"Demo Koç"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_coach_id,
      v_coach_id::text,
      jsonb_build_object(
        'sub', v_coach_id::text,
        'email', 'demo.koc@mahfaza.co',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Hesap zaten mevcutsa şifresini ('123456') ve metadata bilgilerini garantiye al
    UPDATE auth.users
    SET
      encrypted_password = crypt('123456', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"coach","first_name":"Demo","last_name":"Koç","full_name":"Demo Koç"}'::jsonb,
      updated_at = NOW()
    WHERE id = v_coach_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. DEMO ÖĞRENCİ HESABI (demo.ogrenci@mahfaza.co / 123456)
  -- --------------------------------------------------------------------------
  SELECT id INTO v_student_id
  FROM auth.users
  WHERE LOWER(email) = 'demo.ogrenci@mahfaza.co'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    v_student_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_student_id,
      'authenticated',
      'authenticated',
      'demo.ogrenci@mahfaza.co',
      crypt('123456', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student","first_name":"Demo","last_name":"Öğrenci","full_name":"Demo Öğrenci"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_student_id,
      v_student_id::text,
      jsonb_build_object(
        'sub', v_student_id::text,
        'email', 'demo.ogrenci@mahfaza.co',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Hesap zaten mevcutsa şifresini ('123456') ve metadata bilgilerini garantiye al
    UPDATE auth.users
    SET
      encrypted_password = crypt('123456', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"student","first_name":"Demo","last_name":"Öğrenci","full_name":"Demo Öğrenci"}'::jsonb,
      updated_at = NOW()
    WHERE id = v_student_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. PUBLIC.PROFILES TABLOSU SENKRONİZASYONU (ON CONFLICT GÜVENLİ)
  -- --------------------------------------------------------------------------
  INSERT INTO public.profiles (id, user_id, email, name, full_name, role, created_at, updated_at)
  VALUES
    (v_coach_id, v_coach_id, 'demo.koc@mahfaza.co', 'Demo Koç', 'Demo Koç', 'coach', NOW(), NOW()),
    (v_student_id, v_student_id, 'demo.ogrenci@mahfaza.co', 'Demo Öğrenci', 'Demo Öğrenci', 'student', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- --------------------------------------------------------------------------
  -- 4. PUBLIC.STUDENTS TABLOSU KAYDI (FOREIGN KEY UYUMLULUĞU İÇİN)
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
    INSERT INTO public.students (
      id,
      user_id,
      coach_id,
      name,
      full_name,
      email,
      grade,
      field,
      target_exam,
      match_code,
      target_university,
      target_department,
      target_rank,
      target_score
    ) VALUES (
      v_student_id,
      v_student_id,
      v_coach_id,
      'Demo Öğrenci',
      'Demo Öğrenci',
      'demo.ogrenci@mahfaza.co',
      '12. Sınıf',
      'SAY',
      'YKS',
      'MHFZ-DEMO01',
      'Boğaziçi Üniversitesi',
      'Bilgisayar Mühendisliği',
      1500,
      515.00
    )
    ON CONFLICT (id) DO UPDATE SET
      coach_id = EXCLUDED.coach_id,
      name = EXCLUDED.name,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      updated_at = NOW();
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. KOÇ - ÖĞRENCİ İLİŞKİSİNİN KURULMASI (COACH_STUDENTS & COACH_STUDENT_LINKS)
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_students') THEN
    INSERT INTO public.coach_students (coach_id, student_id, created_at)
    VALUES (v_coach_id, v_student_id, NOW())
    ON CONFLICT (coach_id, student_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coach_student_links') THEN
    INSERT INTO public.coach_student_links (coach_id, student_id, status, created_at)
    VALUES (v_coach_id, v_student_id, 'active', NOW())
    ON CONFLICT (coach_id, student_id) DO UPDATE SET status = 'active';
  END IF;

END $$;
