// api/billing/cancel.ts
// Dedicated Self-Contained Vercel Serverless Function for ChainForge Subscription Cancellation

import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
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
    res.end(JSON.stringify({ error: "Unauthorized" }))
    return
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: userData } = await supabase.auth.getUser(token)
    if (!userData?.user) {
      res.statusCode = 401
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Invalid session" }))
      return
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", userData.user.id)
      .eq("status", "active")
      .select()

    if (error) {
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ success: true, message: "Subscription will cancel at period end", subscription: data?.[0] }))
  } catch (err: unknown) {
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Failed to cancel subscription" }))
  }
}
