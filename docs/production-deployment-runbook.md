# ChainForge AI — Production Deployment Runbook

## 1. Pre-Deployment Verification Checklist

Before deploying updates to production, execute the automated verification suite to confirm that all security boundaries, billing flows, and tenant isolation policies remain 100% regression-free.

```bash
# 1. Verify TypeScript types and production bundle compilation
pnpm run build

# 2. Run Comprehensive Application Security Verification (42 Tests)
node scripts/verify-security.mjs

# 3. Run Commercialization & Gate Protection Verification (20 Tests)
node scripts/verify-commercialization.mjs

# 4. Run Paystack Billing, Webhooks & Idempotency Verification (13 Tests)
node scripts/verify-paystack-billing.mjs

# 5. Run Multi-Tenant Data Isolation & Two-Phase Metering Verification (21 Tests)
node scripts/verify-tenant-isolation.mjs
```

> **Target Standard**: All 96 tests must exit with code `0` (0 failures).

---

## 2. Production Environment Variables

Ensure all required production variables are populated in the deployment platform:

```ini
# --- Supabase Production Infrastructure ---
VITE_SUPABASE_URL=https://zrxgkyhzqdyyqtsmwixy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# --- AI Intelligence Providers ---
# Primary: Google Gemini API (Strictly preserved)
VITE_GEMINI_API_KEY=AIzaSy...
# Fallback: OpenRouter Gateway
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# --- Commercial Billing (Paystack) ---
PAYSTACK_SECRET_KEY=sk_live_...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...

# --- Platform Administration ---
ADMIN_SECRET=<high-entropy-random-64-char-string>

# --- Web3 Blockchain RPCs ---
EVM_RPC_URL_SEPOLIA=https://ethereum-sepolia-rpc.publicnode.com
EVM_RPC_URL_MAINNET=https://eth-mainnet.g.alchemy.com/v2/...
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
```

---

## 3. Database Migration Order

All Supabase migrations are strictly **additive** and backwards-compatible. Apply in sequential order:

1. `20261021183000_web3_builder_foundation.sql`: Core Web3 projects, blueprints, codebases, token mints, and deployments.
2. `20261022140000_security_remediation_and_anti_spoofing.sql`: Anti-spoofing verification columns, admin rate limiting, and hardened RLS.
3. `20261023020000_commercial_access_and_invitations.sql`: Controlled access, invitations, profiles, and audit log tables.
4. `20261023030000_commercial_subscriptions_and_growth.sql`: Organizations, subscription plans, usage events, growth modules.
5. `20261023040000_billing_rpcs_and_rls_hardening.sql`: Security definer billing RPCs, atomic webhook handler, and idempotency engine.

---

## 4. Production Release Execution

### Step 1: Push Migration to Supabase
```bash
# Push pending migrations to the linked Supabase project
npx supabase db push
```

### Step 2: Build Production Frontend & Assets
```bash
pnpm run build
```

### Step 3: Zero-Downtime Gateway Deployment
Deploy the Vite production build and API gateway to hosting (e.g. AWS ECS / Cloud Run / Vercel / Railway). Ensure that the health check endpoint responds:
```bash
curl -I https://app.chainforge.ai/api/early-access
# Expected response: HTTP/1.1 405 or 400 (Method Not Allowed / Bad Request, active gateway)
```

---

## 5. Post-Deployment Smoke Tests

1. **Gate Test**: Issue unauthenticated `POST /api/generate-blueprint`. Verify `401 Unauthorized`.
2. **Owner Login**: Sign in using Owner credentials (`immangaius@gmail.com`). Verify redirect to `#app/settings` with `enterprise` plan status.
3. **Billing Portal**: Navigate to **Settings -> Billing**. Verify active plan badge, credit meter balance, and monthly/yearly subscription options.
4. **Webhook Simulation**: Issue signed test webhook to `POST /api/billing/webhook`. Verify `HTTP 200 { "status": "processed" }`.
5. **Replay Rejection**: Resend the identical webhook. Verify `HTTP 200 { "status": "ignored_duplicate" }`.

---

## 6. Incident Response & Rollback Runbook

### If Billing Webhooks Fail with 401
- Check Paystack Dashboard Webhook configuration.
- Verify `PAYSTACK_SECRET_KEY` matches the secret configured in the Paystack portal.
- Verify reverse proxy / Cloudflare does not strip `x-paystack-signature`.

### If AI Operations Fail with 402
- Verify user profile has sufficient credits in `public.profiles`.
- If an operation aborted midway, check `public.usage_events` to verify `release_user_credits` restored the balance.

### Database Rollback Policy
Because all migrations are non-destructive and additive (no dropped tables or column deletions), rolling back gateway code will not cause data corruption or schema incompatibilities.
