-- 0009_functions.sql
-- Mahfaza.co Atomic XP Engine & Reward Settlement Procedures

-- Atomic XP Awarding Procedure
CREATE OR REPLACE FUNCTION public.award_student_xp(
    p_student_id UUID,
    p_base_amount INTEGER,
    p_action_type TEXT,
    p_description TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_today DATE;
    v_xp_row public.students_xp_data%ROWTYPE;
    v_streak INTEGER;
    v_multiplier NUMERIC(4, 2) := 1.0;
    v_calculated_xp INTEGER;
    v_allowed_xp INTEGER;
    v_actual_xp INTEGER;
    v_new_today_earned INTEGER;
    v_caller_role user_role;
BEGIN
    -- Authentication and authorization check:
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    v_caller_role := public.get_auth_role();
    IF auth.uid() <> p_student_id AND v_caller_role NOT IN ('admin', 'teacher') THEN
        RAISE EXCEPTION 'Unauthorized to award XP to this student';
    END IF;

    IF p_base_amount <= 0 OR p_base_amount > 100 THEN
        RAISE EXCEPTION 'Base XP amount must be between 1 and 100 XP per action';
    END IF;

    -- Current date in canonical Europe/Istanbul timezone
    v_today := (now() AT TIME ZONE 'Europe/Istanbul')::date;

    -- Acquire row-level exclusive lock on student XP row
    SELECT * INTO v_xp_row
    FROM public.students_xp_data
    WHERE student_id = p_student_id
    FOR UPDATE;

    -- If no row exists, initialize atomically
    IF NOT FOUND THEN
        INSERT INTO public.students_xp_data (student_id, lifetime_xp, wallet_xp, current_streak_days, last_activity_date, today_earned_xp)
        VALUES (p_student_id, 0, 0, 0, NULL, 0)
        RETURNING * INTO v_xp_row;
    END IF;

    -- Determine streak and reset today_earned_xp if it's a new calendar day in Istanbul
    IF v_xp_row.last_activity_date IS NULL THEN
        v_streak := 1;
        v_xp_row.today_earned_xp := 0;
    ELSIF v_xp_row.last_activity_date = v_today THEN
        v_streak := v_xp_row.current_streak_days;
        -- today_earned_xp remains as is
    ELSIF v_xp_row.last_activity_date = (v_today - 1) THEN
        v_streak := v_xp_row.current_streak_days + 1;
        v_xp_row.today_earned_xp := 0;
    ELSE
        -- Broken streak (missed 1+ days)
        v_streak := 1;
        v_xp_row.today_earned_xp := 0;
    END IF;

    -- Compute streak multiplier:
    -- 3 days = 1.05 | 7 days = 1.10 | 14 days = 1.15 | 30 days = 1.20 | 60+ days = 1.25
    IF v_streak >= 60 THEN
        v_multiplier := 1.25;
    ELSIF v_streak >= 30 THEN
        v_multiplier := 1.20;
    ELSIF v_streak >= 14 THEN
        v_multiplier := 1.15;
    ELSIF v_streak >= 7 THEN
        v_multiplier := 1.10;
    ELSIF v_streak >= 3 THEN
        v_multiplier := 1.05;
    ELSE
        v_multiplier := 1.00;
    END IF;

    -- Apply multiplier before daily hard cap
    v_calculated_xp := ROUND(p_base_amount * v_multiplier);

    -- Enforce 150 daily XP cap
    v_allowed_xp := GREATEST(0, 150 - v_xp_row.today_earned_xp);
    v_actual_xp := LEAST(v_calculated_xp, v_allowed_xp);

    IF v_actual_xp <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Günlük 150 XP kazanım sınırına ulaşıldı.',
            'awarded_xp', 0,
            'today_earned_xp', v_xp_row.today_earned_xp,
            'daily_remaining_xp', 0
        );
    END IF;

    v_new_today_earned := v_xp_row.today_earned_xp + v_actual_xp;

    -- Atomic updates: lifetime_xp NEVER decreases
    UPDATE public.students_xp_data
    SET lifetime_xp = lifetime_xp + v_actual_xp,
        wallet_xp = wallet_xp + v_actual_xp,
        current_streak_days = v_streak,
        last_activity_date = v_today,
        today_earned_xp = v_new_today_earned,
        updated_at = timezone('utc'::text, now())
    WHERE student_id = p_student_id;

    -- Atomic transaction audit entry
    INSERT INTO public.xp_transactions (
        student_id,
        amount,
        transaction_type,
        description,
        reference_id
    ) VALUES (
        p_student_id,
        v_actual_xp,
        p_action_type,
        p_description,
        p_reference_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'awarded_xp', v_actual_xp,
        'multiplier', v_multiplier,
        'streak', v_streak,
        'today_earned_xp', v_new_today_earned,
        'daily_remaining_xp', 150 - v_new_today_earned
    );
END;
$$;

-- Atomic Reward Approval & Settlement Procedure
CREATE OR REPLACE FUNCTION public.approve_reward_request_atomic(
    p_request_id UUID,
    p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req public.reward_requests%ROWTYPE;
    v_reward public.rewards%ROWTYPE;
    v_xp public.students_xp_data%ROWTYPE;
BEGIN
    -- Verify admin authority
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can review and approve reward requests.';
    END IF;

    -- Lock request row
    SELECT * INTO v_req
    FROM public.reward_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reward request not found.';
    END IF;

    IF v_req.status <> 'pending' THEN
        RAISE EXCEPTION 'Reward request has already been processed (status: %)', v_req.status;
    END IF;

    -- Lock reward item
    SELECT * INTO v_reward
    FROM public.rewards
    WHERE id = v_req.reward_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_reward.is_active THEN
        RAISE EXCEPTION 'Reward item does not exist or is inactive.';
    END IF;

    IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
        RAISE EXCEPTION 'Reward is out of stock.';
    END IF;

    -- Lock student XP wallet
    SELECT * INTO v_xp
    FROM public.students_xp_data
    WHERE student_id = v_req.student_id
    FOR UPDATE;

    IF NOT FOUND OR v_xp.wallet_xp < v_reward.xp_price THEN
        RAISE EXCEPTION 'Student has insufficient wallet XP (Wallet: %, Required: %)', COALESCE(v_xp.wallet_xp, 0), v_reward.xp_price;
    END IF;

    -- 1. Deduct wallet XP (lifetime_xp is preserved!)
    UPDATE public.students_xp_data
    SET wallet_xp = wallet_xp - v_reward.xp_price,
        updated_at = timezone('utc'::text, now())
    WHERE student_id = v_req.student_id;

    -- 2. Deduct stock if limited
    IF v_reward.stock IS NOT NULL THEN
        UPDATE public.rewards
        SET stock = stock - 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_reward.id;
    END IF;

    -- 3. Record negative XP transaction
    INSERT INTO public.xp_transactions (
        student_id,
        amount,
        transaction_type,
        description,
        reference_id
    ) VALUES (
        v_req.student_id,
        -v_reward.xp_price,
        'reward_redemption',
        'Ödül alımı: ' || v_reward.title,
        p_request_id::text
    );

    -- 4. Mark request approved
    UPDATE public.reward_requests
    SET status = 'approved',
        reviewed_at = timezone('utc'::text, now()),
        reviewed_by = auth.uid(),
        admin_note = p_admin_note
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reward request approved and settled atomically.'
    );
END;
$$;

-- Security privilege hardening
REVOKE ALL ON FUNCTION public.award_student_xp(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_student_xp(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_reward_request_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_reward_request_atomic(UUID, TEXT) TO authenticated;

