// server/adminHandler.ts
// Protected Waitlist Administration Handler with constant-time verification, CSV sanitization, and rate limiting

import type { IncomingMessage, ServerResponse } from "node:http"
import { createHash, randomBytes, timingSafeEqual } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

// Rate limiting: max 10 failed authentication attempts per IP per 5 minutes
const failedAttempts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = failedAttempts.get(ip)
  if (!record) return false
  if (now > record.resetAt) {
    failedAttempts.delete(ip)
    return false
  }
  return record.count >= 10
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const record = failedAttempts.get(ip)
  if (!record || now > record.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 })
  } else {
    record.count += 1
  }
}

function constantTimeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest()
  const hashB = createHash("sha256").update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

export function sanitizeCsvCell(val?: unknown): string {
  if (val === null || val === undefined) return '""'
  let str = String(val)
  // Strip null bytes and non-printable control characters
  str = str.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
  // Normalize internal linebreaks to prevent row splitting / CSV injection
  str = str.replace(/\r\n|\r|\n/g, " ")
  // Defend against formula injection: leading formula char OR whitespace followed by formula char
  if (/^\s*[=\+\-@\t\r%|]/.test(str)) {
    str = "'" + str
  }
  // Standard RFC 4180 double-quote escaping
  return `"${str.replace(/"/g, '""')}"`
}

function getSafeClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim()
  }
  return req.socket.remoteAddress || "local"
}

export async function handleAdminEarlyAccess(
  req: IncomingMessage,
  res: ServerResponse,
  adminSecret: string,
  supabaseUrl?: string,
  _supabaseKey?: string,
) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Method not allowed. Use GET." }))
    return
  }

  const clientIp = getSafeClientIp(req)
  if (isRateLimited(clientIp)) {
    res.writeHead(429, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        error: "Too many failed authentication attempts. Please try again in 5 minutes.",
      }),
    )
    return
  }

  // 1. Authorization Check
  if (!adminSecret) {
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        error: "Server configuration error: ADMIN_SECRET environment variable is not configured.",
      }),
    )
    return
  }

  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
  const providedKey =
    (req.headers["x-admin-key"] as string) ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("adminKey")

  if (!providedKey || !constantTimeCompare(providedKey, adminSecret)) {
    recordFailedAttempt(clientIp)
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        error: "Unauthorized: Invalid or missing administrative credentials.",
      }),
    )
    return
  }

  const format = url.searchParams.get("format")
  let signups: Array<{
    id: string
    email: string
    role: string
    stage: string
    blockchain: string
    created_at: string
  }> = []

  // 2. Fetch records from Supabase Edge Function
  if (supabaseUrl) {
    try {
      const targetUrl = new URL(`${supabaseUrl}/functions/v1/admin-early-access`)
      url.searchParams.forEach((val, key) => {
        targetUrl.searchParams.set(key, val)
      })

      const resp = await fetch(targetUrl.toString(), {
        headers: {
          "x-admin-key": providedKey,
        },
      })

      if (resp.ok) {
        if (format === "csv") {
          res.setHeader("Content-Type", "text/csv; charset=utf-8")
          res.setHeader(
            "Content-Disposition",
            resp.headers.get("Content-Disposition") ||
              'attachment; filename="chainforge-early-access.csv"',
          )
          const csv = await resp.text()
          res.writeHead(200)
          res.end(csv)
          return
        }

        const data = await resp.json()
        res.writeHead(200, { "Content-Type": "application/json" })
        res.end(JSON.stringify(data))
        return
      }
    } catch (err) {
      console.warn("[Admin Handler] Failed to fetch from Edge Function:", err)
    }
  }

  // 3. Fallback / Local records handling
  const filterRole = url.searchParams.get("role")
  const filterBlockchain = url.searchParams.get("blockchain")
  const search = url.searchParams.get("search")?.toLowerCase()

  if (filterRole) {
    signups = signups.filter((s) => s.role?.toLowerCase() === filterRole.toLowerCase())
  }
  if (filterBlockchain) {
    signups = signups.filter((s) => s.blockchain?.toLowerCase().includes(filterBlockchain.toLowerCase()))
  }
  if (search) {
    signups = signups.filter(
      (s) =>
        s.email?.toLowerCase().includes(search) ||
        s.role?.toLowerCase().includes(search) ||
        s.blockchain?.toLowerCase().includes(search),
    )
  }

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="chainforge-early-access-${new Date().toISOString().slice(0, 10)}.csv"`,
    )

    let csv = "ID,Email,Role,Stage,Blockchain,Created At\n"
    for (const s of signups) {
      csv += `${sanitizeCsvCell(s.id)},${sanitizeCsvCell(s.email)},${sanitizeCsvCell(s.role)},${sanitizeCsvCell(s.stage)},${sanitizeCsvCell(s.blockchain)},${sanitizeCsvCell(s.created_at)}\n`
    }
    res.writeHead(200)
    res.end(csv)
    return
  }

  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(
    JSON.stringify({
      count: signups.length,
      signups,
    }),
  )
}

export async function authenticateAdminRequest(
  req: IncomingMessage,
  adminSecret: string,
  supabaseUrl?: string,
  serviceRoleKey?: string,
): Promise<{ ok: boolean; adminId?: string; error?: string }> {
  const adminKey =
    (req.headers["x-admin-key"] as string) ||
    new URL(req.url || "", `http://${req.headers.host || "localhost"}`).searchParams.get("adminKey")
  if (adminKey && adminSecret && constantTimeCompare(adminKey, adminSecret)) {
    return { ok: true, adminId: "00000000-0000-0000-0000-000000000000" }
  }

  const authHeader = req.headers["authorization"]
  if (authHeader?.startsWith("Bearer ") && supabaseUrl && serviceRoleKey) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim()
    if (adminSecret && constantTimeCompare(token, adminSecret)) {
      return { ok: true, adminId: "00000000-0000-0000-0000-000000000000" }
    }
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey)
      const { data: userData } = await supabase.auth.getUser(token)
      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, role, status")
          .eq("id", userData.user.id)
          .single()
        if (profile?.role === "admin" && profile.status === "active") {
          return { ok: true, adminId: profile.id }
        }
      }
    } catch {
      // ignore
    }
  }

  return { ok: false, error: "Unauthorized: Administrative privileges required." }
}

