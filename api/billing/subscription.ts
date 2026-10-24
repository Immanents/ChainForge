// api/billing/subscription.ts
// Dedicated Self-Contained Vercel Serverless Function for ChainForge Subscription & Transactions

import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"

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

  const authHeader = req.headers["authorization"] || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    res.statusCode = 401
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Unauthorized: Missing token" }))
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) {
      res.statusCode = 401
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Unauthorized: Invalid session" }))
      return
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: transactions } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(15)

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ subscription: subscription || null, transactions: transactions || [] }))
  } catch (err: unknown) {
    console.error("[Subscription Fetch Error]:", err)
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Failed to load subscription data" }))
  }
}
