-- 20261023000000_harden_rls_and_admin_rate_limit.sql
-- Security hardening: Remove unauthenticated public write access to trusted records and install distributed rate-limiting

-- 1. Create admin rate limit tracking table
CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
    ip TEXT PRIMARY KEY,
    attempt_count INT NOT NULL DEFAULT 1,
    reset_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;
-- No public policies (restricted exclusively to service_role and security definer function)

-- 2. Create atomic rate limiting function
CREATE OR REPLACE FUNCTION public.check_admin_rate_limit(
    p_ip TEXT,
    p_max_attempts INT DEFAULT 10,
    p_window_seconds INT DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_reset_at TIMESTAMPTZ;
    v_count INT;
BEGIN
    SELECT attempt_count, reset_at INTO v_count, v_reset_at
    FROM public.admin_rate_limits
    WHERE ip = p_ip;
    
    IF NOT FOUND OR v_now > v_reset_at THEN
        INSERT INTO public.admin_rate_limits (ip, attempt_count, reset_at)
        VALUES (p_ip, 1, v_now + (p_window_seconds || ' seconds')::interval)
        ON CONFLICT (ip) DO UPDATE
        SET attempt_count = 1, reset_at = v_now + (p_window_seconds || ' seconds')::interval;
        RETURN TRUE;
    ELSE
        IF v_count >= p_max_attempts THEN
            RETURN FALSE;
        ELSE
            UPDATE public.admin_rate_limits
            SET attempt_count = attempt_count + 1
            WHERE ip = p_ip;
            RETURN TRUE;
        END IF;
    END IF;
END;
$$;

-- 3. Execution permissions
REVOKE ALL ON FUNCTION public.check_admin_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_admin_rate_limit(TEXT, INT, INT) TO service_role, anon, authenticated;

-- 4. Harden RLS policies: remove unauthenticated public insert privileges
ALTER POLICY "Public insert deployments" ON public.deployments WITH CHECK (false);
ALTER POLICY "Public insert generation jobs" ON public.generation_jobs WITH CHECK (false);
ALTER POLICY "Public insert projects" ON public.projects WITH CHECK (false);
ALTER POLICY "Public insert token mints" ON public.token_mints WITH CHECK (false);
ALTER POLICY "Public insert blueprints" ON public.blueprints WITH CHECK (false);
ALTER POLICY "Public insert codebase versions" ON public.codebase_versions WITH CHECK (false);
