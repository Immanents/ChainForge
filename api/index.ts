// api/index.ts
// Vercel Serverless Function entrypoint for ChainForge AI API routes

import type { IncomingMessage, ServerResponse } from "node:http"
import { handleApiRoute } from "../server/apiRouter.ts"

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set CORS headers for all incoming API calls
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-info, apikey, x-idempotency-key")

  if (req.method === "OPTIONS") {
    res.statusCode = 204
    res.end()
    return
  }

  try {
    const handled = await handleApiRoute(req, res)
    if (!handled) {
      res.statusCode = 404
      res.setHeader("Content-Type", "application/json")
      res.end(JSON.stringify({ error: "Endpoint not found" }))
    }
  } catch (err: unknown) {
    console.error("[Vercel API Handler Error]:", err)
    res.statusCode = 500
    res.setHeader("Content-Type", "application/json")
    res.end(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal Server Error",
      }),
    )
  }
}
