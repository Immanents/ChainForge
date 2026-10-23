// server/apiRouter.ts
// Unified API router supporting both Vite local middleware and Vercel serverless functions

import type { IncomingMessage, ServerResponse } from "node:http"
import { handleBlueprintRequest, INPUT_LIMITS } from "./blueprintHandler.ts"
import { handleEarlyAccessRequest, EARLY_ACCESS_LIMITS } from "./earlyAccessHandler.ts"
import { generateCodebaseBundle } from "./codebaseGenerator.ts"
import { handleProjects, handleDeployments, handleTokenMints } from "./projectHandler.ts"
import {
  handleAdminEarlyAccess,
  handleAdminUsers,
  handleAdminInvitations,
  handleAdminAuditLogs,
  handleBootstrapOwner,
} from "./adminHandler.ts"
import { authenticateRequest, deductCredits } from "./authMiddleware.ts"
import {
  handleBillingInitialize,
  handleBillingVerify,
  handleBillingWebhook,
  handleGetPlans,
  handleGetSubscription,
  handleCancelSubscription,
} from "./billingHandler.ts"
import {
  handleGrowthCommunity,
  handleGrowthCampaigns,
  handleGrowthContent,
  handleGrowthKols,
  handleGrowthAnalytics,
} from "./growthHandler.ts"

export async function readJsonBody(
  req: IncomingMessage & { body?: any },
  maxBytes: number,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  if (req.body && typeof req.body === "object") {
    return { ok: true, data: req.body }
  }

  return new Promise((resolve) => {
    let size = 0
    const chunks: Buffer[] = []
    let tooLarge = false

    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        tooLarge = true
        req.destroy()
        resolve({
          ok: false,
          error: `Payload too large. Maximum size is ${Math.round(maxBytes / 1024)} KB.`,
          status: 413,
        })
        return
      }
      chunks.push(chunk)
    })

    req.on("end", () => {
      if (tooLarge) return
      const raw = Buffer.concat(chunks).toString("utf8")
      if (!raw.trim()) {
        resolve({ ok: true, data: {} })
        return
      }
      try {
        const parsed = JSON.parse(raw)
        resolve({ ok: true, data: parsed })
      } catch {
        resolve({ ok: false, error: "Invalid JSON payload.", status: 400 })
      }
    })

    req.on("error", (err) => {
      resolve({ ok: false, error: `Stream error: ${err.message}`, status: 400 })
    })
  })
}

