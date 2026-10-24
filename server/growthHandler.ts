// server/growthHandler.ts
// Handlers for Community Intelligence, Campaigns, Content Studio, KOL Discovery, and Growth Analytics
// Fully persisted in Supabase PostgreSQL with strict tenant-isolation RLS

import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"
import { authenticateRequest } from "./authMiddleware.ts"

async function readJson<T>(req: IncomingMessage & { body?: any }): Promise<T | null> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return req.body as T
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body) as T
      } catch {
        return null
      }
    }
  }
  if ((req as any).readableEnded || req.destroyed) {
    return ({} as T)
  }
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T))
      } catch {
        resolve(null)
      }
    })
    req.on("error", () => resolve(null))
  })
}

function getAuthenticatedSupabaseClient(req: IncomingMessage, supabaseUrl: string, supabaseKey: string) {
  const authHeader = req.headers["authorization"] || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  })
}

// 1. Community Channels
export async function handleGrowthCommunity(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  supabaseKey: string,
) {
  res.setHeader("Content-Type", "application/json")
  const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
  if (!user) return

  const supabase = getAuthenticatedSupabaseClient(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
    const projectId = url.searchParams.get("projectId") || "default"

    const { data, error } = await supabase
      .from("community_channels")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.end(JSON.stringify({ channels: data || [] }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      projectId?: string
      platform: string
      handle: string
      memberCount?: number
      growthRate?: number
      sentimentScore?: number
    }>(req)

    if (!body || !body.platform || !body.handle) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing platform or handle" }))
      return
    }

    const { data, error } = await supabase
      .from("community_channels")
      .insert({
        user_id: user.id,
        project_id: body.projectId || "default",
        platform: body.platform,
        handle: body.handle,
        member_count: body.memberCount || 0,
        growth_rate: body.growthRate || 0,
        sentiment_score: body.sentimentScore ?? 75.0,
      })
      .select()
      .single()

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 201
    res.end(JSON.stringify({ success: true, channel: data }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

// 2. Campaigns
export async function handleGrowthCampaigns(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  supabaseKey: string,
) {
  res.setHeader("Content-Type", "application/json")
  const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
  if (!user) return

  const supabase = getAuthenticatedSupabaseClient(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
    const projectId = url.searchParams.get("projectId") || "default"

    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.end(JSON.stringify({ campaigns: data || [] }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      projectId?: string
      name: string
      platform: string
      status?: "draft" | "active" | "paused" | "completed"
      budgetMinorUnits?: number
      targetImpressions?: number
      startDate?: string
      endDate?: string
    }>(req)

    if (!body || !body.name || !body.platform) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing campaign name or platform" }))
      return
    }

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        project_id: body.projectId || "default",
        name: body.name,
        platform: body.platform,
        status: body.status || "active",
        budget_minor_units: body.budgetMinorUnits || 0,
        target_impressions: body.targetImpressions || 100000,
        start_date: body.startDate || new Date().toISOString().slice(0, 10),
        end_date: body.endDate || null,
      })
      .select()
      .single()

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 201
    res.end(JSON.stringify({ success: true, campaign: data }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

// 3. Content Drafts
export async function handleGrowthContent(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  supabaseKey: string,
) {
  res.setHeader("Content-Type", "application/json")
  const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
  if (!user) return

  const supabase = getAuthenticatedSupabaseClient(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
    const projectId = url.searchParams.get("projectId") || "default"

    const { data, error } = await supabase
      .from("content_drafts")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.end(JSON.stringify({ drafts: data || [] }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      projectId?: string
      title: string
      content: string
      platform: string
      status?: "draft" | "scheduled" | "published"
      imagePrompt?: string
      imageUrl?: string
      scheduledFor?: string
    }>(req)

    if (!body || !body.title || !body.content || !body.platform) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing title, content, or platform" }))
      return
    }

    const { data, error } = await supabase
      .from("content_drafts")
      .insert({
        user_id: user.id,
        project_id: body.projectId || "default",
        title: body.title,
        content: body.content,
        platform: body.platform,
        status: body.status || "draft",
        image_prompt: body.imagePrompt || null,
        image_url: body.imageUrl || null,
        scheduled_for: body.scheduledFor || null,
      })
      .select()
      .single()

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 201
    res.end(JSON.stringify({ success: true, draft: data }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

// 4. KOL Discovery
export async function handleGrowthKols(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  supabaseKey: string,
) {
  res.setHeader("Content-Type", "application/json")
  const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
  if (!user) return

  const supabase = getAuthenticatedSupabaseClient(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
    const projectId = url.searchParams.get("projectId") || "default"

    const { data, error } = await supabase
      .from("kols")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.end(JSON.stringify({ kols: data || [] }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      projectId?: string
      name: string
      handle: string
      platform: string
      audienceSize?: number
      engagementRate?: number
      category?: string
      status?: "discovered" | "contacted" | "partnered" | "declined"
    }>(req)

    if (!body || !body.name || !body.handle || !body.platform) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing name, handle, or platform" }))
      return
    }

    const { data, error } = await supabase
      .from("kols")
      .insert({
        user_id: user.id,
        project_id: body.projectId || "default",
        name: body.name,
        handle: body.handle,
        platform: body.platform,
        audience_size: body.audienceSize || 0,
        engagement_rate: body.engagementRate || 0,
        category: body.category || "DeFi",
        status: body.status || "discovered",
      })
      .select()
      .single()

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 201
    res.end(JSON.stringify({ success: true, kol: data }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

// 5. Growth Analytics
export async function handleGrowthAnalytics(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl: string,
  supabaseKey: string,
) {
  res.setHeader("Content-Type", "application/json")
  const user = await authenticateRequest(req, res, supabaseUrl, supabaseKey)
  if (!user) return

  const supabase = getAuthenticatedSupabaseClient(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`)
    const projectId = url.searchParams.get("projectId") || "default"

    const { data, error } = await supabase
      .from("growth_analytics")
      .select("*")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .order("recorded_date", { ascending: true })

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 200
    res.end(JSON.stringify({ analytics: data || [] }))
    return
  }

  if (req.method === "POST") {
    const body = await readJson<{
      projectId?: string
      metricName: string
      metricValue: number
      recordedDate?: string
      metadata?: Record<string, unknown>
    }>(req)

    if (!body || !body.metricName || typeof body.metricValue !== "number") {
      res.statusCode = 400
      res.end(JSON.stringify({ error: "Missing metricName or numeric metricValue" }))
      return
    }

    const { data, error } = await supabase
      .from("growth_analytics")
      .insert({
        user_id: user.id,
        project_id: body.projectId || "default",
        metric_name: body.metricName,
        metric_value: body.metricValue,
        recorded_date: body.recordedDate || new Date().toISOString().slice(0, 10),
        metadata: body.metadata || {},
      })
      .select()
      .single()

    if (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error.message }))
      return
    }

    res.statusCode = 201
    res.end(JSON.stringify({ success: true, entry: data }))
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ error: "Method not allowed" }))
}
