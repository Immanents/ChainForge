import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ApiRequest, ApiResponse } from "./types.ts"

export interface ValidatedBlueprintInput {
  projectName: string
  projectIdea: string
  targetAudience: string
  preferredBlockchain?: string
  additionalContext?: string
}

export const INPUT_LIMITS = {
  maxBodyBytes: 64 * 1024, // 64 KB
  projectName: { min: 1, max: 100 },
  projectIdea: { min: 1, max: 3000 },
  targetAudience: { max: 500 },
  preferredBlockchain: { max: 50 },
  additionalContext: { max: 2000 },
  timeoutMs: 30_000, // 30 seconds
} as const

export function validateBlueprintPayload(
  raw: unknown,
): { valid: true; data: ValidatedBlueprintInput } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Request body must be a valid JSON object." }
  }

  const obj = raw as Record<string, unknown>

  const projectName = typeof obj.projectName === "string" ? obj.projectName.trim() : ""
  if (
    projectName.length < INPUT_LIMITS.projectName.min ||
    projectName.length > INPUT_LIMITS.projectName.max
  ) {
    return {
      valid: false,
      error: `Project name must be between ${INPUT_LIMITS.projectName.min} and ${INPUT_LIMITS.projectName.max} characters.`,
    }
  }

  const projectIdea = typeof obj.projectIdea === "string" ? obj.projectIdea.trim() : ""
  if (
    projectIdea.length < INPUT_LIMITS.projectIdea.min ||
    projectIdea.length > INPUT_LIMITS.projectIdea.max
  ) {
    return {
      valid: false,
      error: `Project idea must be between ${INPUT_LIMITS.projectIdea.min} and ${INPUT_LIMITS.projectIdea.max} characters.`,
    }
  }

  const targetAudience = typeof obj.targetAudience === "string" ? obj.targetAudience.trim() : ""
  if (targetAudience.length > INPUT_LIMITS.targetAudience.max) {
    return {
      valid: false,
      error: `Target audience cannot exceed ${INPUT_LIMITS.targetAudience.max} characters.`,
    }
  }

  const preferredBlockchain =
    typeof obj.preferredBlockchain === "string" ? obj.preferredBlockchain.trim() : undefined
  if (
    preferredBlockchain &&
    preferredBlockchain.length > INPUT_LIMITS.preferredBlockchain.max
  ) {
    return {
      valid: false,
      error: `Preferred blockchain cannot exceed ${INPUT_LIMITS.preferredBlockchain.max} characters.`,
    }
  }

  const additionalContext =
    typeof obj.additionalContext === "string" ? obj.additionalContext.trim() : undefined
  if (
    additionalContext &&
    additionalContext.length > INPUT_LIMITS.additionalContext.max
  ) {
    return {
      valid: false,
      error: `Additional context cannot exceed ${INPUT_LIMITS.additionalContext.max} characters.`,
    }
  }

  return {
    valid: true,
    data: {
      projectName,
      projectIdea,
      targetAudience,
      preferredBlockchain: preferredBlockchain || undefined,
      additionalContext: additionalContext || undefined,
    },
  }
}

export function buildBlueprintPrompt(input: ValidatedBlueprintInput): string {
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

export async function handleBlueprintRequest(
  req: ApiRequest,
  env: {
    apiKey?: string
    openRouterApiKey?: string
    openRouterModel?: string
  },
): Promise<ApiResponse> {
  // Method validation
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: { error: "Method not allowed. Use POST." },
    }
  }

  // Payload validation
  const validation = validateBlueprintPayload(req.body)
  if (!validation.valid) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: validation.error },
    }
  }

  const prompt = buildBlueprintPrompt(validation.data)
  const geminiApiKey = env.apiKey

  let geminiError: string | null = null
  let geminiStatusCode = 502

  // 1. Primary: Attempt Gemini 3.8 Flash Generation
  if (geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: "gemini-3.8-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      })

      const result = await model.generateContent(prompt, {
        timeout: INPUT_LIMITS.timeoutMs,
      })

      const text = result.response.text()
      const parsed = JSON.parse(text)

      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: parsed,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.warn("[Blueprint Handler] Primary Gemini attempt encountered issue:", errorMsg)

      if (errorMsg.includes("503") || errorMsg.toLowerCase().includes("high demand") || errorMsg.toLowerCase().includes("unavailable")) {
        geminiStatusCode = 503
        geminiError = "The Gemini AI service is currently experiencing high demand. Please try again in a moment."
      } else if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
        geminiStatusCode = 429
        geminiError = "AI rate limit reached. Please wait a moment before trying again."
      } else if (errorMsg.includes("timeout") || errorMsg.includes("aborted")) {
        geminiStatusCode = 504
        geminiError = "Blueprint generation timed out after 30 seconds. Please try again."
      } else {
        geminiStatusCode = 502
        geminiError = `Gemini API error: ${errorMsg}`
      }
    }
  } else {
    geminiError = "VITE_GEMINI_API_KEY is not configured on the server."
    geminiStatusCode = 500
  }

  // 2. Secondary: Fall back to OpenRouter if configured
  if (env.openRouterApiKey) {
    console.info("[Blueprint Handler] Triggering OpenRouter fallback...")
    const fallback = await callOpenRouter(
      prompt,
      env.openRouterApiKey,
      env.openRouterModel || "google/gemini-3.8-flash",
      INPUT_LIMITS.timeoutMs,
    )

    if (fallback.ok) {
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: fallback.data,
      }
    }

    console.error("[Blueprint Handler] OpenRouter fallback also failed:", fallback.error)
  }

  // If no fallback was available or fallback failed, return the primary error
  return {
    status: geminiStatusCode,
    headers: { "Content-Type": "application/json" },
    body: {
      error: geminiError || "AI service is currently unavailable. Please try again.",
    },
  }
}
