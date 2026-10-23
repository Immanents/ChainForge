// server/codebaseGenerator.ts
// Multi-file codebase synthesis engine with path validation, SHA-256 hashing, and OpenRouter failover

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createHash } from "crypto"
import JSZip from "jszip"
import type { BlueprintResult } from "../src/data/blueprints"

export type GeneratedFile = {
  path: string
  content: string
}

export type CodebaseResult = {
  projectName: string
  ecosystem: "evm" | "solana"
  framework: string
  files: GeneratedFile[]
  fileManifest: string[]
  artifactSha256: string
  zipBase64: string
  modelProviderUsed: string
}

const FORBIDDEN_PATH_SEGMENTS = ["..", "\\", "\0", "~", "//"]

export const CODEBASE_LIMITS = {
  maxFiles: 25,
  maxFileContentBytes: 150 * 1024, // 150 KB
  maxTotalBytes: 1500 * 1024,     // 1.5 MB
} as const

export function validateSafeFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") return false
  const trimmed = filePath.trim()

  // Length boundaries
  if (trimmed.length === 0 || trimmed.length > 150) return false

  // Disallow absolute paths, root indicators, or Windows drive paths
  if (trimmed.startsWith("/") || trimmed.startsWith("\\") || /^[a-zA-Z]:/.test(trimmed)) return false

  // Disallow forbidden segments
  for (const forbidden of FORBIDDEN_PATH_SEGMENTS) {
    if (trimmed.includes(forbidden)) return false
  }

  // Disallow hidden files or dotfile segments (e.g. .env, .git, .bashrc)
  const segments = trimmed.split("/")
  for (const seg of segments) {
    if (!seg || seg === "." || seg === ".." || seg.startsWith(".")) return false
    // Only permit safe alphanumeric segment names with valid extension syntax
    if (!/^[a-zA-Z0-9_\-]+(\.[a-zA-Z0-9_\-]+)*$/.test(seg)) return false
  }

  return true
}

function buildCodebasePrompt(
  projectName: string,
  ecosystem: "evm" | "solana",
  blueprint: BlueprintResult,
): string {
  if (ecosystem === "solana") {
    return `You are a senior Solana & Anchor protocol engineer.
Generate a complete, compilable, versioned Solana project repository using the Anchor framework based on this specification:

PROJECT: ${projectName}
PROBLEM: ${blueprint.problemStatement}
SOLUTION: ${blueprint.proposedSolution}
SMART CONTRACT REQUIREMENTS: ${blueprint.smartContractRequirements}
SECURITY CONSIDERATIONS: ${blueprint.securityConsiderations}

You MUST output a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "framework": "anchor",
  "files": [
    { "path": "Anchor.toml", "content": "..." },
    { "path": "Cargo.toml", "content": "..." },
    { "path": "programs/${projectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}/Cargo.toml", "content": "..." },
    { "path": "programs/${projectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}/src/lib.rs", "content": "..." },
    { "path": "tests/${projectName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.ts", "content": "..." },
    { "path": "app/useProgram.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}

Important:
- All Rust and TypeScript code must be realistic, production-quality, and compilable.
- Do not output mock placeholders or ellipses in the actual content.`
  }

  // EVM Prompt
  return `You are a principal Web3 smart contract architect and security researcher.
Generate a complete, compilable, versioned EVM project repository using Foundry & OpenZeppelin v5 based on this specification:

PROJECT: ${projectName}
PROBLEM: ${blueprint.problemStatement}
SOLUTION: ${blueprint.proposedSolution}
SMART CONTRACT REQUIREMENTS: ${blueprint.smartContractRequirements}
SECURITY CONSIDERATIONS: ${blueprint.securityConsiderations}

You MUST output a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "framework": "foundry",
  "files": [
    { "path": "foundry.toml", "content": "..." },
    { "path": "src/${projectName.replace(/[^a-zA-Z0-9]/g, "")}.sol", "content": "..." },
    { "path": "test/${projectName.replace(/[^a-zA-Z0-9]/g, "")}.t.sol", "content": "..." },
    { "path": "script/Deploy.s.sol", "content": "..." },
    { "path": "frontend/useContract.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}

Important:
- Use Solidity ^0.8.28 with OpenZeppelin Contracts v5 imports.
- Include comprehensive Foundry unit tests in test/*.t.sol testing invariants, access control, and edge cases.
- In frontend/useContract.ts, provide a typed Viem hook.
- Do not output mock placeholders or ellipses in the actual content.`
}

