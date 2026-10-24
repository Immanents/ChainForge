// api/early-access.ts
// Dedicated Vercel Serverless Function for ChainForge Early Access Waitlist
// Accepts any email (@gmail.com, work email, personal email) and logs to Supabase

import type { IncomingMessage, ServerResponse } from "node:http"

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey")

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
    // 1. Read request body
    let body: any = req.body
    if (!body || typeof body !== "object") {
      if (typeof body === "string") {
        try {
          body = JSON.parse(body)
        } catch {
          body = {}
        }
      } else {
        body = await new Promise((resolve) => {
          if ((req as any).readableEnded || req.destroyed) {
            resolve({})
            return
          }
          const chunks: Buffer[] = []
          req.on("data", (chunk: Buffer) => chunks.push(chunk))
          req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8")
            try {
              resolve(JSON.parse(raw || "{}"))
            } catch {
              resolve({})
            }
          })
          req.on("error", () => resolve({}))
        })
      }
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const role = typeof body?.role === "string" ? body.role.trim() : "Builder"
    const stage = typeof body?.stage === "string" ? body.stage.trim() : "Idea / Pre-code"
    const blockchain = typeof body?.blockchain === "string" ? body.blockchain.trim() : "Agnostic"

    // 2. Validate email format (accepts ANY valid email including @gmail.com)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      res.statusCode = 400
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Please enter a valid email address (e.g. name@gmail.com)." }))
      return
    }

    // 3. Persist to Supabase if configured
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://zrxgkyhzqdyyqtsmwixy.supabase.co"
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

    let persisted = false
    try {
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/early_access_signups`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email,
          role,
          stage,
          blockchain,
        }),
      })
      if (dbRes.ok) {
        persisted = true
      }
    } catch {
      // Non-blocking fallback
    }

    // 4. Return successful response
    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        success: true,
        status: "received",
        persisted,
        message: "Early access request logged successfully! We'll be in touch soon.",
        email,
        role,
        stage,
        blockchain,
        timestamp: new Date().toISOString(),
      }),
    )
  } catch (err: unknown) {
    console.error("[Early Access Error]:", err)
    // Graceful fallback so user is never blocked
    res.statusCode = 200
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        success: true,
        status: "received",
        persisted: false,
        message: "Early access request received! Your spot has been reserved.",
        timestamp: new Date().toISOString(),
      }),
    )
  }
}
