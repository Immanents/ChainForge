// src/services/contentStudioService.ts
// Client service for Content Studio: AI generation, draft persistence, synchronization, and exports

import { getAuthHeaders, supabase } from "./supabaseClient"
import { contentDrafts as defaultMockDrafts } from "../data/mockData"

export interface ContentGenerationRequest {
  platform: "X" | "LinkedIn" | "Telegram" | "Discord"
  contentType: "Launch post" | "Thread" | "Update" | "Educational"
  topic: string
  tone: "Confident" | "Technical" | "Conversational" | "Visionary" | "Urgent"
  goal: "Drive awareness" | "Educate" | "Engage" | "Waitlist / Conversion"
  audience: "Web3 builders" | "Token holders" | "DeFi users" | "Enterprise partners"
  additionalInstructions?: string
  brandContext?: string
}

export interface GeneratedContentVariation {
  id: string
  title: string
  content: string
  platform: string
  characterCount: number
  hook?: string
  callToAction?: string
  suggestedHashtags?: string[]
}

export interface ContentGenerationResponse {
  variations: GeneratedContentVariation[]
  platform: string
  contentType: string
  generatedAt: string
}

export interface ContentDraft {
  id: string
  projectId: string
  title: string
  content: string
  platform: "X" | "LinkedIn" | "Telegram" | "Discord" | string
  status: "Draft" | "Scheduled" | "Published"
  approval: "Approved" | "Awaiting review" | "Needs edits"
  date: string
  author: string
  imagePrompt?: string
  imageUrl?: string
  scheduledFor?: string | null
  syncedRemote?: boolean
}

export class ContentStudioError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = "ContentStudioError"
  }
}

const STORAGE_KEY = "chainforge_content_drafts_v1"
const TIMEOUT_MS = 38_000

// Initialize local drafts from defaults if empty
function initializeDefaultDrafts(): ContentDraft[] {
  return defaultMockDrafts.map((d, index) => ({
    id: `seed-draft-${index + 1}`,
    projectId: "default",
    title: d.content.slice(0, 48) + "...",
    content: d.content,
    platform: d.platform,
    status: (d.status as ContentDraft["status"]) || "Draft",
    approval: (d.approval as ContentDraft["approval"]) || "Awaiting review",
    date: d.date,
    author: d.author,
    syncedRemote: false,
  }))
}

export function getLocalDrafts(): ContentDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = initializeDefaultDrafts()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : initializeDefaultDrafts()
  } catch {
    return initializeDefaultDrafts()
  }
}

export function saveLocalDrafts(drafts: ContentDraft[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts))
  } catch (err) {
    console.warn("Failed to persist drafts to localStorage:", err)
  }
}

