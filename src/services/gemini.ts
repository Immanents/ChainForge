import {
  validateBlueprintResult,
  type BlueprintInput,
  type BlueprintResult,
} from "../data/blueprints"

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = "GeminiError"
  }
}

const CLIENT_TIMEOUT_MS = 35_000 // 35 seconds

export async function generateBlueprint(
  input: BlueprintInput,
): Promise<BlueprintResult> {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
  const endpoint = apiBase
    ? `${apiBase}/generate-blueprint`
    : "/api/generate-blueprint"

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    })

    if (!response.ok) {
      let errorMessage = `Blueprint generation failed (HTTP ${response.status})`
      try {
        const errData = await response.json()
        if (errData && typeof errData.error === "string") {
          errorMessage = errData.error
        }
      } catch {
        const text = await response.text().catch(() => "")
        if (text) errorMessage = text
      }
      throw new GeminiError(errorMessage, response.status)
    }

    const data = await response.json()
    const validated = validateBlueprintResult(data)

    if (!validated) {
      throw new GeminiError(
        "The AI returned an unexpected response format. Please try again.",
      )
    }

    return validated
  } catch (err: unknown) {
    if (err instanceof GeminiError) {
      throw err
    }

    if (controller.signal.aborted) {
      throw new GeminiError(
        "Blueprint generation timed out after 35 seconds. Please try again.",
        504,
      )
    }

    const message = err instanceof Error ? err.message : String(err)
    throw new GeminiError(`Network or connection error: ${message}`)
  } finally {
    clearTimeout(timer)
  }
}
