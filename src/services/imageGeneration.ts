export type GeneratedImage = {
  id: string
  prompt: string
  aspectRatio: "1:1" | "16:9" | "4:5"
  variant: "orbital" | "network" | "signal"
}

export type ImageGenerationRequest = {
  prompt: string
  aspectRatio: GeneratedImage["aspectRatio"]
  brandContext: string
}

export interface ImageGenerationService {
  generate(request: ImageGenerationRequest): Promise<GeneratedImage[]>
}

// Replace this adapter with the Gemini image-generation endpoint when credentials
// are available. Keeping it behind an interface avoids coupling the UI to an API.
export const mockNanoBananaService: ImageGenerationService = {
  generate: async ({ prompt, aspectRatio }) => {
    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    return (["orbital", "network", "signal"] as const).map((variant) => ({
      id: `${variant}-${Date.now()}`,
      prompt,
      aspectRatio,
      variant,
    }))
  },
}
