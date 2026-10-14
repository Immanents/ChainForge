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

export async function generateBlueprint(
  input: BlueprintInput,
): Promise<BlueprintResult> {
  const response = await fetch("/api/generate-blueprint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error")
    throw new GeminiError(
      `Blueprint generation failed: ${text}`,
      response.status,
    )
  }

  const data = await response.json()
  const validated = validateBlueprintResult(data)

  if (!validated) {
    throw new GeminiError(
      "The AI returned an unexpected response format. Please try again.",
    )
  }

  return validated
}
