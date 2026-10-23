-- supabase/migrations/20261023030000_commercial_subscriptions_and_growth.sql
-- Phase B: Organizations, Subscriptions, Paystack Transactions, Usage Metering, and Growth Modules

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'team' CHECK (plan IN ('builder', 'pro', 'team', 'enterprise')),
    credits_balance INT DEFAULT 2500 CHECK (credits_balance >= 0),
    seat_limit INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('trial', 'pro', 'team', 'enterprise')),
    interval TEXT NOT NULL CHECK (interval IN ('monthly', 'yearly', 'trial', 'lifetime')),
    price_minor_units INT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    monthly_credit_allowance INT NOT NULL DEFAULT 500,
    seat_limit INT NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Plans
INSERT INTO public.subscription_plans (id, name, tier, interval, price_minor_units, currency, monthly_credit_allowance, seat_limit, features)
VALUES 
    ('trial', '14-Day Evaluation Trial', 'trial', 'trial', 0, 'USD', 50, 1, '{"build_engine": true, "token_studio": true, "community_monitoring": false, "custom_deployments": false}'),
    ('pro_monthly', 'Pro Individual (Monthly)', 'pro', 'monthly', 4900, 'USD', 500, 1, '{"build_engine": true, "token_studio": true, "community_monitoring": true, "growth_tools": true, "priority_synthesis": true}'),
    ('pro_yearly', 'Pro Individual (Yearly)', 'pro', 'yearly', 49000, 'USD', 500, 1, '{"build_engine": true, "token_studio": true, "community_monitoring": true, "growth_tools": true, "priority_synthesis": true, "annual_discount": "17%"}'),
    ('team_monthly', 'Team / Agency (Monthly)', 'team', 'monthly', 19900, 'USD', 2500, 5, '{"build_engine": true, "token_studio": true, "community_monitoring": true, "growth_tools": true, "multi_seat": 5, "dedicated_rpc": true}'),
    ('team_yearly', 'Team / Agency (Yearly)', 'team', 'yearly', 199000, 'USD', 2500, 5, '{"build_engine": true, "token_studio": true, "community_monitoring": true, "growth_tools": true, "multi_seat": 5, "dedicated_rpc": true, "annual_discount": "17%"}')
ON CONFLICT (id) DO UPDATE
SET price_minor_units = EXCLUDED.price_minor_units,
    monthly_credit_allowance = EXCLUDED.monthly_credit_allowance,
    seat_limit = EXCLUDED.seat_limit,
    features = EXCLUDED.features;

-- 4. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'expired')),
    provider TEXT NOT NULL DEFAULT 'paystack',
    subscription_code TEXT,
    email_token TEXT,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payment Transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(120) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('subscription', 'credit_topup')),
    plan_id VARCHAR(64),
    package_credits INT DEFAULT 0,
    amount_minor_units INT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    provider TEXT NOT NULL DEFAULT 'paystack',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    gateway_response TEXT,
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Billing Webhook Events (Idempotency)
CREATE TABLE IF NOT EXISTS public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(160) UNIQUE NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paystack',
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Two-Phase Usage Metering Events
CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    operation_type VARCHAR(80) NOT NULL,
    credits_reserved INT NOT NULL,
    credits_committed INT DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'committed', 'released')),
    idempotent_key VARCHAR(160) UNIQUE NOT NULL,
    release_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 8. Growth Modules Persistence
