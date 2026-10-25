// server/contentHandler.ts
// Secure server-side AI Content Generation Handler for ChainForge Content Studio
// Uses Google Gemini API with automatic high-availability OpenRouter fallback

import dns from "node:dns"
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first")
}

import { GoogleGenerativeAI } from "@google/generative-ai"
import type { ApiRequest, ApiResponse } from "./types.ts"

export interface ContentGenerationInput {
  platform: "X" | "LinkedIn" | "Telegram" | "Discord"
  contentType: "Launch post" | "Thread" | "Update" | "Educational"
  topic: string
  tone: "Confident" | "Technical" | "Conversational" | "Visionary" | "Urgent"
  goal: "Drive awareness" | "Educate" | "Engage" | "Waitlist / Conversion"
  audience: "Web3 builders" | "Token holders" | "DeFi users" | "Enterprise partners"
  additionalInstructions?: string
  brandContext?: string
}

export interface ContentVariation {
  id: string
  title: string
  content: string
  platform: string
  characterCount: number
  hook?: string
  callToAction?: string
  suggestedHashtags?: string[]
}

export interface ContentGenerationResult {
  variations: ContentVariation[]
  platform: string
  contentType: string
  generatedAt: string
}

export const CONTENT_LIMITS = {
  maxBodyBytes: 32 * 1024,
  topic: { min: 3, max: 1000 },
  additionalInstructions: { max: 2000 },
  timeoutMs: 35_000,
} as const

export function validateContentPayload(
  raw: unknown,
): { valid: true; data: ContentGenerationInput } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Request body must be a valid JSON object." }
  }

  const obj = raw as Record<string, unknown>

  const topic = typeof obj.topic === "string" ? obj.topic.trim() : ""
  if (topic.length < CONTENT_LIMITS.topic.min || topic.length > CONTENT_LIMITS.topic.max) {
    return {
      valid: false,
      error: `Topic must be between ${CONTENT_LIMITS.topic.min} and ${CONTENT_LIMITS.topic.max} characters.`,
    }
  }

  const validPlatforms = ["X", "LinkedIn", "Telegram", "Discord"] as const
  const platform = validPlatforms.includes(obj.platform as any)
    ? (obj.platform as ContentGenerationInput["platform"])
    : "X"

  const validTypes = ["Launch post", "Thread", "Update", "Educational"] as const
  const contentType = validTypes.includes(obj.contentType as any)
    ? (obj.contentType as ContentGenerationInput["contentType"])
    : "Launch post"

  const validTones = ["Confident", "Technical", "Conversational", "Visionary", "Urgent"] as const
  const tone = validTones.includes(obj.tone as any)
    ? (obj.tone as ContentGenerationInput["tone"])
    : "Confident"

  const validGoals = ["Drive awareness", "Educate", "Engage", "Waitlist / Conversion"] as const
  const goal = validGoals.includes(obj.goal as any)
    ? (obj.goal as ContentGenerationInput["goal"])
    : "Drive awareness"

  const validAudiences = ["Web3 builders", "Token holders", "DeFi users", "Enterprise partners"] as const
  const audience = validAudiences.includes(obj.audience as any)
    ? (obj.audience as ContentGenerationInput["audience"])
    : "Web3 builders"

  const additionalInstructions =
    typeof obj.additionalInstructions === "string" ? obj.additionalInstructions.trim() : undefined
  if (additionalInstructions && additionalInstructions.length > CONTENT_LIMITS.additionalInstructions.max) {
    return {
      valid: false,
      error: `Additional instructions cannot exceed ${CONTENT_LIMITS.additionalInstructions.max} characters.`,
    }
  }

  const brandContext =
    typeof obj.brandContext === "string" && obj.brandContext.trim()
      ? obj.brandContext.trim()
      : "Nova Protocol"

  return {
    valid: true,
    data: {
      topic,
      platform,
      contentType,
      tone,
      goal,
      audience,
      additionalInstructions: additionalInstructions || undefined,
      brandContext,
    },
  }
}

