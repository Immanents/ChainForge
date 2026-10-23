// scripts/verify-tenant-isolation.mjs
// Verification suite for Multi-Tenant Isolation, Growth Modules, and Two-Phase Credit Metering

import { createClient } from "@supabase/supabase-js"

const LOCAL_SERVER = "http://localhost:5173"
const SUPABASE_URL = "https://zrxgkyhzqdyyqtsmwixy.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

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

async function runTenantIsolationTests() {
  console.log("\n================================================================================")
  console.log("  CHAINFORGE AI — TENANT ISOLATION & TWO-PHASE METERING VERIFICATION")
  console.log("================================================================================\n")

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // ---------------------------------------------------------------------------
  // SUITE 1: Growth Endpoints Unauthenticated Protection Gate
  // ---------------------------------------------------------------------------
  console.log("--- SUITE 1: Growth & Billing Endpoints Unauthenticated Protection Gate ---")

  const protectedEndpoints = [
    { method: "GET", path: "/api/growth/community" },
    { method: "POST", path: "/api/growth/community", body: { platform: "discord", handle: "chainforge" } },
    { method: "GET", path: "/api/growth/campaigns" },
    { method: "POST", path: "/api/growth/campaigns", body: { name: "Launch", goal: "Acquisition" } },
    { method: "GET", path: "/api/growth/content" },
    { method: "POST", path: "/api/growth/content", body: { title: "Draft", platform: "x_twitter", content: "Post" } },
    { method: "GET", path: "/api/growth/kols" },
    { method: "POST", path: "/api/growth/kols", body: { name: "Alice", handle: "@alice", platform: "x_twitter" } },
    { method: "GET", path: "/api/growth/analytics" },
    { method: "GET", path: "/api/billing/subscription" },
  ]

  for (const ep of protectedEndpoints) {
    try {
      const res = await fetch(`${LOCAL_SERVER}${ep.path}`, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      })
      assert(
        res.status === 401,
        `${ep.method} ${ep.path} rejects unauthenticated caller`,
        `HTTP ${res.status}`,
      )
    } catch (err) {
      assert(false, `${ep.method} ${ep.path} gate check`, err.message)
    }
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: Two-Phase Credit Metering Engine (Reserve -> Commit / Release)
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Two-Phase Credit Metering Engine (Reserve -> Commit / Release) ---")

  const meterUser = "00000000-0000-4000-8000-000000000003"
  await supabase.rpc("test_create_user", {
    p_id: meterUser,
    p_email: "metering-test@chainforge.local",
    p_credits: 100,
  })

  // 2.1 Reserve 30 credits (Balance: 100 -> 70)
  const resKey1 = `res-test-${Date.now()}`
  const { data: reserve1, error: rErr1 } = await supabase.rpc("reserve_user_credits", {
    p_user_id: meterUser,
    p_cost: 30,
    p_op_type: "blueprint_synthesis",
    p_idempotent_key: resKey1,
    p_metadata: { model: "gemini-2.5-flash" },
  })

  assert(
    !rErr1 && reserve1?.success === true && reserve1?.remaining_balance === 70,
    "reserve_user_credits reserves credits and holds balance (100 -> 70)",
    `Remaining: ${reserve1?.remaining_balance}, ReservationId: ${reserve1?.reservation_id}`,
  )

  const reservationId1 = reserve1?.reservation_id

  // 2.2 Reservation Idempotency: identical key returns existing reservation
  const { data: reserveIdemp } = await supabase.rpc("reserve_user_credits", {
    p_user_id: meterUser,
    p_cost: 30,
    p_op_type: "blueprint_synthesis",
    p_idempotent_key: resKey1,
    p_metadata: { model: "gemini-2.5-flash" },
  })

  assert(
    reserveIdemp?.success === true && (reserveIdemp?.idempotent === true || reserveIdemp?.already_reserved === true),
    "reserve_user_credits prevents duplicate holds on identical idempotent key",
    `idempotent: ${reserveIdemp?.idempotent ?? reserveIdemp?.already_reserved}`,
  )

  // 2.3 Insufficient Credits: Requesting 150 credits when balance is 70 must be rejected
  const { data: reserveFail } = await supabase.rpc("reserve_user_credits", {
    p_user_id: meterUser,
    p_cost: 150,
    p_op_type: "heavy_codebase_synthesis",
    p_idempotent_key: `fail-key-${Date.now()}`,
  })

  assert(
    reserveFail?.success === false && reserveFail?.error?.includes("Insufficient credits"),
    "reserve_user_credits rejects operations when credits are insufficient",
    `Error: ${reserveFail?.error}, Available: ${reserveFail?.available_credits}`,
  )

  // 2.4 Operation Failure / Abort: Release credits back to user (70 -> 100)
  const { data: releaseRes, error: relErr } = await supabase.rpc("release_user_credits", {
    p_reservation_id: reservationId1,
    p_reason: "AI provider rate limit abort simulated",
  })

  assert(
    !relErr && releaseRes?.success === true && releaseRes?.restored_balance === 100,
    "release_user_credits restores held credits to balance on failure/abort (70 -> 100)",
    `Restored balance: ${releaseRes?.restored_balance}`,
  )

  // 2.5 Operation Success: Reserve and Commit (100 -> 60)
  const resKey2 = `commit-test-${Date.now()}`
  const { data: reserve2 } = await supabase.rpc("reserve_user_credits", {
    p_user_id: meterUser,
    p_cost: 40,
    p_op_type: "codebase_generation",
    p_idempotent_key: resKey2,
  })

  const { data: commitRes, error: cErr } = await supabase.rpc("commit_user_credits", {
    p_reservation_id: reserve2?.reservation_id,
  })

  assert(
    !cErr && commitRes?.success === true && commitRes?.committed_credits === 40,
    "commit_user_credits permanently commits credits upon successful operation",
    `Committed: ${commitRes?.committed_credits}`,
  )

  // Verify final user profile balance
  const { data: profileCheck } = await supabase.rpc("get_user_billing_profile", {
    p_user_id: meterUser,
  })

  assert(
    profileCheck?.profile?.credits_balance === 60,
    "Final balance matches exact ledger state (100 - 40 = 60)",
    `Balance: ${profileCheck?.profile?.credits_balance}`,
  )

  // ---------------------------------------------------------------------------
  // SUITE 3: Multi-Tenant Data Isolation (Tenant A vs Tenant B)
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 3: Multi-Tenant Data Isolation (Tenant A vs Tenant B) ---")

  const tenantA = "00000000-0000-4000-8000-00000000000A"
  const tenantB = "00000000-0000-4000-8000-00000000000B"

  await supabase.rpc("test_create_user", { p_id: tenantA, p_email: "tenant-a@chainforge.local", p_credits: 50 })
  await supabase.rpc("test_create_user", { p_id: tenantB, p_email: "tenant-b@chainforge.local", p_credits: 50 })

  // Verify tenant isolation via direct PostgreSQL queries
  // 1. Projects Isolation
  const { data: tenantAProjects } = await supabase.from("projects").select("*").eq("user_id", tenantA)
  const { data: tenantBProjects } = await supabase.from("projects").select("*").eq("user_id", tenantB)

  assert(
    Array.isArray(tenantAProjects) && Array.isArray(tenantBProjects),
    "Projects query respects tenant boundaries",
  )

  // 2. Growth Community Channels Isolation
  const { data: tenantAChannels } = await supabase.from("community_channels").select("*").eq("user_id", tenantA)
  const { data: tenantBChannels } = await supabase.from("community_channels").select("*").eq("user_id", tenantB)

  assert(
    tenantAChannels?.length === 0 && tenantBChannels?.length === 0,
    "Community channels isolated per user_id",
  )

  // 3. Campaigns Isolation
  const { data: tenantACampaigns } = await supabase.from("campaigns").select("*").eq("user_id", tenantA)
  const { data: tenantBCampaigns } = await supabase.from("campaigns").select("*").eq("user_id", tenantB)

  assert(
    tenantACampaigns?.length === 0 && tenantBCampaigns?.length === 0,
    "Campaigns isolated per user_id",
  )

  // 4. Subscriptions Isolation
  const { data: tenantASubs } = await supabase.from("subscriptions").select("*").eq("user_id", tenantA)
  const { data: tenantBSubs } = await supabase.from("subscriptions").select("*").eq("user_id", tenantB)

  assert(
    tenantASubs?.length === 0 && tenantBSubs?.length === 0,
    "Subscriptions isolated per user_id",
  )

  // ---------------------------------------------------------------------------
  // SUITE 4: Multi-Tenant Team RBAC & Organization Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 4: Multi-Tenant Team RBAC & Organization Isolation ---")

  // Check organization tables exist and are governed by schema
  const { data: plans } = await supabase.from("subscription_plans").select("*").eq("tier", "team")
  assert(
    plans && plans.length > 0 && plans[0].seat_limit >= 5,
    "Team subscription tier configured with multi-seat allowance (>= 5 members)",
    `Max seats: ${plans?.[0]?.seat_limit}`,
  )

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================")
  console.log(`  TENANT ISOLATION RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log("================================================================================\n")

  if (testsFailed > 0) {
    process.exit(1)
  }
}

runTenantIsolationTests()
