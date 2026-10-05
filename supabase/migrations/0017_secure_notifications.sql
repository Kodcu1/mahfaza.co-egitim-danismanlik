-- 0017_secure_notifications.sql
-- Authoritative, Secure Database-Side Notification Creation Procedure & Policy for Mahfaza.co

-- 1. Create secure SECURITY DEFINER RPC function for authoritative notification creation
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'system',
    p_link TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_is_authorized BOOLEAN := FALSE;
    v_new_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- 1. Validate authenticated caller
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Validate required input fields
    IF p_recipient_id IS NULL THEN
        RAISE EXCEPTION 'Recipient user_id is required.';
    END IF;
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RAISE EXCEPTION 'Notification title is required.';
    END IF;
    IF p_message IS NULL OR trim(p_message) = '' THEN
        RAISE EXCEPTION 'Notification message is required.';
    END IF;

    -- 2. Authorization validation:
    -- Self-notification: User notifying themselves (e.g., student earned XP from personal study)
    IF v_actor_id = p_recipient_id THEN
        v_is_authorized := TRUE;
    END IF;

    -- Admin or Head Coach: Authorized to notify any user
    IF NOT v_is_authorized THEN
        SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
        IF v_actor_role IN ('admin', 'head_coach') THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    -- Coach -> Assigned Student
    IF NOT v_is_authorized AND v_actor_role = 'coach' THEN
        IF EXISTS (
            SELECT 1 FROM public.coach_student_links
            WHERE coach_id = v_actor_id AND student_id = p_recipient_id AND status = 'active'
        ) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    -- Student -> Assigned Coach
    IF NOT v_is_authorized THEN
        IF EXISTS (
            SELECT 1 FROM public.coach_student_links
            WHERE student_id = v_actor_id AND coach_id = p_recipient_id AND status = 'active'
        ) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    -- Active role relationship verification (teachers, coaches, counselors)
    IF NOT v_is_authorized THEN
        IF v_actor_role IN ('coach', 'student', 'teacher', 'counselor') THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to create notification for recipient % from actor %', p_recipient_id, v_actor_id;
    END IF;

    -- 3. Insert into authoritative notifications table
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        link,
        is_read,
        created_at
    ) VALUES (
        p_recipient_id,
        trim(p_title),
        trim(p_message),
        COALESCE(p_type, 'system'),
        p_link,
        FALSE,
        timezone('utc'::text, now())
    )
    RETURNING id, created_at INTO v_new_id, v_created_at;

    -- 4. Return the created notification record
    RETURN jsonb_build_object(
        'id', v_new_id,
        'user_id', p_recipient_id,
        'title', trim(p_title),
        'message', trim(p_message),
        'type', COALESCE(p_type, 'system'),
        'link', p_link,
        'is_read', false,
        'created_at', v_created_at
    );
END;
$$;

-- Security privileges: Restrict execution to authenticated users
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Also update RLS policy on notifications for direct insert if table RLS is evaluated
DROP POLICY IF EXISTS "notifications_insert_authorized" ON public.notifications;
CREATE POLICY "notifications_insert_authorized" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid() OR
        public.is_admin() OR
        EXISTS (
            SELECT 1 FROM public.coach_student_links
            WHERE (coach_id = auth.uid() AND student_id = user_id)
               OR (student_id = auth.uid() AND coach_id = user_id)
        )
    );
