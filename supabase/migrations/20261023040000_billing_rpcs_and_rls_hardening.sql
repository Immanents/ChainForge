-- supabase/migrations/20261023040000_billing_rpcs_and_rls_hardening.sql
-- Additive migration: Billing RPCs and atomic webhook processing with idempotency

-- 1. Helper RPC to record pending payment transaction safely from backend
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
    p_user_id UUID,
    p_type TEXT,
    p_reference TEXT,
    p_amount_minor_units INT,
    p_currency TEXT,
    p_plan_id TEXT DEFAULT NULL,
    p_package_credits INT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.payment_transactions (
        user_id,
        type,
        reference,
        amount_minor_units,
        currency,
        plan_id,
        package_credits,
        provider,
        status,
        metadata,
        created_at
    )
    VALUES (
        p_user_id,
        p_type,
        p_reference,
        p_amount_minor_units,
        p_currency,
        p_plan_id,
        p_package_credits,
        'paystack',
        'pending',
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('success', true, 'id', v_id, 'reference', p_reference);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Atomic Webhook Processing RPC with Idempotency Defense
CREATE OR REPLACE FUNCTION public.process_billing_webhook(
    p_event_id TEXT,
    p_event_type TEXT,
    p_provider TEXT,
    p_payload JSONB
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
    v_ref TEXT;
    v_amount INT;
    v_currency TEXT;
    v_fulfill_res JSONB;
BEGIN
    -- Check if event already exists
    SELECT * INTO v_existing FROM public.billing_events WHERE event_id = p_event_id;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'ignored_duplicate', 'eventId', p_event_id);
    END IF;

    -- Record event (catches any race conditions via unique constraint)
    BEGIN
        INSERT INTO public.billing_events (
            event_id,
            event_type,
            provider,
            payload,
            processed,
            created_at
        )
        VALUES (
            p_event_id,
            p_event_type,
            p_provider,
            p_payload,
            false,
            NOW()
        );
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('status', 'ignored_duplicate', 'eventId', p_event_id);
    END;

    -- Fulfill successful charges
    IF p_event_type = 'charge.success' THEN
        v_ref := p_payload->'data'->>'reference';
        v_amount := (p_payload->'data'->>'amount')::INT;
        v_currency := COALESCE(p_payload->'data'->>'currency', 'USD');

        IF v_ref IS NOT NULL THEN
            v_fulfill_res := public.fulfill_payment_transaction(v_ref, v_amount, v_currency);
        END IF;
    ELSIF p_event_type = 'subscription.disable' THEN
        UPDATE public.subscriptions
        SET status = 'canceled', canceled_at = NOW()
        WHERE subscription_code = (p_payload->'data'->>'subscription_code');
    END IF;

    -- Mark event as processed
    UPDATE public.billing_events
    SET processed = true, processed_at = NOW()
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object('status', 'processed', 'eventId', p_event_id, 'fulfillment', v_fulfill_res);
END;
$$;

-- 3. User Billing Profile Inspection RPC
CREATE OR REPLACE FUNCTION public.get_user_billing_profile(
    p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_sub RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'profile', jsonb_build_object(
            'id', v_profile.id,
            'email', v_profile.email,
            'plan', v_profile.plan,
            'credits_balance', v_profile.credits_balance,
            'plan_expires_at', v_profile.plan_expires_at,
            'status', v_profile.status
        ),
        'subscription', CASE WHEN v_sub.id IS NOT NULL THEN jsonb_build_object(
            'id', v_sub.id,
            'plan_id', v_sub.plan_id,
            'status', v_sub.status,
            'current_period_end', v_sub.current_period_end
        ) ELSE NULL END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_transaction TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_billing_webhook TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_billing_profile TO anon, authenticated, service_role;
