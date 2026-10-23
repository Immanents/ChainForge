// server/authMiddleware.ts
// Server-side authentication, tenant validation, and atomic credit deduction

import { createClient } from "@supabase/supabase-js"
import type { IncomingMessage, ServerResponse } from "node:http"

export type AuthenticatedUser = {
  id: string
  email: string
  role: "user" | "admin"
  status: "pending" | "active" | "suspended" | "revoked"
  plan: "free_trial" | "builder" | "pro" | "enterprise"
  credits_balance: number
}

export async function authenticateRequest(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.statusCode = 401
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: "Unauthorized: Missing or invalid authentication token. Please sign in to access ChainForge AI.",
      }),
    )
    return null
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    res.statusCode = 401
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Unauthorized: Empty authentication bearer token." }))
    return null
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })

  // 1. Verify user session token against Supabase Auth
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData?.user) {
    res.statusCode = 401
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: "Unauthorized: Invalid or expired session. Please sign in again.",
      }),
    )
    return null
  }

  const user = userData.user

  // 2. Fetch user profile from database
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    res.statusCode = 403
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: "Forbidden: Account profile not initialized.",
      }),
    )
    return null
  }

  // 3. Status checks
  if (profile.status === "pending") {
    res.statusCode = 403
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: "Forbidden: Account is pending administrator approval or invitation code activation.",
        status: "pending",
      }),
    )
    return null
  }

  if (profile.status === "suspended" || profile.status === "revoked") {
    res.statusCode = 403
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: `Forbidden: Account access is ${profile.status}. Please contact an administrator.`,
        status: profile.status,
      }),
    )
    return null
  }

  return {
    id: user.id,
    email: user.email || profile.email,
    role: profile.role,
    status: profile.status,
    plan: profile.plan,
    credits_balance: profile.credits_balance,
  }
}

export async function deductCredits(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  cost: number,
  idempotentKey: string,
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<{ success: boolean; error?: string; balance?: number }> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  })
  const { data, error } = await supabase.rpc("deduct_user_credits", {
    p_user_id: userId,
    p_cost: cost,
    p_idempotent_key: idempotentKey,
    p_reason: reason,
    p_metadata: metadata,
  })

  if (error || !data?.success) {
    return {
      success: false,
      error: data?.error || error?.message || "Failed to process credits deduction",
    }
  }

  return {
    success: true,
    balance: data.balance,
  }
}
