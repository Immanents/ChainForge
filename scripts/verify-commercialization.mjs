// scripts/verify-commercialization.mjs
// Comprehensive End-to-End Verification of ChainForge AI Commercial SaaS & Controlled-Access Engine

import { createClient } from "@supabase/supabase-js"

const LOCAL_SERVER = "http://localhost:5173"
const SUPABASE_URL = "https://zrxgkyhzqdyyqtsmwixy.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"
const ADMIN_SECRET = process.env.ADMIN_SECRET || "chainforge-admin-secret-2026"

let testsPassed = 0
let testsFailed = 0

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName} ${detail ? `(${detail})` : ""}`)
    testsPassed++
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName} ${detail ? `(${detail})` : ""}`)
    testsFailed++
  }
}

async function runVerification() {
  console.log("\n================================================================================")
  console.log("  CHAINFORGE AI — COMMERCIALIZATION & CONTROLLED-ACCESS VERIFICATION SUITE")
  console.log("================================================================================\n")

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // ---------------------------------------------------------------------------
  // SUITE 1: Private by Default — Generation & Mutation Protection
  // ---------------------------------------------------------------------------
  console.log("--- SUITE 1: Private by Default — Gate Protection on Generation Endpoints ---")

  // 1.1 Unauthenticated blueprint generation rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/generate-blueprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Test",
        projectIdea: "DeFi App",
        targetAudience: "Users",
      }),
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 401 && body.error?.includes("Unauthorized"),
      "POST /api/generate-blueprint rejects unauthenticated visitor",
      `HTTP ${res.status} - ${body.error?.slice(0, 45)}...`,
    )
  } catch (err) {
    assert(false, "POST /api/generate-blueprint unauthenticated check", err.message)
  }

  // 1.2 Invalid Bearer token on blueprint generation rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/generate-blueprint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-forged-jwt-token-12345",
      },
      body: JSON.stringify({
        projectName: "Test",
        projectIdea: "DeFi App",
        targetAudience: "Users",
      }),
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 401,
      "POST /api/generate-blueprint rejects forged/invalid token",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "POST /api/generate-blueprint invalid token check", err.message)
  }

  // 1.3 Unauthenticated codebase synthesis rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/generate-codebase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "Test",
        ecosystem: "evm",
        blueprint: {},
      }),
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 401 && body.error?.includes("Unauthorized"),
      "POST /api/generate-codebase rejects unauthenticated visitor",
      `HTTP ${res.status} - ${body.error?.slice(0, 45)}...`,
    )
  } catch (err) {
    assert(false, "POST /api/generate-codebase unauthenticated check", err.message)
  }

  // 1.4 Unauthenticated project creation rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauthorized Project",
      }),
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 401 && body.error?.includes("Unauthorized"),
      "POST /api/projects rejects unauthenticated saving",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "POST /api/projects unauthenticated check", err.message)
  }

  // 1.5 Public Marketing Early Access Endpoint remains accessible (200 / 400 for empty)
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/early-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    assert(
      res.status === 400, // 400 validation error, NOT 401 Unauthorized
      "POST /api/early-access remains publicly accessible without auth gate",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "Public early access endpoint check", err.message)
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: Administration Authorization & Console Security
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Administration Authorization & Console Security ---")

  // 2.1 Unauthenticated requests to admin endpoints rejected with 401
  for (const endpoint of [
    "/api/admin/users",
    "/api/admin/invitations",
    "/api/admin/audit-logs",
    "/api/admin/early-access",
  ]) {
    try {
      const res = await fetch(`${LOCAL_SERVER}${endpoint}`)
      assert(
        res.status === 401,
        `GET ${endpoint} rejects unauthenticated caller`,
        `HTTP ${res.status}`,
      )
    } catch (err) {
      assert(false, `GET ${endpoint} unauthenticated check`, err.message)
    }
  }

  // 2.2 Authenticated Admin access with ADMIN_SECRET succeeds
  let testInviteCode = null
  let testInviteId = null
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/admin/users`, {
      headers: { "x-admin-key": ADMIN_SECRET },
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 200 && Array.isArray(body.users),
      "GET /api/admin/users returns user profiles when authorized",
      `HTTP 200, count: ${body.users?.length ?? 0}`,
    )
  } catch (err) {
    assert(false, "GET /api/admin/users authorized check", err.message)
  }

  // 2.3 Create Invitation code via POST /api/admin/invitations
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/admin/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: JSON.stringify({
        action: "create",
        plan: "pro",
        initialCredits: 250,
        expiresInDays: 30,
      }),
    })
    const body = await res.json().catch(() => ({}))
    testInviteCode = body.invitation?.code
    testInviteId = body.invitation?.id
    assert(
      res.status === 201 &&
        body.success === true &&
        testInviteCode &&
        testInviteCode.startsWith("CF-"),
      "POST /api/admin/invitations generates secure invitation code",
      `Code: ${testInviteCode}`,
    )
  } catch (err) {
    assert(false, "POST /api/admin/invitations check", err.message)
  }

  // 2.4 Verify Invitation Code via RPC validate_invitation_code
  try {
    const { data, error } = await supabase.rpc("validate_invitation_code", {
      p_code: testInviteCode,
    })
    assert(
      !error && data?.valid === true && data?.plan === "pro" && data?.initial_credits === 250,
      "RPC validate_invitation_code confirms valid active invitation",
      `Plan: ${data?.plan}, Credits: ${data?.initial_credits}`,
    )
  } catch (err) {
    assert(false, "validate_invitation_code RPC check", err.message)
  }

  // 2.5 Verify Fake / Non-Existent Code is rejected
  try {
    const { data, error } = await supabase.rpc("validate_invitation_code", {
      p_code: "CF-INVALID-CODE-9999",
    })
    assert(
      !error && data?.valid === false && data?.reason?.includes("Invalid"),
      "RPC validate_invitation_code rejects non-existent invitation",
      `Reason: ${data?.reason}`,
    )
  } catch (err) {
    assert(false, "validate_invitation_code invalid check", err.message)
  }

  // 2.6 Revoke Invitation code via POST /api/admin/invitations
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/admin/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_SECRET,
      },
      body: JSON.stringify({
        action: "revoke",
        inviteId: testInviteId,
      }),
    })
    const body = await res.json().catch(() => ({}))
    assert(
      res.status === 200 && body.success === true && body.invitation?.is_revoked === true,
      "POST /api/admin/invitations revokes invitation code",
      `Revoked: ${body.invitation?.is_revoked}`,
    )

    // Re-verify code is now rejected
    const { data } = await supabase.rpc("validate_invitation_code", {
      p_code: testInviteCode,
    })
    assert(
      data?.valid === false && data?.reason?.includes("Invalid"),
      "RPC validate_invitation_code rejects revoked code",
      `Reason: ${data?.reason}`,
    )
  } catch (err) {
    assert(false, "Revoke invitation code check", err.message)
  }

  // 2.7 Verify Audit Logs recorded actions
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/admin/audit-logs`, {
      headers: { "x-admin-key": ADMIN_SECRET },
    })
    const body = await res.json().catch(() => ({}))
    const actions = (body.auditLogs || []).map((l) => l.action)
    assert(
      res.status === 200 && actions.includes("invite_created") && actions.includes("invite_revoked"),
      "GET /api/admin/audit-logs contains immutable audit trail of admin actions",
      `Logged actions: ${actions.slice(0, 3).join(", ")}`,
    )
  } catch (err) {
    assert(false, "Audit logs check", err.message)
  }

  // ---------------------------------------------------------------------------
  // SUITE 3: Atomic Idempotent Credit Entitlements
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Atomic Idempotent Credit Entitlements ---")

  const testUserId = "00000000-0000-4000-8000-000000000001"
  const testKey = `test-idemp-${Date.now()}`

  // Provision test user in auth.users and public.profiles with 100 credits
  const { data: createRes, error: createErr } = await supabase.rpc("test_create_user", {
    p_id: testUserId,
    p_email: "commercial-test@chainforge.local",
    p_credits: 100,
  })

  assert(
    !createErr && createRes?.success === true,
    "Test user provisioned with active status and 100 credits",
  )

  // 3.1 Initial atomic deduction of 10 credits
  try {
    const { data: res1, error: err1 } = await supabase.rpc("deduct_user_credits", {
      p_user_id: testUserId,
      p_cost: 10,
      p_idempotent_key: testKey,
      p_reason: "Test Blueprint Generation",
      p_metadata: { test: true },
    })

    assert(
      !err1 && res1?.success === true && res1?.balance === 90,
      "RPC deduct_user_credits deducts credits atomically (100 -> 90)",
      `Balance: ${res1?.balance}`,
    )
  } catch (err) {
    assert(false, "deduct_user_credits initial check", err.message)
  }

  // 3.2 Idempotency: Retrying with identical idempotent key MUST NOT double-charge
  try {
    const { data: res2, error: err2 } = await supabase.rpc("deduct_user_credits", {
      p_user_id: testUserId,
      p_cost: 10,
      p_idempotent_key: testKey, // Same key!
      p_reason: "Test Blueprint Generation Retry",
      p_metadata: { retry: true },
    })

    assert(
      !err2 && res2?.success === true && res2?.balance === 90,
      "RPC deduct_user_credits prevents double-charging on identical idempotent key",
      `Balance retained: ${res2?.balance}`,
    )
  } catch (err) {
    assert(false, "deduct_user_credits idempotency check", err.message)
  }

  // 3.3 Insufficient Credits: Requesting more credits than balance must fail
  try {
    const { data: res3 } = await supabase.rpc("deduct_user_credits", {
      p_user_id: testUserId,
      p_cost: 500, // exceeds 90
      p_idempotent_key: `exceed-${Date.now()}`,
      p_reason: "Enterprise Synthesis Exceeding Balance",
    })

    assert(
      res3?.success === false && res3?.error?.includes("Insufficient credits"),
      "RPC deduct_user_credits rejects operations when credits are insufficient",
      `Error: ${res3?.error}, Balance: ${res3?.available_credits ?? res3?.balance}`,
    )
  } catch (err) {
    assert(false, "deduct_user_credits insufficient check", err.message)
  }

  // Clean up test user
  await supabase.from("credit_transactions").delete().eq("user_id", testUserId)
  await supabase.from("profiles").delete().eq("id", testUserId)

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================")
  console.log(`  VERIFICATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log("================================================================================\n")

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runVerification()