async function callOpenRouterFallback(
  prompt: string,
  apiKey: string,
  modelName: string = "google/gemini-3.8-flash",
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://chainforge.ai",
      "X-Title": "ChainForge AI",
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 6500,
      messages: [
        {
          role: "system",
          content: "You strictly output valid JSON matching the requested schema with no markdown code fences.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenRouter codebase synthesis failed (HTTP ${res.status})`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error("Empty response from OpenRouter")
  return content
}

export async function generateCodebaseBundle(
  projectName: string,
  ecosystem: "evm" | "solana",
  blueprint: BlueprintResult,
  env: {
    geminiApiKey?: string
    openRouterApiKey?: string
    openRouterModel?: string
  },
): Promise<CodebaseResult> {
  const prompt = buildCodebasePrompt(projectName, ecosystem, blueprint)
  let rawJson = ""
  let providerUsed = "Gemini 3.8 Flash"

  // 1. Primary: Gemini
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey)
      const model = genAI.getGenerativeModel({
        model: "gemini-3.8-flash",
        generationConfig: { responseMimeType: "application/json" },
      })
      const result = await model.generateContent(prompt)
      rawJson = result.response.text()
    } catch (geminiErr: unknown) {
      console.warn("[Codebase Generator] Primary Gemini failed, falling back to OpenRouter:", geminiErr)
    }
  }

  // 2. Fallback: OpenRouter
  if (!rawJson && env.openRouterApiKey) {
    console.info("[Codebase Generator] Activating OpenRouter fallback...")
    rawJson = await callOpenRouterFallback(
      prompt,
      env.openRouterApiKey,
      env.openRouterModel || "google/gemini-3.8-flash",
    )
    providerUsed = "OpenRouter Fallback"
  }

  if (!rawJson) {
    throw new Error("No AI providers were able to generate the project codebase.")
  }

  const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim()
  let parsed: { framework?: string; files: GeneratedFile[] }

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Robust fallback: extract completed files via pattern matching if JSON was partially truncated
    const files: GeneratedFile[] = []
    const fileRegex = /\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:\\.|[^"\\])*)"\s*\}/g
    let match: RegExpExecArray | null
    while ((match = fileRegex.exec(cleaned)) !== null) {
      try {
        const filePath = match[1]
        const fileContent = JSON.parse(`"${match[2]}"`)
        files.push({ path: filePath, content: fileContent })
      } catch {
        // ignore individual decode error
      }
    }
    parsed = { framework: ecosystem === "solana" ? "anchor" : "foundry", files }
  }

  if (!parsed || !Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error("Invalid or incomplete codebase payload generated by AI.")
  }

  // File count boundary check
  if (parsed.files.length > CODEBASE_LIMITS.maxFiles) {
    throw new Error(`Security Exception: Generated file count (${parsed.files.length}) exceeds maximum allowable limit (${CODEBASE_LIMITS.maxFiles}).`)
  }

  // Path validation, deduplication, and file size checks
  const validatedFiles: GeneratedFile[] = []
  const manifest: string[] = []
  const seenPaths = new Set<string>()
  let totalBytes = 0

  for (const f of parsed.files) {
    if (!f || typeof f.path !== "string" || typeof f.content !== "string") continue

    if (!validateSafeFilePath(f.path)) {
      throw new Error(`Security Exception: Rejected unsafe or escaped file path "${f.path}"`)
    }

    if (seenPaths.has(f.path)) {
      continue // skip duplicate path
    }
    seenPaths.add(f.path)

    const contentBytes = Buffer.byteLength(f.content, "utf8")
    if (contentBytes > CODEBASE_LIMITS.maxFileContentBytes) {
      throw new Error(`Security Exception: File "${f.path}" exceeds maximum size quota (${contentBytes} bytes > ${CODEBASE_LIMITS.maxFileContentBytes} bytes).`)
    }

    totalBytes += contentBytes
    if (totalBytes > CODEBASE_LIMITS.maxTotalBytes) {
      throw new Error(`Security Exception: Cumulative codebase size (${totalBytes} bytes) exceeds maximum allowable archive threshold.`)
    }

    validatedFiles.push({ path: f.path, content: f.content })
    manifest.push(f.path)
  }

  // Build ZIP archive
  const zip = new JSZip()
  for (const file of validatedFiles) {
    zip.file(file.path, file.content)
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  const zipBase64 = zipBuffer.toString("base64")

  // Calculate SHA-256
  const sha256 = createHash("sha256").update(zipBuffer).digest("hex")

  return {
    projectName,
    ecosystem,
    framework: parsed.framework || (ecosystem === "solana" ? "anchor" : "foundry"),
    files: validatedFiles,
    fileManifest: manifest,
    artifactSha256: sha256,
    zipBase64,
    modelProviderUsed: providerUsed,
  }
}
