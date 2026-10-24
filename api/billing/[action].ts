// api/billing/[action].ts
// Catch-all dynamic Vercel Serverless Function for ChainForge Billing

import type { IncomingMessage, ServerResponse } from "node:http"
import {
  handleBillingInitialize,
  handleBillingVerify,
  handleBillingWebhook,
  handleGetPlans,
  handleGetSubscription,
  handleCancelSubscription,
} from "../../server/billingHandler.ts"

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]>; body?: any },
  res: ServerResponse,
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey, x-idempotency-key, x-paystack-signature")

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    "https://zrxgkyhzqdyyqtsmwixy.supabase.co"

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

  const paystackSecretKey =
    process.env.PAYSTACK_SECRET_KEY ||
    "sk_test_chainforge_mock_secret_key"

  let action = ""
  if (req.query?.action) {
    action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action
  }
  if (!action && req.url) {
    const parts = req.url.split("?")[0].split("/").filter(Boolean)
    action = parts[parts.length - 1] || ""
  }

  try {
    switch (action) {
      case "initialize":
        await handleBillingInitialize(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
        break
      case "verify":
        await handleBillingVerify(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
        break
      case "subscription":
        await handleGetSubscription(req, res, supabaseUrl, supabaseKey)
        break
      case "cancel":
        await handleCancelSubscription(req, res, supabaseUrl, supabaseKey)
        break
      case "plans":
        await handleGetPlans(req, res, supabaseUrl, supabaseKey)
        break
      case "webhook":
        await handleBillingWebhook(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
        break
      default:
        res.statusCode = 404
        res.setHeader("Content-Type", "application/json")
        res.end(JSON.stringify({ error: `Billing endpoint '${action}' not found` }))
    }
  } catch (err: unknown) {
    console.error("[Vercel Billing Action Error]:", err)
    if (!res.writableEnded) {
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json")
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal Server Error in billing router",
        }),
      )
    }
  }
}
