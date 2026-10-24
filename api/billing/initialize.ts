// api/billing/initialize.ts
// Dedicated Self-Contained Vercel Serverless Function for ChainForge Plan Upgrades & Credit Top-ups

import type { IncomingMessage, ServerResponse } from "node:http"
import { randomBytes } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

const CREDIT_PACKAGES: Record<string, { name: string; credits: number; priceMinorUnits: number; currency: string }> = {
  credits_100: { name: "100 AI Credits Starter", credits: 100, priceMinorUnits: 1000, currency: "USD" },
  credits_500: { name: "500 AI Credits Growth", credits: 500, priceMinorUnits: 4500, currency: "USD" },
  credits_2500: { name: "2,500 AI Credits Scale", credits: 2500, priceMinorUnits: 19900, currency: "USD" },
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey, x-idempotency-key")

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== "POST") {
    res.statusCode = 405
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }))
    return
  }

  try {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      "https://zrxgkyhzqdyyqtsmwixy.supabase.co"

    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

    const paystackSecretKey = (
      process.env.PAYSTACK_SECRET_KEY ||
      process.env.VITE_PAYSTACK_SECRET_KEY ||
      process.env.PAYSTACK_KEY ||
      ""
    ).trim().replace(/^Bearer\s+/i, "")

    const paystackPublicKey = (
      process.env.VITE_PAYSTACK_PUBLIC_KEY ||
      process.env.PAYSTACK_PUBLIC_KEY ||
      ""
    ).trim()

    // 1. Authenticate user
    const authHeader = req.headers["authorization"] || ""
    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (!token) {
      res.statusCode = 401
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Unauthorized: Please sign in to upgrade your plan." }))
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) {
      res.statusCode = 401
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Unauthorized: Invalid or expired session. Please sign in again." }))
      return
    }
    const user = userData.user

    // 2. Read request body safely
    let payload: any = req.body
    if (!payload || typeof payload !== "object") {
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload) } catch { payload = {} }
      } else {
        payload = await new Promise((resolve) => {
          if ((req as any).readableEnded || req.destroyed) {
            resolve({})
            return
          }
          const chunks: Buffer[] = []
          req.on("data", (chunk: Buffer) => chunks.push(chunk))
          req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8")
            try { resolve(JSON.parse(raw || "{}")) } catch { resolve({}) }
          })
          req.on("error", () => resolve({}))
        })
      }
    }

    // 3. Resolve plan or package pricing
    let amountMinorUnits = 0
    let currency = "USD"
    let description = ""
    let packageCredits = 0
    let planId: string | null = null

    if (payload.type === "subscription") {
      planId = payload.planId || "pro_monthly"
      const { data: plan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .eq("is_active", true)
        .single()

      if (planError || !plan) {
        res.statusCode = 400
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: `Subscription plan '${planId}' not found or inactive.` }))
        return
      }

      amountMinorUnits = plan.price_minor_units
      currency = plan.currency
      description = `ChainForge AI Subscription - ${plan.name}`
    } else if (payload.type === "credit_topup") {
      const pkg = CREDIT_PACKAGES[payload.packageId || "credits_100"]
      if (!pkg) {
        res.statusCode = 400
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: `Invalid credit package: ${payload.packageId}` }))
        return
      }
      amountMinorUnits = pkg.priceMinorUnits
      currency = pkg.currency
      description = `ChainForge AI - ${pkg.name}`
      packageCredits = pkg.credits
    } else {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Invalid billing transaction type." }))
      return
    }

    const reference = `CF-PAY-${Date.now()}-${randomBytes(4).toString("hex").toUpperCase()}`

    // 4. Record transaction in database
    const { data: txRecord, error: txError } = await supabase.rpc("record_payment_transaction", {
      p_user_id: user.id,
      p_type: payload.type,
      p_reference: reference,
      p_amount_minor_units: amountMinorUnits,
      p_currency: currency,
      p_plan_id: planId,
      p_package_credits: packageCredits,
      p_metadata: {
        user_email: user.email,
        description,
        initiated_at: new Date().toISOString(),
      },
    })

    if (txError || !txRecord?.success) {
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: `Failed to record payment transaction: ${txRecord?.error || txError?.message}` }))
      return
    }

    // Guard: Check if user accidentally entered a public key (pk_...) as the secret key
    if (paystackSecretKey.startsWith("pk_")) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.end(
        JSON.stringify({
          error:
            "Invalid PAYSTACK_SECRET_KEY: You configured a Public Key ('pk_...'). Please set your Secret Key (starts with 'sk_test_') in Vercel Settings -> Environment Variables.",
        }),
      )
      return
    }

    // 5. Initialize Paystack checkout
    let authorizationUrl = ""
    let accessCode = ""

    const isRealPaystackKey =
      paystackSecretKey &&
      !paystackSecretKey.includes("mock") &&
      !paystackSecretKey.startsWith("mock-") &&
      (paystackSecretKey.startsWith("sk_test_") || paystackSecretKey.startsWith("sk_live_"))

    const proto = (req.headers["x-forwarded-proto"] as string) || (req.headers.host?.includes("localhost") ? "http" : "https")
    const host = req.headers.host || "localhost:5173"

    if (isRealPaystackKey) {
      const callPaystackInit = async (targetCurrency?: string, targetAmount?: number) => {
        const bodyPayload: Record<string, any> = {
          email: user.email,
          amount: targetAmount ?? amountMinorUnits,
          reference,
          callback_url: payload.callbackUrl || `${proto}://${host}/#app/settings?tab=Billing&reference=${reference}`,
          metadata: {
            user_id: user.id,
            plan_id: planId,
            type: payload.type,
            package_credits: packageCredits,
          },
        }
        if (targetCurrency) {
          bodyPayload.currency = targetCurrency
        }

        const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyPayload),
        })
        return psRes.json()
      }

      let psData: any = null
      try {
        psData = await callPaystackInit(currency, amountMinorUnits)
      } catch (err: unknown) {
        console.warn("[Paystack Gateway] Network request failed:", err)
      }

      // If Paystack says currency is not supported by merchant (e.g. Nigerian account expecting NGN)
      if (psData && !psData.status && psData.message && /currency/i.test(psData.message)) {
        console.warn("[Paystack Gateway] Currency USD not enabled on merchant, converting to NGN equivalent...")
        // Convert USD to NGN at standard rates (~1550 NGN per USD)
        const ngnAmountMinor = Math.round((amountMinorUnits / 100) * 1550 * 100)
        try {
          psData = await callPaystackInit("NGN", ngnAmountMinor)
        } catch {}

        if (psData && !psData.status) {
          // If still rejected, retry without explicit currency so Paystack uses default account currency
          try {
            psData = await callPaystackInit(undefined, amountMinorUnits)
          } catch {}
        }
      }

      if (psData && psData.status && psData.data) {
        authorizationUrl = psData.data.authorization_url
        accessCode = psData.data.access_code
      } else if (psData && !psData.status) {
        // Report the real Paystack error so the developer can see why Paystack rejected it
        res.statusCode = 400
        res.setHeader("Content-Type", "application/json")
        res.end(
          JSON.stringify({
            error: `Paystack Error: ${psData.message || "Failed to initialize payment gateway"}`,
            details: psData,
          }),
        )
        return
      }
    }

    // Safe developer sandbox fallback when NO Paystack credentials are provided at all
    if (!authorizationUrl) {
      authorizationUrl = `${proto}://${host}/#app/settings?tab=Billing&simulated_checkout=true&reference=${reference}&amount=${amountMinorUnits}`
      accessCode = `mock_acc_${reference}`
    }

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        success: true,
        reference,
        authorization_url: authorizationUrl,
        access_code: accessCode,
        amount_minor_units: amountMinorUnits,
        currency,
        description,
        public_key: paystackPublicKey,
      }),
    )
  } catch (err: unknown) {
    console.error("[Billing Initialize Fatal Error]:", err)
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal Server Error during checkout initialization",
      }),
    )
  }
}
