// api/index.ts
// Vercel Serverless Function entrypoint for ChainForge AI API routes

import type { IncomingMessage, ServerResponse } from "node:http"
import { handleApiRoute } from "../server/apiRouter.ts"

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleApiRoute(req, res)
  if (!handled) {
    res.statusCode = 404
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify({ error: "Endpoint not found" }))
  }
}