async function readJson<T>(req: IncomingMessage): Promise<T | null> {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve(null)
      }
    })
  })
}

export async function handleAdminUsers(
  req: IncomingMessage,
  res: ServerResponse,
  adminSecret: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const auth = await authenticateAdminRequest(req, adminSecret, supabaseUrl, serviceRoleKey)
  if (!auth.ok) {
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: auth.error }))
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (req.method === "GET") {
    const { data, error } = await supabase.rpc("admin_list_users")

    if (error || !data?.success) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: data?.error || error?.message }))
      return
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ users: data.users }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      targetUserId: string
      action: "approve" | "suspend" | "revoke" | "change_plan" | "grant_credits"
      plan?: "free_trial" | "builder" | "pro" | "enterprise"
      credits?: number
    }>(req)

    if (!body || !body.targetUserId || !body.action) {
      res.writeHead(400, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Missing targetUserId or action" }))
      return
    }

    const { data, error } = await supabase.rpc("admin_update_user", {
      p_target_user_id: body.targetUserId,
      p_action: body.action,
      p_plan: body.plan || null,
      p_credits: body.credits || null,
      p_admin_id: auth.adminId === "00000000-0000-0000-0000-000000000000" ? null : auth.adminId,
      p_ip: getSafeClientIp(req),
    })

    if (error || !data?.success) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: data?.error || error?.message }))
      return
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ success: true, profile: data.profile }))
    return
  }

  res.writeHead(405, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

export async function handleAdminInvitations(
  req: IncomingMessage,
  res: ServerResponse,
  adminSecret: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const auth = await authenticateAdminRequest(req, adminSecret, supabaseUrl, serviceRoleKey)
  if (!auth.ok) {
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: auth.error }))
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (req.method === "GET") {
    const { data, error } = await supabase.rpc("admin_list_invitations")

    if (error || !data?.success) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: data?.error || error?.message }))
      return
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ invitations: data.invitations }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      action: "create" | "revoke"
      inviteId?: string
      plan?: "free_trial" | "builder" | "pro" | "enterprise"
      initialCredits?: number
      expiresInDays?: number
    }>(req)

    if (!body || !body.action) {
      res.writeHead(400, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Missing action in request body" }))
      return
    }

    if (body.action === "revoke" && body.inviteId) {
      const { data, error } = await supabase.rpc("admin_revoke_invitation", {
        p_invite_id: body.inviteId,
      })

      if (error || !data?.success) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: data?.error || error?.message }))
        return
      }

      await supabase.rpc("admin_record_audit_log", {
        p_admin_id: auth.adminId === "00000000-0000-0000-0000-000000000000" ? null : auth.adminId,
        p_action: "invite_revoked",
        p_details: { inviteId: body.inviteId, code: data.invitation?.code },
        p_ip: getSafeClientIp(req),
      })

      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: true, invitation: data.invitation }))
      return
    }

    if (body.action === "create") {
      const codePart = randomBytes(4).toString("hex").toUpperCase()
      const code = `CF-${codePart.slice(0, 4)}-${codePart.slice(4)}`
      const days = body.expiresInDays || 14
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      const plan = body.plan || "builder"
      const initialCredits = body.initialCredits ?? (plan === "pro" ? 250 : plan === "enterprise" ? 1000 : 50)

      const { data, error } = await supabase.rpc("admin_create_invitation", {
        p_code: code,
        p_plan: plan,
        p_initial_credits: initialCredits,
        p_expires_at: expiresAt,
        p_created_by: auth.adminId === "00000000-0000-0000-0000-000000000000" ? null : auth.adminId,
      })

      if (error || !data?.success) {
        res.writeHead(500, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: data?.error || error?.message }))
        return
      }

      await supabase.rpc("admin_record_audit_log", {
        p_admin_id: auth.adminId === "00000000-0000-0000-0000-000000000000" ? null : auth.adminId,
        p_action: "invite_created",
        p_details: { code, plan, initialCredits, expiresAt },
        p_ip: getSafeClientIp(req),
      })

      res.writeHead(201, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ success: true, invitation: data.invitation }))
      return
    }
  }

  res.writeHead(405, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

export async function handleAdminAuditLogs(
  req: IncomingMessage,
  res: ServerResponse,
  adminSecret: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  const auth = await authenticateAdminRequest(req, adminSecret, supabaseUrl, serviceRoleKey)
  if (!auth.ok) {
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: auth.error }))
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.rpc("admin_list_audit_logs")

  if (error || !data?.success) {
    res.writeHead(500, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: data?.error || error?.message }))
    return
  }

  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ auditLogs: data.auditLogs }))
}

export async function handleBootstrapOwner(
  req: IncomingMessage,
  res: ServerResponse,
  adminSecret: string,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-key")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Method not allowed" }))
    return
  }

  // Owner bootstrap must be authenticated with ADMIN_SECRET / x-admin-key
  const adminKey = req.headers["x-admin-key"] as string
  if (!adminKey || !adminSecret || !constantTimeCompare(adminKey, adminSecret)) {
    res.writeHead(401, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Unauthorized: Invalid administrative secret." }))
    return
  }

  const body = await readJson<{ email: string }>(req)
  if (!body || !body.email) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: "Missing email parameter" }))
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data, error } = await supabase.rpc("admin_bootstrap_owner", {
    p_email: body.email.trim(),
  })

  if (error || !data?.success) {
    res.writeHead(400, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: data?.error || error?.message || "Failed to promote user" }))
    return
  }

  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(JSON.stringify(data))
}