export async function handleApiRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = req.url || ""
  const path = url.split("?")[0]

  if (!path.startsWith("/api/")) {
    return false
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    "https://zrxgkyhzqdyyqtsmwixy.supabase.co"

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

  const adminSecret =
    process.env.ADMIN_SECRET ||
    "chainforge-admin-secret-2026"

  const paystackSecretKey =
    process.env.PAYSTACK_SECRET_KEY ||
    "sk_test_chainforge_mock_secret_key"

  const apiKey =
    process.env.VITE_GEMINI_API_KEY

  const openRouterApiKey =
    process.env.OPENROUTER_API_KEY

  const openRouterModel =
    process.env.OPENROUTER_MODEL

  // 1. Public early access waitlist
  if (path === "/api/early-access") {
    const bodyResult = await readJsonBody(req, EARLY_ACCESS_LIMITS.maxBodyBytes)
    if (!bodyResult.ok) {
      res.statusCode = bodyResult.status
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: bodyResult.error }))
      return true
    }

    const response = await handleEarlyAccessRequest({
      method: req.method || "GET",
      url: req.url,
      headers: req.headers,
      body: bodyResult.data,
    })

    res.statusCode = response.status
    if (response.headers) {
      for (const [k, v] of Object.entries(response.headers)) {
        res.setHeader(k, v)
      }
    }
    res.end(JSON.stringify(response.body))
    return true
  }

  // 2. Protected AI Blueprint Generation (Cost: 10 credits)
  if (path === "/api/generate-blueprint") {
    const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
    if (!user) return true

    const bodyResult = await readJsonBody(req, INPUT_LIMITS.maxBodyBytes)
    if (!bodyResult.ok) {
      res.statusCode = bodyResult.status
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: bodyResult.error }))
      return true
    }

    const idempotencyKey =
      (req.headers["x-idempotency-key"] as string) ||
      `bp-${user.id}-${Date.now()}`

    const deduction = await deductCredits(
      supabaseUrl,
      supabaseKey,
      user.id,
      10,
      idempotencyKey,
      "AI Blueprint Generation",
      { path: "/api/generate-blueprint" },
    )

    if (!deduction.success) {
      res.statusCode = 402
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: deduction.error || "Insufficient credits. 10 credits required." }))
      return true
    }

    const response = await handleBlueprintRequest(
      {
        method: req.method || "GET",
        url: req.url,
        headers: req.headers,
        body: bodyResult.data,
      },
      { apiKey, openRouterApiKey, openRouterModel },
    )

    res.statusCode = response.status
    if (response.headers) {
      for (const [k, v] of Object.entries(response.headers)) {
        res.setHeader(k, v)
      }
    }
    res.end(JSON.stringify(response.body))
    return true
  }

  // 3. Protected Web3 Codebase Synthesis (Cost: 25 credits)
  if (path === "/api/generate-codebase") {
    const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
    if (!user) return true

    const bodyResult = await readJsonBody(req, 128 * 1024)
    if (!bodyResult.ok) {
      res.statusCode = bodyResult.status
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: bodyResult.error }))
      return true
    }

    const { projectName, ecosystem, blueprint } = (bodyResult.data || {}) as {
      projectName?: string
      ecosystem?: "evm" | "solana"
      blueprint?: any
    }

    if (!projectName || !ecosystem || !blueprint) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Missing required fields: projectName, ecosystem, blueprint" }))
      return true
    }

    const idempotencyKey =
      (req.headers["x-idempotency-key"] as string) ||
      `cb-${user.id}-${Date.now()}`

    const deduction = await deductCredits(
      supabaseUrl,
      supabaseKey,
      user.id,
      25,
      idempotencyKey,
      "Full Web3 Codebase Generation",
      { projectName, ecosystem },
    )

    if (!deduction.success) {
      res.statusCode = 402
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: deduction.error || "Insufficient credits. 25 credits required." }))
      return true
    }

    try {
      const bundle = await generateCodebaseBundle(
        projectName,
        ecosystem,
        blueprint,
        {
          geminiApiKey: apiKey,
          openRouterApiKey,
          openRouterModel,
        },
      )
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify(bundle))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: msg }))
    }
    return true
  }

  // 4. Projects, Deployments & Token Mints
  if (path === "/api/projects") {
    await handleProjects(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/deployments") {
    await handleDeployments(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/token-mints") {
    await handleTokenMints(req, res, supabaseUrl, supabaseKey)
    return true
  }

  // 5. Administration Endpoints
  if (path === "/api/admin/early-access") {
    await handleAdminEarlyAccess(req, res, adminSecret, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/admin/users") {
    await handleAdminUsers(req, res, adminSecret, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/admin/invitations") {
    await handleAdminInvitations(req, res, adminSecret, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/admin/audit-logs") {
    await handleAdminAuditLogs(req, res, adminSecret, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/admin/bootstrap-owner") {
    await handleBootstrapOwner(req, res, adminSecret, supabaseUrl, supabaseKey)
    return true
  }

  // 6. Commercial Paystack Billing Endpoints
  if (path === "/api/billing/initialize") {
    await handleBillingInitialize(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
    return true
  }

  if (path === "/api/billing/verify") {
    await handleBillingVerify(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
    return true
  }

  if (path === "/api/billing/webhook") {
    await handleBillingWebhook(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
    return true
  }

  if (path === "/api/billing/plans") {
    await handleGetPlans(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/billing/subscription") {
    await handleGetSubscription(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/billing/cancel") {
    await handleCancelSubscription(req, res, supabaseUrl, supabaseKey)
    return true
  }

  // 7. Growth & Go-to-Market Modules
  if (path === "/api/growth/community") {
    await handleGrowthCommunity(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/growth/campaigns") {
    await handleGrowthCampaigns(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/growth/content") {
    await handleGrowthContent(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/growth/kols") {
    await handleGrowthKols(req, res, supabaseUrl, supabaseKey)
    return true
  }

  if (path === "/api/growth/analytics") {
    await handleGrowthAnalytics(req, res, supabaseUrl, supabaseKey)
    return true
  }

  res.statusCode = 404
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify({ error: `Not found: ${path}` }))
  return true
}
