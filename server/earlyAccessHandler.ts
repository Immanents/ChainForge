import type { ApiRequest, ApiResponse } from "./types.ts"

export interface ValidatedEarlyAccessInput {
  email: string
  role: string
  stage: string
  blockchain: string
}

export const EARLY_ACCESS_LIMITS = {
  maxBodyBytes: 16 * 1024, // 16 KB
  email: { max: 254 },
  field: { max: 50 },
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEarlyAccessPayload(
  raw: unknown,
): { valid: true; data: ValidatedEarlyAccessInput } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "Request body must be a valid JSON object." }
  }

  const obj = raw as Record<string, unknown>

  const email = typeof obj.email === "string" ? obj.email.trim() : ""
  if (!email || email.length > EARLY_ACCESS_LIMITS.email.max || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Please provide a valid email address." }
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

  return {
    valid: true,
    data: {
      email,
      role,
      stage,
      blockchain,
    },
  }
}

export async function handleEarlyAccessRequest(
  req: ApiRequest,
): Promise<ApiResponse> {
  // Method validation
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
      body: { error: "Method not allowed. Use POST." },
    }
  }

  const validation = validateEarlyAccessPayload(req.body)
  if (!validation.valid) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: validation.error },
    }
  }

  const { email, role, stage, blockchain } = validation.data

  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: {
      status: "received",
      persisted: false,
      message:
        "Request received in local preview registry. Production CRM integration is pending deployment.",
      email,
      role,
      stage,
      blockchain,
      timestamp: new Date().toISOString(),
    },
  }
}