CREATE TABLE IF NOT EXISTS public.community_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform VARCHAR(40) NOT NULL,
    handle TEXT NOT NULL,
    member_count INT DEFAULT 0,
    growth_rate NUMERIC(5,2) DEFAULT 0,
    sentiment_score NUMERIC(5,2) DEFAULT 75.0,
    is_connected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    platform VARCHAR(40) NOT NULL,
    status VARCHAR(40) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    budget_minor_units INT DEFAULT 0,
    spent_minor_units INT DEFAULT 0,
    target_impressions INT DEFAULT 100000,
    actual_reach INT DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.content_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    platform VARCHAR(40) NOT NULL,
    status VARCHAR(40) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
    image_prompt TEXT,
    image_url TEXT,
    scheduled_for TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    platform VARCHAR(40) NOT NULL,
    audience_size INT DEFAULT 0,
    engagement_rate NUMERIC(5,2) DEFAULT 0,
    category VARCHAR(60) DEFAULT 'DeFi',
    status VARCHAR(40) DEFAULT 'discovered' CHECK (status IN ('discovered', 'contacted', 'partnered', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growth_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_name VARCHAR(80) NOT NULL,
    metric_value NUMERIC(14,2) NOT NULL,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metadata JSONB DEFAULT '{}'
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_analytics ENABLE ROW LEVEL SECURITY;

-- RPC Suite
CREATE OR REPLACE FUNCTION public.reserve_user_credits(
    p_user_id UUID,
    p_cost INT,
    p_op_type TEXT,
    p_idempotent_key TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_existing_event RECORD;
    v_event_id UUID;
    v_new_balance INT;
BEGIN
    SELECT * INTO v_existing_event
    FROM public.usage_events
    WHERE idempotent_key = p_idempotent_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'reservation_id', v_existing_event.id,
            'status', v_existing_event.status,
            'idempotent', true
        );
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    IF v_profile.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account is not in active status (' || v_profile.status || ')');
    END IF;

    IF v_profile.credits_balance < p_cost THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits. Required: ' || p_cost || ', Available: ' || v_profile.credits_balance,
            'available_credits', v_profile.credits_balance,
            'required_credits', p_cost
        );
    END IF;

    v_new_balance := v_profile.credits_balance - p_cost;
    UPDATE public.profiles
    SET credits_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    INSERT INTO public.usage_events (
        user_id,
        operation_type,
        credits_reserved,
        credits_committed,
        status,
        idempotent_key,
        metadata,
        created_at
    )
    VALUES (
        p_user_id,
        p_op_type,
        p_cost,
        0,
        'reserved',
        p_idempotent_key,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_event_id,
        'credits_reserved', p_cost,
        'remaining_balance', v_new_balance
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_user_credits(
    p_reservation_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_event
    FROM public.usage_events
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reservation event not found');
    END IF;

    IF v_event.status = 'committed' THEN
        RETURN jsonb_build_object('success', true, 'already_committed', true);
    END IF;

    IF v_event.status != 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot commit reservation with status: ' || v_event.status);
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_event.user_id;

    UPDATE public.usage_events
    SET status = 'committed',
        credits_committed = credits_reserved,
        resolved_at = NOW()
    WHERE id = p_reservation_id;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        reason,
        idempotent_key,
        metadata,
        created_at
    )
    VALUES (
        v_event.user_id,
        -v_event.credits_reserved,
        v_profile.credits_balance,
        'Usage: ' || v_event.operation_type,
        'commit_' || p_reservation_id,
        v_event.metadata,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'committed_credits', v_event.credits_reserved);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_user_credits(
    p_reservation_id UUID,
    p_reason TEXT DEFAULT 'Operation failed or aborted'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_new_balance INT;
BEGIN
    SELECT * INTO v_event
    FROM public.usage_events
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reservation event not found');
    END IF;

    IF v_event.status = 'released' THEN
        RETURN jsonb_build_object('success', true, 'already_released', true);
    END IF;

    IF v_event.status != 'reserved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot release reservation with status: ' || v_event.status);
    END IF;

    UPDATE public.profiles
    SET credits_balance = credits_balance + v_event.credits_reserved,
        updated_at = NOW()
    WHERE id = v_event.user_id
    RETURNING credits_balance INTO v_new_balance;

    UPDATE public.usage_events
    SET status = 'released',
        release_reason = p_reason,
        resolved_at = NOW()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
        'success', true,
        'refunded_credits', v_event.credits_reserved,
        'restored_balance', v_new_balance
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fulfill_payment_transaction(
    p_reference TEXT,
    p_paid_amount INT,
    p_currency TEXT DEFAULT 'USD'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tx RECORD;
    v_plan RECORD;
    v_new_balance INT;
    v_period_end TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE reference = p_reference
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction reference not found');
    END IF;

    IF v_tx.status = 'success' THEN
        RETURN jsonb_build_object('success', true, 'already_fulfilled', true);
    END IF;

    UPDATE public.payment_transactions
    SET status = 'success',
        paid_at = NOW()
    WHERE id = v_tx.id;

    IF v_tx.type = 'subscription' THEN
        SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_tx.plan_id;
        IF FOUND THEN
            v_period_end := CASE 
                WHEN v_plan.interval = 'yearly' THEN NOW() + INTERVAL '1 year'
                ELSE NOW() + INTERVAL '1 month'
            END;

            INSERT INTO public.subscriptions (
                user_id,
                organization_id,
                plan_id,
                status,
                current_period_start,
                current_period_end,
                updated_at
            )
            VALUES (
                v_tx.user_id,
                v_tx.organization_id,
                v_plan.id,
                'active',
                NOW(),
                v_period_end,
                NOW()
            );

            UPDATE public.profiles
            SET plan = v_plan.tier,
                status = 'active',
                credits_balance = credits_balance + v_plan.monthly_credit_allowance,
                plan_expires_at = v_period_end,
                updated_at = NOW()
            WHERE id = v_tx.user_id
            RETURNING credits_balance INTO v_new_balance;

            INSERT INTO public.credit_transactions (
                user_id,
                amount,
                balance_after,
                reason,
                idempotent_key,
                metadata,
                created_at
            )
            VALUES (
                v_tx.user_id,
                v_plan.monthly_credit_allowance,
                v_new_balance,
                'Monthly plan subscription credits: ' || v_plan.name,
                'sub_credit_' || v_tx.reference,
                jsonb_build_object('plan_id', v_plan.id, 'tx_ref', v_tx.reference),
                NOW()
            );
        END IF;

    ELSIF v_tx.type = 'credit_topup' AND v_tx.package_credits > 0 THEN
        UPDATE public.profiles
        SET credits_balance = credits_balance + v_tx.package_credits,
            updated_at = NOW()
        WHERE id = v_tx.user_id
        RETURNING credits_balance INTO v_new_balance;

        INSERT INTO public.credit_transactions (
            user_id,
            amount,
            balance_after,
            reason,
            idempotent_key,
            metadata,
            created_at
        )
        VALUES (
            v_tx.user_id,
            v_tx.package_credits,
            v_new_balance,
            'Purchased credit top-up package',
            'topup_credit_' || v_tx.reference,
            jsonb_build_object('credits', v_tx.package_credits, 'tx_ref', v_tx.reference),
            NOW()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'reference', p_reference, 'type', v_tx.type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_user_credits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.commit_user_credits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_user_credits TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction TO anon, authenticated, service_role;
