// scripts/verify-paystack-billing.mjs
// Automated verification suite for Paystack Billing, Webhooks, Idempotency, and Subscriptions

import { createHmac } from "crypto"
import { createClient } from "@supabase/supabase-js"

const LOCAL_SERVER = "http://localhost:5173"
const SUPABASE_URL = "https://zrxgkyhzqdyyqtsmwixy.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_chainforge_mock_secret_key"

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

async function runBillingTests() {
  console.log("\n================================================================================")
  console.log("  CHAINFORGE AI — PAYSTACK BILLING & SUBSCRIPTION VERIFICATION SUITE")
  console.log("================================================================================\n")

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Provision a test customer
  const testUserId = "00000000-0000-4000-8000-000000000002"
  const testEmail = "billing-customer@chainforge.local"

  await supabase.rpc("test_create_user", {
    p_id: testUserId,
    p_email: testEmail,
    p_credits: 50,
  })

  // ---------------------------------------------------------------------------
  // SUITE 1: Subscription Plans & Pricing Configuration
  // ---------------------------------------------------------------------------
  console.log("--- SUITE 1: Subscription Plans & Server-Side Pricing ---")

  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/plans`)
    const data = await res.json()
    assert(
      res.status === 200 && Array.isArray(data.plans) && data.plans.length >= 3,
      "GET /api/billing/plans returns active subscription tiers",
      `Tiers: ${data.plans.map((p) => p.id).join(", ")}`,
    )

    const proMonthly = data.plans.find((p) => p.id === "pro_monthly")
    assert(
      proMonthly && proMonthly.price_minor_units === 4900 && proMonthly.currency === "USD",
      "Server-authoritative Pro Monthly price ($49.00 USD / 4900 cents)",
    )

    const teamMonthly = data.plans.find((p) => p.id === "team_monthly")
    assert(
      teamMonthly && teamMonthly.price_minor_units === 19900 && teamMonthly.seat_limit === 5,
      "Server-authoritative Team Monthly price ($199.00 USD / 5 seats)",
    )
  } catch (err) {
    assert(false, "GET /api/billing/plans check", err.message)
  }

  // ---------------------------------------------------------------------------
  // SUITE 2: Paystack Checkout Initialization
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 2: Paystack Checkout Initialization ---")

  // 2.1 Unauthenticated checkout initialization rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subscription", planId: "pro_monthly" }),
    })
    assert(
      res.status === 401,
      "POST /api/billing/initialize rejects unauthenticated request",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "Unauthenticated initialize check", err.message)
  }

  // 2.2 Direct transaction initialization via RPC for verification
  const txRef = `CF-PAY-TEST-${Date.now()}`
  const { data: recordRes, error: recordErr } = await supabase.rpc("record_payment_transaction", {
    p_user_id: testUserId,
    p_type: "subscription",
    p_reference: txRef,
    p_amount_minor_units: 4900,
    p_currency: "USD",
    p_plan_id: "pro_monthly",
    p_package_credits: 500,
  })

  assert(recordRes?.success === true, "Pending transaction created with reference", txRef)

  // ---------------------------------------------------------------------------
  // SUITE 3: HMAC-SHA512 Webhook Verification & Forgery Defense
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 3: HMAC-SHA512 Webhook Verification & Forgery Defense ---")

  const webhookBody = JSON.stringify({
    event: "charge.success",
    data: {
      id: 987654321,
      reference: txRef,
      amount: 4900,
      currency: "USD",
      status: "success",
      customer: { email: testEmail },
    },
  })

  // 3.1 Unsigned webhook rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: webhookBody,
    })
    assert(
      res.status === 401,
      "POST /api/billing/webhook rejects missing signature",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "Missing signature check", err.message)
  }

  // 3.2 Forged/tampered signature rejected with 401
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": "forged_invalid_signature_hex_1234567890abcdef",
      },
      body: webhookBody,
    })
    assert(
      res.status === 401,
      "POST /api/billing/webhook rejects forged signature",
      `HTTP ${res.status}`,
    )
  } catch (err) {
    assert(false, "Forged signature check", err.message)
  }

  // 3.3 Valid HMAC-SHA512 signature accepted and processed (200)
  const validSignature = createHmac("sha512", PAYSTACK_SECRET).update(webhookBody).digest("hex")

  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": validSignature,
      },
      body: webhookBody,
    })
    const data = await res.json()
    assert(
      res.status === 200 && data.status === "processed",
      "POST /api/billing/webhook accepts valid HMAC-SHA512 signature",
      `Event: ${data.eventId}`,
    )
  } catch (err) {
    assert(false, "Valid signature check", err.message)
  }

  // 3.4 Idempotency: Replayed identical webhook MUST return 200 without double-crediting
  try {
    const res = await fetch(`${LOCAL_SERVER}/api/billing/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": validSignature,
      },
      body: webhookBody,
    })
    const data = await res.json()
    assert(
      res.status === 200 && data.status === "ignored_duplicate",
      "POST /api/billing/webhook prevents replay attack / double fulfillment via idempotency log",
      `Status: ${data.status}`,
    )
  } catch (err) {
    assert(false, "Webhook idempotency check", err.message)
  }

  // ---------------------------------------------------------------------------
  // SUITE 4: Entitlement Activation & Credit Allocation
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 4: Entitlement Activation & Credit Allocation ---")

  // Check user profile was updated to pro and received 500 monthly credits (50 + 500 = 550)
  const { data: profileData } = await supabase.rpc("get_user_billing_profile", {
    p_user_id: testUserId,
  })
  const updatedProfile = profileData?.profile

  assert(
    updatedProfile?.plan === "pro",
    "Customer plan upgraded to 'pro' following verified payment",
    `Plan: ${updatedProfile?.plan}`,
  )

  assert(
    updatedProfile?.credits_balance === 550,
    "Monthly credit allowance (500 credits) credited to balance (50 -> 550)",
    `Balance: ${updatedProfile?.credits_balance}`,
  )

  // ---------------------------------------------------------------------------
  // SUITE 5: Prepaid Credit Package Top-Up
  // ---------------------------------------------------------------------------
  console.log("\n--- SUITE 5: Prepaid Credit Package Top-Up ---")

  const topupRef = `CF-TOPUP-${Date.now()}`
  const { data: topupRecord } = await supabase.rpc("record_payment_transaction", {
    p_user_id: testUserId,
    p_type: "credit_topup",
    p_reference: topupRef,
    p_amount_minor_units: 4500, // $45.00
    p_currency: "USD",
    p_package_credits: 500,
  })

  // Trigger verify endpoint for topup
  const verifyRes = await fetch(`${LOCAL_SERVER}/api/billing/verify?reference=${topupRef}`)
  const verifyData = await verifyRes.json()

  assert(
    verifyRes.status === 200 && verifyData.success === true,
    "GET /api/billing/verify fulfills prepaid credit top-up",
    `Ref: ${topupRef}, Status: ${verifyRes.status}, Resp: ${JSON.stringify(verifyData)}`,
  )

  const { data: topupProfileData } = await supabase.rpc("get_user_billing_profile", {
    p_user_id: testUserId,
  })
  const topupProfile = topupProfileData?.profile

  assert(
    topupProfile?.credits_balance === 1050,
    "Prepaid credits added to user balance (550 + 500 = 1050)",
    `Balance: ${topupProfile?.credits_balance}`,
  )

  // Clean up test data
  await supabase.from("credit_transactions").delete().eq("user_id", testUserId)
  await supabase.from("subscriptions").delete().eq("user_id", testUserId)
  await supabase.from("payment_transactions").delete().eq("user_id", testUserId)
  await supabase.from("profiles").delete().eq("id", testUserId)

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================")
  console.log(`  BILLING VERIFICATION: ${testsPassed} PASSED, ${testsFailed} FAILED`)
  console.log("================================================================================\n")

  if (testsFailed > 0) process.exit(1)
}

runBillingTests()
