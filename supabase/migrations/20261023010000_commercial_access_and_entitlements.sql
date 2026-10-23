-- 20261023010000_commercial_access_and_entitlements.sql
-- Complete Commercial SaaS Foundation: Profiles, Invitations, Ledgers, Entitlements, Tenant Isolation

-- 1. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    plan VARCHAR(30) NOT NULL DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'builder', 'pro', 'enterprise')),
    credits_balance INT NOT NULL DEFAULT 50 CHECK (credits_balance >= 0),
    plan_expires_at TIMESTAMPTZ,
    invited_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    email TEXT,
    plan VARCHAR(30) NOT NULL DEFAULT 'builder',
    initial_credits INT NOT NULL DEFAULT 200,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Credit Transactions ledger table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    balance_after INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    idempotent_key VARCHAR(120) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Admin Audit Logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Add tenant ownership columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.deployments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.token_mints ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.blueprints ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.codebase_versions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Functions: validate_invitation_code, redeem_invitation_code, deduct_user_credits
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    SELECT * INTO v_inv
    FROM public.invitations
    WHERE code = p_code
      AND is_revoked = FALSE
      AND used_by IS NULL
      AND expires_at > NOW();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'reason', 'Invalid, expired, or already redeemed invitation code.');
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'plan', v_inv.plan,
        'initial_credits', v_inv.initial_credits,
        'email', v_inv.email
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_invitation_code(p_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_inv
    FROM public.invitations
    WHERE code = p_code
      AND is_revoked = FALSE
      AND used_by IS NULL
      AND expires_at > v_now
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation code is invalid or has expired.');
    END IF;

    UPDATE public.invitations
    SET used_by = p_user_id,
        used_at = v_now
    WHERE id = v_inv.id;

    UPDATE public.profiles
    SET status = 'active',
        plan = v_inv.plan,
        credits_balance = credits_balance + v_inv.initial_credits,
        invited_by = v_inv.created_by,
        updated_at = v_now
    WHERE id = p_user_id;

    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        balance_after,
        reason,
        idempotent_key,
        metadata
    )
    SELECT
        p_user_id,
        v_inv.initial_credits,
        p.credits_balance,
        'invitation_redemption',
        'invite_redeem_' || v_inv.id || '_' || p_user_id,
        jsonb_build_object('invitation_id', v_inv.id, 'code', p_code)
    FROM public.profiles p
    WHERE p.id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'plan', v_inv.plan,
        'credits_granted', v_inv.initial_credits
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_user_credits(
    p_user_id UUID,
    p_cost INT,
    p_idempotent_key TEXT,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_existing_tx RECORD;
    v_new_balance INT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    SELECT * INTO v_existing_tx
    FROM public.credit_transactions
    WHERE idempotent_key = p_idempotent_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'deducted', false,
            'idempotent', true,
            'balance', v_existing_tx.balance_after,
            'transaction_id', v_existing_tx.id
        );
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found.');
    END IF;

    IF v_profile.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account is not in active status (' || v_profile.status || ').');
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
        updated_at = v_now
    WHERE id = p_user_id;

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
        p_user_id,
        -p_cost,
        v_new_balance,
        p_reason,
        p_idempotent_key,
        p_metadata,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted', true,
        'cost', p_cost,
        'balance', v_new_balance
    );
END;
$$;
