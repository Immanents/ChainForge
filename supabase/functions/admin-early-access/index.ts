import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || ""
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
    "Access-Control-Max-Age": "86400",
  }
}

async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const hashA = await crypto.subtle.digest("SHA-256", encoder.encode(a))
  const hashB = await crypto.subtle.digest("SHA-256", encoder.encode(b))
  const viewA = new Uint8Array(hashA)
  const viewB = new Uint8Array(hashB)
  let diff = 0
  for (let i = 0; i < viewA.length; i++) {
    diff |= viewA[i] ^ viewB[i]
  }
  return diff === 0 && a.length === b.length
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

function getSafeClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp.trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0].trim()
    if (first) return first
  }
  return "unknown"
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use GET." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const expectedKey = Deno.env.get("ADMIN_SECRET")

  if (!expectedKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error: Required secrets not configured." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Enforce distributed rate limiting across Edge Function instances
  const clientIp = getSafeClientIp(req)
  try {
    const { data: allowed, error: rateLimitErr } = await supabase.rpc("check_admin_rate_limit", {
      p_ip: clientIp,
      p_max_attempts: 10,
      p_window_seconds: 300,
    })

    if (!rateLimitErr && allowed === false) {
      return new Response(
        JSON.stringify({ error: "Too many authentication attempts. Please try again in 5 minutes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
  } catch (err) {
    console.warn("[Admin Auth] Rate limit check exception:", err)
  }

  // 2. Admin Authentication Check
  const url = new URL(req.url)
  const adminKey =
    req.headers.get("x-admin-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("adminKey")

  if (!adminKey || !(await constantTimeCompare(adminKey, expectedKey))) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: Invalid administrative credentials." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  // 3. Fetch using service role key
  const { data, error } = await supabase
    .from("early_access_signups")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  let signups = data || []

  // 4. Optional filters
  const filterRole = url.searchParams.get("role")
  const filterBlockchain = url.searchParams.get("blockchain")
  const search = url.searchParams.get("search")?.toLowerCase()

  if (filterRole) {
    signups = signups.filter((s: any) => s.role?.toLowerCase() === filterRole.toLowerCase())
  }
  if (filterBlockchain) {
    signups = signups.filter((s: any) => s.blockchain?.toLowerCase().includes(filterBlockchain.toLowerCase()))
  }
  if (search) {
    signups = signups.filter(
      (s: any) =>
        s.email?.toLowerCase().includes(search) ||
        s.role?.toLowerCase().includes(search) ||
        s.blockchain?.toLowerCase().includes(search),
    )
  }

  // 5. Format CSV if requested with formula injection sanitization
  const format = url.searchParams.get("format")
  if (format === "csv") {
    let csv = "ID,Email,Role,Stage,Blockchain,Created At\n"
    for (const s of signups) {
      csv += `${sanitizeCsvCell(s.id)},${sanitizeCsvCell(s.email)},${sanitizeCsvCell(s.role)},${sanitizeCsvCell(s.stage)},${sanitizeCsvCell(s.blockchain)},${sanitizeCsvCell(s.created_at)}\n`
    }
    return new Response(csv, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="chainforge-early-access-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  return new Response(
    JSON.stringify({ count: signups.length, signups }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
