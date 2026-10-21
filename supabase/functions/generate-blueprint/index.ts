import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const INPUT_LIMITS = {
  maxBodyBytes: 64 * 1024, // 64 KB
  projectName: { min: 1, max: 100 },
  projectIdea: { min: 1, max: 3000 },
  targetAudience: { max: 500 },
  preferredBlockchain: { max: 50 },
  additionalContext: { max: 2000 },
  timeoutMs: 30_000, // 30 seconds
} as const

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
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-gemini-api-key, x-openrouter-api-key",
    "Access-Control-Max-Age": "86400",
  }
}

function buildBlueprintPrompt(input: {
  projectName: string
  projectIdea: string
  targetAudience: string
  preferredBlockchain?: string
  additionalContext?: string
}): string {
  return `You are a senior Web3 architect and product strategist. A founder has described a project idea below. Analyze it and produce a structured project blueprint.

PROJECT DETAILS:
- Name: ${input.projectName}
- Idea and problem: ${input.projectIdea}
- Target audience: ${input.targetAudience}
${
  input.preferredBlockchain
    ? `- Preferred blockchain: ${input.preferredBlockchain}`
    : "- No blockchain preference specified"
}
${
  input.additionalContext
    ? `- Additional context: ${input.additionalContext}`
    : ""
}

Respond with a JSON object matching this exact schema (no markdown, no code fences, just valid JSON):

{
  "problemStatement": "A clear 2-3 sentence description of the core problem being addressed",
  "targetUsers": "Specific description of who will use this and their primary needs",
  "proposedSolution": "How the project solves the problem, including its unique approach (2-4 sentences)",
  "coreMvpFeatures": ["Feature 1 with brief description", "Feature 2 with brief description", "...at least 4 and at most 8 features"],
  "recommendedArchitecture": "Technical architecture overview covering frontend, backend, smart contracts, and infrastructure (2-4 sentences)",
  "smartContractRequirements": "What smart contracts are needed, their purpose, and key functions. If no smart contracts are needed, explain why. Note: these are requirements only and must be professionally audited before deployment.",
  "securityConsiderations": "Key security risks, mitigations, and assumptions. Include both smart contract security and platform security concerns.",
  "openQuestions": ["Question 1 that the founder needs to decide", "Question 2", "...at least 3 and at most 6 questions"]
}

Important:
- Be specific and actionable, not generic.
- Ground recommendations in the project's actual domain and audience.
- Never claim any smart contract code is production-ready or audited.
- Identify real trade-offs and decisions the founder needs to make.
- If the blockchain preference is unusual for the use case, note that in open questions.`
}

function validateBlueprintResponse(data: unknown): boolean {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.problemStatement === "string" &&
    typeof obj.targetUsers === "string" &&
    typeof obj.proposedSolution === "string" &&
    Array.isArray(obj.coreMvpFeatures) &&
    typeof obj.recommendedArchitecture === "string" &&
    typeof obj.smartContractRequirements === "string" &&
    typeof obj.securityConsiderations === "string" &&
    Array.isArray(obj.openQuestions)
  )
}

