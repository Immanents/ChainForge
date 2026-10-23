-- 20261021200000_full_web3_builder_schema.sql
-- Additive migration for Full Web3 Builder architecture (projects, blueprints, codebases, jobs, deployments, tokens)

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    ecosystem VARCHAR(30) NOT NULL DEFAULT 'evm' CHECK (ecosystem IN ('evm', 'solana', 'multi-chain')),
    category VARCHAR(50) DEFAULT 'Infrastructure',
    status VARCHAR(30) DEFAULT 'Pre-launch' CHECK (status IN ('Pre-launch', 'Testnet', 'Production')),
    token_symbol VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Blueprints Table
CREATE TABLE IF NOT EXISTS public.blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    input_parameters JSONB NOT NULL,
    blueprint_vectors JSONB NOT NULL,
    model_provider VARCHAR(50) NOT NULL DEFAULT 'AI Powered',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Codebase Versions Table
CREATE TABLE IF NOT EXISTS public.codebase_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE SET NULL,
    version_tag VARCHAR(30) NOT NULL DEFAULT 'v0.1.0',
    ecosystem VARCHAR(30) NOT NULL CHECK (ecosystem IN ('evm', 'solana')),
    framework VARCHAR(50) NOT NULL, -- 'foundry', 'hardhat', 'anchor'
    file_manifest JSONB NOT NULL DEFAULT '[]'::jsonb,
    file_tree JSONB NOT NULL DEFAULT '{}'::jsonb,
    artifact_sha256 CHAR(64),
    zip_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Generation & Build Jobs Table
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_version_id UUID REFERENCES public.codebase_versions(id) ON DELETE CASCADE,
    job_type VARCHAR(30) NOT NULL DEFAULT 'codebase_synthesis' CHECK (job_type IN ('codebase_synthesis', 'compilation', 'testing', 'verification')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress_percent INT NOT NULL DEFAULT 0,
    current_stage VARCHAR(100),
    log_output TEXT DEFAULT '',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Deployments Table
CREATE TABLE IF NOT EXISTS public.deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    codebase_version_id UUID REFERENCES public.codebase_versions(id) ON DELETE SET NULL,
    ecosystem VARCHAR(30) NOT NULL CHECK (ecosystem IN ('evm', 'solana')),
    network_id VARCHAR(50) NOT NULL,
    network_name VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('testnet', 'mainnet')),
    contract_type VARCHAR(50) NOT NULL, -- 'erc20', 'spl-token', 'custom_contract', 'anchor_program'
    contract_name VARCHAR(100) NOT NULL,
    contract_address VARCHAR(120) NOT NULL,
    deployer_address VARCHAR(120) NOT NULL,
    tx_hash VARCHAR(150) NOT NULL,
    artifact_sha256 CHAR(64),
    abi_or_idl JSONB,
    verification_status VARCHAR(30) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'failed')),
    explorer_url TEXT,
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Token Mints Table
CREATE TABLE IF NOT EXISTS public.token_mints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES public.deployments(id) ON DELETE SET NULL,
    standard VARCHAR(30) NOT NULL CHECK (standard IN ('erc20', 'spl-token', 'spl-token-2022')),
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(30) NOT NULL,
    decimals INT NOT NULL DEFAULT 18,
    initial_supply NUMERIC NOT NULL,
    mint_address VARCHAR(120) NOT NULL,
    deployer_address VARCHAR(120) NOT NULL,
    network_name VARCHAR(50) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    tx_hash VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Row Level Security Policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codebase_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_mints ENABLE ROW LEVEL SECURITY;

-- Allow public read access to projects, deployments, blueprints, codebase versions, token mints
CREATE POLICY "Public read projects" ON public.projects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Updates to projects are restricted to service-role
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Public read blueprints" ON public.blueprints FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert blueprints" ON public.blueprints FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public read codebase versions" ON public.codebase_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert codebase versions" ON public.codebase_versions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public read generation jobs" ON public.generation_jobs FOR SELECT TO anon, authenticated USING (true);
-- Clients can only enqueue pending jobs; execution state transitions require service-role
CREATE POLICY "Public insert generation jobs" ON public.generation_jobs FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "Public update generation jobs" ON public.generation_jobs FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Public read deployments" ON public.deployments FOR SELECT TO anon, authenticated USING (true);
-- Clients can only insert unverified deployments; verified status requires cryptographic on-chain verification via service-role
CREATE POLICY "Public insert deployments" ON public.deployments FOR INSERT TO anon, authenticated WITH CHECK (verification_status = 'unverified' OR verification_status IS NULL);
CREATE POLICY "Public update deployments" ON public.deployments FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "Public read token mints" ON public.token_mints FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public insert token mints" ON public.token_mints FOR INSERT TO anon, authenticated WITH CHECK (true);
