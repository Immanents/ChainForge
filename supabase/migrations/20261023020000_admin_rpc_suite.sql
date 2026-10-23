-- supabase/migrations/20261023020000_admin_rpc_suite.sql
-- Administrative SECURITY DEFINER RPC Suite for SaaS User Approvals, Plans, Credits, and Invitations

-- 1. Create Invitation
CREATE OR REPLACE FUNCTION public.admin_create_invitation(
    p_code TEXT,
    p_plan TEXT DEFAULT 'builder',
    p_initial_credits INT DEFAULT 50,
    p_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    p_created_by UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    INSERT INTO public.invitations (
        code,
        plan,
        initial_credits,
        expires_at,
        created_by
    )
    VALUES (
        p_code,
        p_plan,
        p_initial_credits,
        p_expires_at,
        p_created_by
    )
    RETURNING * INTO v_inv;

    RETURN jsonb_build_object(
        'success', true,
        'invitation', jsonb_build_object(
            'id', v_inv.id,
            'code', v_inv.code,
            'plan', v_inv.plan,
            'initial_credits', v_inv.initial_credits,
            'expires_at', v_inv.expires_at,
            'created_at', v_inv.created_at,
            'is_revoked', v_inv.is_revoked
        )
    );
END;
$$;

-- 2. Revoke Invitation
CREATE OR REPLACE FUNCTION public.admin_revoke_invitation(p_invite_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    UPDATE public.invitations
    SET is_revoked = TRUE
    WHERE id = p_invite_id
    RETURNING * INTO v_inv;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invitation', jsonb_build_object(
            'id', v_inv.id,
            'code', v_inv.code,
            'is_revoked', v_inv.is_revoked
        )
    );
END;
$$;

-- 3. List Invitations
CREATE OR REPLACE FUNCTION public.admin_list_invitations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    INTO v_res
    FROM (
        SELECT * FROM public.invitations ORDER BY created_at DESC
    ) i;

    RETURN jsonb_build_object('success', true, 'invitations', v_res);
END;
$$;

-- 4. List Users / Profiles
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    INTO v_res
    FROM (
        SELECT * FROM public.profiles ORDER BY created_at DESC
    ) p;

    RETURN jsonb_build_object('success', true, 'users', v_res);
END;
$$;

-- 5. Admin Update User
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_target_user_id UUID,
    p_action TEXT,
    p_plan TEXT DEFAULT NULL,
    p_credits INT DEFAULT NULL,
    p_admin_id UUID DEFAULT NULL,
    p_ip TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_new_balance INT;
    v_updated RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
    END IF;

    IF p_action = 'approve' THEN
        UPDATE public.profiles
        SET status = 'active',
            credits_balance = CASE WHEN credits_balance = 0 THEN 50 ELSE credits_balance END,
            updated_at = NOW()
        WHERE id = p_target_user_id
        RETURNING * INTO v_updated;
    ELSIF p_action = 'suspend' THEN
        UPDATE public.profiles
        SET status = 'suspended', updated_at = NOW()
        WHERE id = p_target_user_id
        RETURNING * INTO v_updated;
    ELSIF p_action = 'revoke' THEN
        UPDATE public.profiles
        SET status = 'revoked', updated_at = NOW()
        WHERE id = p_target_user_id
        RETURNING * INTO v_updated;
    ELSIF p_action = 'change_plan' AND p_plan IS NOT NULL THEN
        UPDATE public.profiles
        SET plan = p_plan, updated_at = NOW()
        WHERE id = p_target_user_id
        RETURNING * INTO v_updated;
    ELSIF p_action = 'grant_credits' AND p_credits IS NOT NULL THEN
        v_new_balance := GREATEST(0, v_profile.credits_balance + p_credits);
        UPDATE public.profiles
        SET credits_balance = v_new_balance, updated_at = NOW()
        WHERE id = p_target_user_id
        RETURNING * INTO v_updated;

        INSERT INTO public.credit_transactions (
            user_id, amount, balance_after, reason, idempotent_key, created_at
        )
        VALUES (
            p_target_user_id,
            p_credits,
            v_new_balance,
            'Admin credit grant',
            'admin-grant-' || gen_random_uuid(),
            NOW()
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Unrecognized admin action');
    END IF;

    -- Record in audit logs
    INSERT INTO public.admin_audit_logs (
        admin_id, target_user_id, action, details, ip_address, created_at
    )
    VALUES (
        p_admin_id,
        p_target_user_id,
        'user_' || p_action,
        jsonb_build_object('previous_status', v_profile.status, 'new_status', v_updated.status, 'plan', v_updated.plan, 'credits', v_updated.credits_balance),
        p_ip,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'profile', to_jsonb(v_updated));
END;
$$;

-- 6. List Audit Logs
CREATE OR REPLACE FUNCTION public.admin_list_audit_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_res jsonb;
BEGIN
    SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
    INTO v_res
    FROM (
        SELECT * FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT 100
    ) a;

    RETURN jsonb_build_object('success', true, 'auditLogs', v_res);
END;
$$;

-- 7. Record Audit Log
CREATE OR REPLACE FUNCTION public.admin_record_audit_log(
    p_admin_id UUID DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_action TEXT DEFAULT 'action',
    p_details JSONB DEFAULT '{}'::jsonb,
    p_ip TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_audit_logs (
        admin_id, target_user_id, action, details, ip_address, created_at
    )
    VALUES (
        p_admin_id,
        p_target_user_id,
        p_action,
        p_details,
        p_ip,
        NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Bootstrap Owner
CREATE OR REPLACE FUNCTION public.admin_bootstrap_owner(p_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_updated RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE LOWER(email) = LOWER(p_email);
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found with email: ' || p_email);
    END IF;

    UPDATE public.profiles
    SET role = 'admin',
        status = 'active',
        plan = 'enterprise',
        credits_balance = GREATEST(1000, credits_balance),
        updated_at = NOW()
    WHERE id = v_profile.id
    RETURNING * INTO v_updated;

    INSERT INTO public.admin_audit_logs (
        target_user_id, action, details, created_at
    )
    VALUES (
        v_profile.id,
        'bootstrap_owner_promoted',
        jsonb_build_object('email', p_email, 'role', 'admin', 'plan', 'enterprise'),
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Promoted ' || p_email || ' to Admin with Enterprise plan.', 'profile', to_jsonb(v_updated));
END;
$$;

-- Grant execute permissions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.admin_create_invitation TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_invitation TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_invitations TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_logs TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_record_audit_log TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_bootstrap_owner TO anon, authenticated, service_role;
