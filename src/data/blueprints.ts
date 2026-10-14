export type Blueprint = {
  id: string
  projectId: string
  createdAt: string
  input: BlueprintInput
  result: BlueprintResult
}

export type BlueprintInput = {
  projectName: string
  projectIdea: string
  targetAudience: string
  preferredBlockchain: string
  additionalContext: string
}

export type BlueprintResult = {
  problemStatement: string
  targetUsers: string
  proposedSolution: string
  coreMvpFeatures: string[]
  recommendedArchitecture: string
  smartContractRequirements: string
  securityConsiderations: string
  openQuestions: string[]
}

const STORAGE_KEY = "chainforge-blueprints"

export function loadBlueprints(): Blueprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveBlueprint(blueprint: Blueprint): void {
  const existing = loadBlueprints()
  const index = existing.findIndex((b) => b.id === blueprint.id)
  if (index >= 0) {
    existing[index] = blueprint
  } else {
    existing.push(blueprint)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function deleteBlueprint(id: string): void {
  const existing = loadBlueprints().filter((b) => b.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function validateBlueprintResult(data: unknown): BlueprintResult | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>
  if (typeof obj.problemStatement !== "string") return null
  if (typeof obj.targetUsers !== "string") return null
  if (typeof obj.proposedSolution !== "string") return null
  if (!Array.isArray(obj.coreMvpFeatures)) return null
  if (typeof obj.recommendedArchitecture !== "string") return null
  if (typeof obj.smartContractRequirements !== "string") return null
  if (typeof obj.securityConsiderations !== "string") return null
  if (!Array.isArray(obj.openQuestions)) return null

  return {
    problemStatement: String(obj.problemStatement),
    targetUsers: String(obj.targetUsers),
    proposedSolution: String(obj.proposedSolution),
    coreMvpFeatures: obj.coreMvpFeatures.map(String),
    recommendedArchitecture: String(obj.recommendedArchitecture),
    smartContractRequirements: String(obj.smartContractRequirements),
    securityConsiderations: String(obj.securityConsiderations),
    openQuestions: obj.openQuestions.map(String),
  }
}
