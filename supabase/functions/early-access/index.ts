import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const EARLY_ACCESS_LIMITS = {
  maxBodyBytes: 16 * 1024, // 16 KB
  email: { max: 254 },
  field: { max: 50 },
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || ""
  const isAllowed =
    origin.includes("localhost") ||
    origin.endsWith(".figma.com") ||
    origin.endsWith(".figma.site") ||
    origin === ""

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  // 1. Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 2. Enforce POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json", Allow: "POST" },
      },
    )
  }

  // 3. Payload size check
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > EARLY_ACCESS_LIMITS.maxBodyBytes) {
    return new Response(
      JSON.stringify({ error: "Payload too large. Maximum size is 16 KB." }),
      {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  // 4. Parse JSON
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return new Response(
      JSON.stringify({ error: "Request body must be a valid JSON object." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const obj = body as Record<string, unknown>
  const email = typeof obj.email === "string" ? obj.email.trim() : ""

  if (!email || email.length > EARLY_ACCESS_LIMITS.email.max || !EMAIL_REGEX.test(email)) {
    return new Response(
      JSON.stringify({ error: "Please provide a valid email address." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const role =
    typeof obj.role === "string" && obj.role.trim()
      ? obj.role.trim().slice(0, EARLY_ACCESS_LIMITS.field.max)
      : "Builder"

  const stage =
    typeof obj.stage === "string" && obj.stage.trim()
      ? obj.stage.trim().slice(0, EARLY_ACCESS_LIMITS.field.max)
      : "Idea"

  const blockchain =
    typeof obj.blockchain === "string" && obj.blockchain.trim()
      ? obj.blockchain.trim().slice(0, EARLY_ACCESS_LIMITS.field.max)
      : "Agnostic"

  // 5. Server-side persistence via PostgREST if Supabase service role is available
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  let persisted = false
  if (supabaseUrl && serviceRoleKey) {
    try {
      const dbResponse = await fetch(`${supabaseUrl}/rest/v1/early_access_signups`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
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

      if (dbResponse.ok) {
        persisted = true
      } else {
        console.error("[Early Access] DB insert failed:", dbResponse.status, await dbResponse.text().catch(() => ""))
      }
    } catch (err) {
      console.error("[Early Access] DB connection error:", err)
    }
  }

  const timestamp = new Date().toISOString()

  return new Response(
    JSON.stringify({
      status: "received",
      persisted,
      message: persisted
        ? "Welcome to ChainForge Early Access. Your request has been securely recorded."
        : "Request received in local preview registry. Production CRM integration is pending deployment.",
      email,
      role,
      stage,
      blockchain,
      timestamp,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  )
})