export function buildContentPrompt(input: ContentGenerationInput): string {
  const platformGuidelines: Record<string, string> = {
    X: `Platform: X (Twitter).
Formatting rules:
- If contentType is "Launch post" or "Update": Keep each variation strictly under 280 characters. Include a powerful opening hook, crisp value statement, 1-2 relevant hashtags (e.g. #Web3), and a clear call to action or link pointer (e.g. "Explore ↓").
- If contentType is "Thread": Produce a cohesive 3-tweet sequence separated by clean line breaks, labeled [1/3], [2/3], [3/3].
- If contentType is "Educational": Provide a concise insight with bullet points or numbered takeaways under 280 characters.`,

    LinkedIn: `Platform: LinkedIn.
Formatting rules:
- Professional thought-leadership framing with conversational readability.
- Strong opening headline/hook in the first 2 lines.
- Short digestible paragraphs with 2-3 bullet points for key takeaways.
- Include 3-5 professional hashtags at the end (e.g. #Web3 #Blockchain #DeFi).
- End with a thought-provoking question to prompt comments and a clear call to action.`,

    Telegram: `Platform: Telegram.
Formatting rules:
- Direct, high-energy community communication.
- Use bold text headers (e.g. **🚀 Major Protocol Milestone**) and bullet points (•).
- Clear, punchy breakdown of why this matters for the community and token holders.
- Prominent call to action with links (e.g. "👉 Read the full docs:").`,

    Discord: `Platform: Discord.
Formatting rules:
- Formatted as an official announcement for an announcements channel.
- Use Discord markdown: header prefixes (📢 **ANNOUNCEMENT**), subheadings, bullet lists.
- Highlight community impact, next steps, and roles.
- Conclude with a clear action item for members.`,
  }

  return `You are an elite Web3 growth strategist, copywriter, and developer relations lead for ${input.brandContext}.
Generate exactly 3 DISTINCT, high-converting content variations based on the following specifications.

SPECIFICATIONS:
- Brand Context: ${input.brandContext}
- Target Platform: ${input.platform}
- Content Type: ${input.contentType}
- Core Topic / Brief: "${input.topic}"
- Tone of Voice: ${input.tone}
- Primary Objective: ${input.goal}
- Target Audience: ${input.audience}
${input.additionalInstructions ? `- Additional Guidance & Constraints: "${input.additionalInstructions}"` : ""}

PLATFORM GUIDELINES:
${platformGuidelines[input.platform] || platformGuidelines.X}

OUTPUT REQUIREMENTS:
Output strictly valid JSON matching this exact schema with NO extraneous commentary or markdown backticks:
{
  "variations": [
    {
      "id": "var-1",
      "title": "Short descriptive title for variation 1 (e.g. Narrative Hook)",
      "content": "Full post copy formatted exactly for the platform",
      "platform": "${input.platform}",
      "characterCount": 240,
      "hook": "Opening hook sentence",
      "callToAction": "Call to action used",
      "suggestedHashtags": ["#Tag1", "#Tag2"]
    },
    {
      "id": "var-2",
      "title": "Short descriptive title for variation 2 (e.g. Feature Focus)",
      "content": "Full post copy formatted exactly for the platform",
      "platform": "${input.platform}",
      "characterCount": 235,
      "hook": "Opening hook sentence",
      "callToAction": "Call to action used",
      "suggestedHashtags": ["#Tag1", "#Tag2"]
    },
    {
      "id": "var-3",
      "title": "Short descriptive title for variation 3 (e.g. Question / Community Angle)",
      "content": "Full post copy formatted exactly for the platform",
      "platform": "${input.platform}",
      "characterCount": 250,
      "hook": "Opening hook sentence",
      "callToAction": "Call to action used",
      "suggestedHashtags": ["#Tag1", "#Tag2"]
    }
  ]
}`
}

async function callOpenRouter(
  prompt: string,
  apiKey: string,
  modelName: string,
  timeoutMs: number,
): Promise<{ ok: true; data: ContentGenerationResult } | { ok: false; error: string; status: number }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://chainforge.ai",
        "X-Title": "ChainForge Content Studio",
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content:
              "You are an elite Web3 growth copywriter. You strictly output valid JSON matching the requested schema with no markdown formatting.",
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
      return { ok: false, error: "Content generation timed out.", status: 504 }
    }
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `OpenRouter error: ${msg}`, status: 502 }
  } finally {
    clearTimeout(timer)
  }
}

export async function handleContentGenerationRequest(
  req: ApiRequest,
  env: {
    apiKey?: string
    openRouterApiKey?: string
    openRouterModel?: string
  },
): Promise<ApiResponse> {
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: { error: "Method not allowed. Use POST." },
    }
  }

  const validation = validateContentPayload(req.body)
  if (!validation.valid) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: validation.error },
    }
  }

  const prompt = buildContentPrompt(validation.data)
  const geminiApiKey = env.apiKey

  let geminiError: string | null = null
  let geminiStatusCode = 502

  // 1. Primary: Attempt Gemini Direct API
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
        timeout: CONTENT_LIMITS.timeoutMs,
      })

      const text = result.response.text()
      const parsed = JSON.parse(text)

      if (parsed && Array.isArray(parsed.variations) && parsed.variations.length > 0) {
        return {
          status: 200,
          headers: { "Content-Type": "application/json" },
          body: {
            variations: parsed.variations,
            platform: validation.data.platform,
            contentType: validation.data.contentType,
            generatedAt: new Date().toISOString(),
          },
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.warn("[Content Handler] Primary Gemini attempt encountered issue:", errorMsg)

      if (
        errorMsg.includes("503") ||
        errorMsg.toLowerCase().includes("high demand") ||
        errorMsg.toLowerCase().includes("unavailable")
      ) {
        geminiStatusCode = 503
        geminiError = "The Gemini AI service is currently experiencing high demand. Please try again in a moment."
      } else if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
        geminiStatusCode = 429
        geminiError = "AI rate limit reached. Please wait a moment before trying again."
      } else if (errorMsg.includes("timeout") || errorMsg.includes("aborted")) {
        geminiStatusCode = 504
        geminiError = "Content generation timed out after 35 seconds. Please try again."
      } else {
        geminiStatusCode = 502
        geminiError = `Gemini API error: ${errorMsg}`
      }
    }
  } else {
    geminiError = "VITE_GEMINI_API_KEY is not configured on the server."
    geminiStatusCode = 500
  }

  // 2. Secondary: Fall back to OpenRouter
  if (env.openRouterApiKey) {
    console.info("[Content Handler] Triggering OpenRouter fallback...")
    const fallback = await callOpenRouter(
      prompt,
      env.openRouterApiKey,
      env.openRouterModel || "google/gemini-3.8-flash",
      CONTENT_LIMITS.timeoutMs,
    )

    if (fallback.ok && fallback.data?.variations) {
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
          variations: fallback.data.variations,
          platform: validation.data.platform,
          contentType: validation.data.contentType,
          generatedAt: new Date().toISOString(),
        },
      }
    } else if (!fallback.ok) {
      console.error("[Content Handler] OpenRouter fallback also failed:", fallback.error)
    }
  }

  return {
    status: geminiStatusCode,
    headers: { "Content-Type": "application/json" },
    body: {
      error: geminiError || "AI content generation service is currently unavailable. Please try again.",
    },
  }
}