export const ContentStudioService = {
  getLocalDrafts,
  saveLocalDrafts,
  /**
   * Generates 3 platform-tailored content variations using the real server-side Gemini backend
   */
  async generate(
    request: ContentGenerationRequest,
  ): Promise<ContentGenerationResponse> {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
    const endpoint = apiBase ? `${apiBase}/generate-content` : "/api/generate-content"

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const authHeaders = await getAuthHeaders()
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMessage = `Content generation failed (HTTP ${response.status})`
        try {
          const errData = await response.json()
          if (errData && typeof errData.error === "string") {
            errorMessage = errData.error
          }
        } catch {
          const text = await response.text().catch(() => "")
          if (text) errorMessage = text
        }
        throw new ContentStudioError(errorMessage, response.status)
      }

      const data = await response.json()
      if (!data || !Array.isArray(data.variations) || data.variations.length === 0) {
        throw new ContentStudioError("Invalid generation response format from AI service.", 502)
      }

      return data as ContentGenerationResponse
    } catch (err: unknown) {
      if (err instanceof ContentStudioError) {
        throw err
      }

      if (controller.signal.aborted) {
        throw new ContentStudioError(
          "Generation request timed out after 35 seconds. Please try again.",
          504,
        )
      }

      const msg = err instanceof Error ? err.message : String(err)
      throw new ContentStudioError(`Network connection error: ${msg}`)
    } finally {
      clearTimeout(timer)
    }
  },

  /**
   * Fetches drafts, merging cloud database records (if authenticated) with local storage drafts
   */
  async fetchDrafts(projectId: string = "default"): Promise<ContentDraft[]> {
    const local = getLocalDrafts()

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData?.session) {
        return local
      }

      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/growth/content?projectId=${encodeURIComponent(projectId)}`, {
        headers: { ...authHeaders },
      })

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.drafts) && data.drafts.length > 0) {
          const remoteMapped: ContentDraft[] = data.drafts.map((d: any) => ({
            id: d.id,
            projectId: d.project_id || projectId,
            title: d.title,
            content: d.content,
            platform: d.platform,
            status:
              d.status === "published"
                ? "Published"
                : d.status === "scheduled"
                  ? "Scheduled"
                  : "Draft",
            approval:
              d.status === "published" || d.status === "scheduled"
                ? "Approved"
                : "Awaiting review",
            date: d.created_at
              ? new Date(d.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now",
            author: "Team",
            imagePrompt: d.image_prompt,
            imageUrl: d.image_url,
            scheduledFor: d.scheduled_for,
            syncedRemote: true,
          }))

          // Merge: remote first, then any non-duplicated local drafts
          const remoteIds = new Set(remoteMapped.map((r) => r.id))
          const nonDuplicatedLocal = local.filter((l) => !remoteIds.has(l.id))
          const merged = [...remoteMapped, ...nonDuplicatedLocal]
          saveLocalDrafts(merged)
          return merged
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote drafts, using local drafts:", err)
    }

    return local
  },

  /**
   * Saves a new draft locally and attempts cloud persistence if signed in
   */
  async saveDraft(params: {
    title: string
    content: string
    platform: string
    projectId?: string
    author?: string
    approval?: ContentDraft["approval"]
    status?: ContentDraft["status"]
    imagePrompt?: string
    scheduledFor?: string | null
  }): Promise<{ draft: ContentDraft; savedRemotely: boolean }> {
    const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newDraft: ContentDraft = {
      id,
      projectId: params.projectId || "default",
      title: params.title || params.content.slice(0, 48) + "...",
      content: params.content,
      platform: params.platform,
      status: params.status || "Draft",
      approval: params.approval || "Awaiting review",
      date: "Just now",
      author: params.author || "You",
      imagePrompt: params.imagePrompt,
      scheduledFor: params.scheduledFor || null,
      syncedRemote: false,
    }

    let savedRemotely = false

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session) {
        const authHeaders = await getAuthHeaders()
        const res = await fetch("/api/growth/content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            projectId: newDraft.projectId,
            title: newDraft.title,
            content: newDraft.content,
            platform: newDraft.platform,
            status: newDraft.status.toLowerCase(),
            imagePrompt: newDraft.imagePrompt,
            scheduledFor: newDraft.scheduledFor,
          }),
        })

        if (res.ok) {
          const resData = await res.json()
          if (resData?.draft?.id) {
            newDraft.id = resData.draft.id
            newDraft.syncedRemote = true
            savedRemotely = true
          }
        }
      }
    } catch (err) {
      console.warn("Remote draft save failed, draft saved locally:", err)
    }

    const current = getLocalDrafts()
    const updated = [newDraft, ...current.filter((d) => d.id !== newDraft.id)]
    saveLocalDrafts(updated)

    return { draft: newDraft, savedRemotely }
  },

  /**
   * Updates an existing draft by ID
   */
  async updateDraft(
    id: string,
    updates: Partial<ContentDraft>,
  ): Promise<ContentDraft | null> {
    const current = getLocalDrafts()
    const index = current.findIndex((d) => d.id === id)
    if (index === -1) return null

    const updatedDraft: ContentDraft = {
      ...current[index],
      ...updates,
    }
    current[index] = updatedDraft
    saveLocalDrafts([...current])

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session && updatedDraft.syncedRemote) {
        const authHeaders = await getAuthHeaders()
        await fetch("/api/growth/content", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            id: updatedDraft.id,
            title: updatedDraft.title,
            content: updatedDraft.content,
            platform: updatedDraft.platform,
            status: updatedDraft.status.toLowerCase(),
            scheduledFor: updatedDraft.scheduledFor,
          }),
        })
      }
    } catch (err) {
      console.warn("Could not sync draft update to cloud:", err)
    }

    return updatedDraft
  },

  /**
   * Deletes a draft by ID
   */
  async deleteDraft(id: string): Promise<boolean> {
    const current = getLocalDrafts()
    const target = current.find((d) => d.id === id)
    const filtered = current.filter((d) => d.id !== id)
    saveLocalDrafts(filtered)

    if (target?.syncedRemote) {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          const authHeaders = await getAuthHeaders()
          await fetch(`/api/growth/content?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: { ...authHeaders },
          })
        }
      } catch (err) {
        console.warn("Could not delete draft from cloud:", err)
      }
    }

    return true
  },

  /**
   * Exports content to a downloadable Markdown or Text file
   */
  exportToFile(title: string, content: string, platform: string) {
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 32)}-${platform.toLowerCase()}.md`
    const header = `# ${title}\n**Platform:** ${platform}\n**Generated with:** ChainForge Content Studio\n**Date:** ${new Date().toLocaleDateString()}\n\n---\n\n`
    const blob = new Blob([header + content], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /**
   * Copies text cleanly to clipboard
   */
  async copyText(text: string): Promise<boolean> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      return true
    } catch {
      return false
    }
  },
}
