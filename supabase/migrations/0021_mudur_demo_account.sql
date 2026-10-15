-- ============================================================================
-- MAHFAZA.CO & EYOTEK — KURUM MÜDÜRÜ (ADMIN) DEMO HESABI OLUŞTURMA
-- ============================================================================
-- Bu betik Supabase SQL Editor'de doğrudan çalıştırılabilir.
-- mudurdemo@mahfaza.com kullanıcısını '123456' şifresiyle auth.users tablosuna ekler,
-- güvenli bcrypt hash uygular ve public.profiles tablosunda 'admin' rolüyle eşler.
-- Email zaten varsa rolünü 'admin' ve şifresini '123456' olarak günceller.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- 1. Kullanıcı auth.users tablosunda mevcut mu kontrol et
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE LOWER(email) = 'mudurdemo@mahfaza.com'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();

    -- auth.users tablosuna ekle
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
      v_admin_id,
      'authenticated',
      'authenticated',
      'mudurdemo@mahfaza.com',
      crypt('123456', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","first_name":"Kurum","last_name":"Müdürü","full_name":"Kurum Müdürü"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- auth.identities tablosuna ekle
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
      v_admin_id,
      v_admin_id::text,
      jsonb_build_object(
        'sub', v_admin_id::text,
        'email', 'mudurdemo@mahfaza.com',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  ELSE
    -- Hesap zaten varsa şifresini '123456' ve rolünü 'admin' olarak güncelle
    UPDATE auth.users
    SET
      encrypted_password = crypt('123456', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin","first_name":"Kurum","last_name":"Müdürü","full_name":"Kurum Müdürü"}'::jsonb,
      updated_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  -- 2. public.profiles tablosuna 'admin' rolüyle ekle/güncelle
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    name,
    full_name,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_admin_id,
    v_admin_id,
    'mudurdemo@mahfaza.com',
    'Kurum Müdürü',
    'Kurum Müdürü',
    'Kurum',
    'Müdürü',
    'admin',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'admin',
    updated_at = NOW();

END $$;