async function callOpenRouter(
  prompt: string,
  apiKey: string,
  modelName: string = "google/gemini-3.8-flash",
  timeoutMs: number = 30_000,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string; status: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://chainforge.ai",
        "X-Title": "ChainForge AI",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 3500,
        messages: [
          {
            role: "system",
            content:
              "You are a senior Web3 architect. You strictly output valid JSON matching the requested schema with no markdown formatting.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return {
        ok: false,
        error: `OpenRouter fallback failed (HTTP ${res.status}): ${errText}`,
        status: res.status,
      }
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return { ok: false, error: "Empty response from OpenRouter", status: 502 }
    }

    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()
    const parsed = JSON.parse(cleaned)
    return { ok: true, data: parsed }
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      return { ok: false, error: "OpenRouter generation timed out.", status: 504 }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `OpenRouter error: ${msg}`, status: 502 }
  } finally {
    clearTimeout(timer)
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

  // 3. Payload size limit
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > INPUT_LIMITS.maxBodyBytes) {
    return new Response(
      JSON.stringify({ error: "Payload too large. Maximum size is 64 KB." }),
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
  const projectName = typeof obj.projectName === "string" ? obj.projectName.trim() : ""
  if (
    projectName.length < INPUT_LIMITS.projectName.min ||
    projectName.length > INPUT_LIMITS.projectName.max
  ) {
    return new Response(
      JSON.stringify({
        error: `Project name must be between ${INPUT_LIMITS.projectName.min} and ${INPUT_LIMITS.projectName.max} characters.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const projectIdea = typeof obj.projectIdea === "string" ? obj.projectIdea.trim() : ""
  if (
    projectIdea.length < INPUT_LIMITS.projectIdea.min ||
    projectIdea.length > INPUT_LIMITS.projectIdea.max
  ) {
    return new Response(
      JSON.stringify({
        error: `Project idea must be between ${INPUT_LIMITS.projectIdea.min} and ${INPUT_LIMITS.projectIdea.max} characters.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const targetAudience = typeof obj.targetAudience === "string" ? obj.targetAudience.trim() : ""
  if (targetAudience.length > INPUT_LIMITS.targetAudience.max) {
    return new Response(
      JSON.stringify({
        error: `Target audience cannot exceed ${INPUT_LIMITS.targetAudience.max} characters.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const preferredBlockchain =
    typeof obj.preferredBlockchain === "string" ? obj.preferredBlockchain.trim() : undefined
  if (
    preferredBlockchain &&
    preferredBlockchain.length > INPUT_LIMITS.preferredBlockchain.max
  ) {
    return new Response(
      JSON.stringify({
        error: `Preferred blockchain cannot exceed ${INPUT_LIMITS.preferredBlockchain.max} characters.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const additionalContext =
    typeof obj.additionalContext === "string" ? obj.additionalContext.trim() : undefined
  if (
    additionalContext &&
    additionalContext.length > INPUT_LIMITS.additionalContext.max
  ) {
    return new Response(
      JSON.stringify({
        error: `Additional context cannot exceed ${INPUT_LIMITS.additionalContext.max} characters.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  // 5. Credentials
  const geminiApiKey =
    Deno.env.get("GEMINI_API_KEY") ||
    Deno.env.get("VITE_GEMINI_API_KEY") ||
    req.headers.get("x-gemini-api-key")

  const openRouterApiKey =
    Deno.env.get("OPENROUTER_API_KEY") ||
    req.headers.get("x-openrouter-api-key")

  const openRouterModel =
    Deno.env.get("OPENROUTER_MODEL") || "google/gemini-3.8-flash"

  if (!geminiApiKey && !openRouterApiKey) {
    return new Response(
      JSON.stringify({
        error: "No AI provider keys (GEMINI_API_KEY or OPENROUTER_API_KEY) configured.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const prompt = buildBlueprintPrompt({
    projectName,
    projectIdea,
    targetAudience,
    preferredBlockchain: preferredBlockchain || undefined,
    additionalContext: additionalContext || undefined,
  })

  let geminiError: string | null = null
  let geminiStatus = 502

  // 6. Primary Engine: Google Gemini 3.8 Flash
  if (geminiApiKey) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), INPUT_LIMITS.timeoutMs)

    try {
      const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiApiKey}`
      const upstreamRes = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      })

      if (upstreamRes.ok) {
        const upstreamData = await upstreamRes.json()
        const rawText =
          upstreamData?.candidates?.[0]?.content?.parts?.[0]?.text || ""

        const parsedResult = JSON.parse(rawText)
        if (validateBlueprintResponse(parsedResult)) {
          clearTimeout(timeoutId)
          return new Response(JSON.stringify(parsedResult), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      } else {
        const errText = await upstreamRes.text().catch(() => "")
        console.warn("[Blueprint Edge Function] Gemini returned non-200:", upstreamRes.status, errText)
        geminiStatus = upstreamRes.status
        if (upstreamRes.status === 503 || errText.includes("high demand") || errText.includes("unavailable")) {
          geminiError = "The Gemini AI service is currently experiencing high demand."
        } else if (upstreamRes.status === 429 || errText.toLowerCase().includes("quota")) {
          geminiError = "AI rate limit reached."
        } else {
          geminiError = `Gemini API error (HTTP ${upstreamRes.status})`
        }
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        geminiStatus = 504
        geminiError = "Blueprint generation timed out after 30 seconds."
      } else {
        const message = err instanceof Error ? err.message : String(err)
        geminiStatus = 502
        geminiError = `Gemini request failure: ${message}`
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // 7. Secondary / Fallback Engine: OpenRouter
  if (openRouterApiKey) {
    console.info("[Blueprint Edge Function] Triggering OpenRouter fallback...")
    const fallback = await callOpenRouter(
      prompt,
      openRouterApiKey,
      openRouterModel,
      INPUT_LIMITS.timeoutMs,
    )

    if (fallback.ok && validateBlueprintResponse(fallback.data)) {
      return new Response(JSON.stringify(fallback.data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    console.error("[Blueprint Edge Function] OpenRouter fallback failed:", fallback.error)
  }

  // 8. Return structured failure if both failed or no fallback available
  return new Response(
    JSON.stringify({
      error:
        geminiError ||
        "The AI generation service is temporarily unavailable. Please try again in a moment.",
    }),
    {
      status: geminiStatus || 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  )
})
