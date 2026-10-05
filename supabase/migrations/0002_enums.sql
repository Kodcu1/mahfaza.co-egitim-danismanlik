-- 0002_enums.sql
-- Mahfaza.co Core PostgreSQL Enums

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin',
            'teacher',
            'counselor',
            'coach',
            'student',
            'parent'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM (
            'present',
            'absent',
            'late',
            'excused'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_rarity') THEN
        CREATE TYPE reward_rarity AS ENUM (
            'common',
            'uncommon',
            'rare',
            'epic',
            'legendary'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_category') THEN
        CREATE TYPE reward_category AS ENUM (
            'mahfaza',
            'digital',
            'academic',
            'legendary'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_request_status') THEN
        CREATE TYPE reward_request_status AS ENUM (
            'pending',
            'approved',
            'rejected',
            'cancelled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'homework_status') THEN
        CREATE TYPE homework_status AS ENUM (
            'pending',
            'submitted',
            'graded',
            'late'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exam_type') THEN
        CREATE TYPE exam_type AS ENUM (
            'TYT',
            'AYT',
            'LGS'
        );
    END IF;
END $$;
