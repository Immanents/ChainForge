// api/billing/verify.ts
// Dedicated Vercel Serverless Function for ChainForge Payment Verification

import type { IncomingMessage, ServerResponse } from "node:http"
import { handleBillingVerify } from "../../server/billingHandler.ts"

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey")

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

  try {
    await handleBillingVerify(req, res, supabaseUrl, supabaseKey, paystackSecretKey)
  } catch (err: unknown) {
    console.error("[Vercel Billing Verify Error]:", err)
    if (!res.writableEnded) {
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json")
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : "Internal Server Error during payment verification",
        }),
      )
    }
  }
}
