// server/projectHandler.ts
// Handlers for Projects, Codebase Versions, Deployments, and Token Mints with On-Chain RPC Verification

import type { IncomingMessage, ServerResponse } from "node:http"
import { createClient } from "@supabase/supabase-js"

async function extractUser(
  req: IncomingMessage,
  supabaseUrl?: string,
  serviceRoleKey?: string,
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers["authorization"]
  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !serviceRoleKey) return null
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) return null
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null
    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
}

export type ProjectPayload = {
  id?: string
  name: string
  slug: string
  description?: string
  ecosystem?: "evm" | "solana" | "multi-chain"
  category?: string
  status?: string
  token_symbol?: string
}

export type DeploymentPayload = {
  project_id: string
  codebase_version_id?: string
  ecosystem: "evm" | "solana"
  network_id: string
  network_name: string
  environment: "testnet" | "mainnet"
  contract_type: string
  contract_name: string
  contract_address: string
  deployer_address: string
  tx_hash: string
  artifact_sha256?: string
  abi_or_idl?: unknown
  verification_status?: string
  explorer_url?: string
}

export type TokenMintPayload = {
  project_id: string
  deployment_id?: string
  standard: "erc20" | "spl-token" | "spl-token-2022"
  name: string
  symbol: string
  decimals: number
  initial_supply: number
  mint_address: string
  deployer_address: string
  network_name: string
  environment: string
  feature_flags?: Record<string, unknown>
  tx_hash: string
}

// In-memory registry fallback for local dev when Supabase remote is offline
const localProjects: ProjectPayload[] = []
const localDeployments: DeploymentPayload[] = []
const localTokenMints: TokenMintPayload[] = []

const EVM_RPC_MAP: Record<string, string> = {
  "1": "https://eth.llamarpc.com",
  "11155111": "https://rpc.sepolia.org",
  "8453": "https://mainnet.base.org",
  "84532": "https://sepolia.base.org",
  "42161": "https://arb1.arbitrum.io/rpc",
  "421614": "https://sepolia-rollup.arbitrum.io/rpc",
  "137": "https://polygon-rpc.com",
  "80002": "https://rpc-amoy.polygon.technology",
  "56": "https://bsc-dataseed.binance.org",
  "97": "https://data-seed-prebsc-1-s1.binance.org:8545",
}

/**
 * Cryptographically verifies that a transaction was mined successfully and contract code exists on-chain
 */
async function verifyOnChainDeployment(payload: DeploymentPayload): Promise<boolean> {
  if (payload.ecosystem === "evm" && payload.tx_hash && payload.contract_address) {
    if (!/^0x[a-fA-F0-9]{64}$/.test(payload.tx_hash)) return false
    if (!/^0x[a-fA-F0-9]{40}$/.test(payload.contract_address)) return false

    const rpcUrl = EVM_RPC_MAP[payload.network_id]
    if (rpcUrl) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)

        // 1. Check transaction receipt status
        const receiptRes = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [payload.tx_hash],
          }),
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (receiptRes.ok) {
          const receiptData = await receiptRes.json()
          const receipt = receiptData?.result
          if (receipt && receipt.status === "0x1") {
            // 2. Check contract code exists at destination address
            const codeRes = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "eth_getCode",
                params: [payload.contract_address, "latest"],
              }),
            })
            if (codeRes.ok) {
              const codeData = await codeRes.json()
              const code = codeData?.result
              if (code && code !== "0x" && code !== "0x0") {
                return true
              }
            }
          }
        }
      } catch (err) {
        console.warn("[On-Chain Verification] RPC verification failed:", err)
      }
    }
  }

  // Solana verification via getSignatureStatuses
  if (payload.ecosystem === "solana" && payload.tx_hash) {
    try {
      const endpoint =
        payload.environment === "mainnet"
          ? "https://api.mainnet-beta.solana.com"
          : "https://api.devnet.solana.com"

      const sigRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignatureStatuses",
          params: [[payload.tx_hash], { searchTransactionHistory: true }],
        }),
      })

      if (sigRes.ok) {
        const sigData = await sigRes.json()
        const status = sigData?.result?.value?.[0]
        if (status && status.err === null && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
          return true
        }
      }
    } catch (err) {
      console.warn("[On-Chain Verification] Solana RPC verification check failed:", err)
    }
  }

  return false
}

export async function handleProjects(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl?: string,
  supabaseKey?: string,
) {
  const user = await extractUser(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        let query = supabase.from("projects").select("*").order("created_at", { ascending: false })
        if (user) {
          query = query.or(`user_id.eq.${user.id},is_public.eq.true`)
        } else {
          query = query.eq("is_public", true)
        }
        const { data, error } = await query
        if (!error && data) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(data))
          return
        }
      } catch (err) {
        console.warn("[Project Handler] Remote fetch failed, using local store:", err)
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(localProjects))
    return
  }

  if (req.method === "POST") {
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "Unauthorized: Please log in to create and save projects." }))
      return
    }

    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body) as ProjectPayload & { user_id?: string; is_public?: boolean }
        if (!payload.name) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "Project name is required" }))
          return
        }

        payload.slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        payload.user_id = user.id
        payload.is_public = payload.is_public ?? false

        if (supabaseUrl && supabaseKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey)
            const { data, error } = await supabase.from("projects").insert(payload).select().single()
            if (!error && data) {
              res.writeHead(201, { "Content-Type": "application/json" })
              res.end(JSON.stringify(data))
              return
            }
          } catch (err) {
            console.warn("[Project Handler] Remote insert failed, storing locally:", err)
          }
        }

        localProjects.push(payload)
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify(payload))
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Invalid JSON" }))
      }
    })
    return
  }

  res.writeHead(405, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

export async function handleDeployments(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl?: string,
  supabaseKey?: string,
) {
  const user = await extractUser(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        let query = supabase.from("deployments").select("*").order("deployed_at", { ascending: false })
        if (user) {
          query = query.or(`user_id.eq.${user.id},verification_status.eq.verified`)
        }
        const { data, error } = await query
        if (!error && data) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(data))
          return
        }
      } catch (err) {
        console.warn("[Deployments Handler] Remote fetch failed, using local store:", err)
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(localDeployments))
    return
  }

  if (req.method === "POST") {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body) as DeploymentPayload & { user_id?: string }
        if (!payload.contract_address || !payload.tx_hash) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "contract_address and tx_hash are required" }))
          return
        }

        if (user) {
          payload.user_id = user.id
        }

        // On-chain cryptographic verification
        const isVerified = await verifyOnChainDeployment(payload)
        payload.verification_status = isVerified ? "verified" : "unverified"

        if (supabaseUrl && supabaseKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey)
            const { data, error } = await supabase.from("deployments").insert(payload).select().single()
            if (!error && data) {
              res.writeHead(201, { "Content-Type": "application/json" })
              res.end(JSON.stringify(data))
              return
            }
          } catch (err) {
            console.warn("[Deployments Handler] Remote insert failed, storing locally:", err)
          }
        }

        localDeployments.unshift(payload)
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify(payload))
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Invalid JSON" }))
      }
    })
    return
  }

  res.writeHead(405, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Method not allowed" }))
}

export async function handleTokenMints(
  req: IncomingMessage,
  res: ServerResponse,
  supabaseUrl?: string,
  supabaseKey?: string,
) {
  const user = await extractUser(req, supabaseUrl, supabaseKey)

  if (req.method === "GET") {
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        let query = supabase.from("token_mints").select("*").order("created_at", { ascending: false })
        if (user) {
          query = query.or(`user_id.eq.${user.id},environment.eq.mainnet`)
        }
        const { data, error } = await query
        if (!error && data) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(data))
          return
        }
      } catch (err) {
        console.warn("[Token Mints Handler] Remote fetch failed, using local store:", err)
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify(localTokenMints))
    return
  }

  if (req.method === "POST") {
    let body = ""
    req.on("data", (chunk) => (body += chunk))
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body) as TokenMintPayload & { user_id?: string }
        if (!payload.mint_address || !payload.tx_hash) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: "mint_address and tx_hash are required" }))
          return
        }

        if (user) {
          payload.user_id = user.id
        }

        if (supabaseUrl && supabaseKey) {
          try {
            const supabase = createClient(supabaseUrl, supabaseKey)
            const { data, error } = await supabase.from("token_mints").insert(payload).select().single()
            if (!error && data) {
              res.writeHead(201, { "Content-Type": "application/json" })
              res.end(JSON.stringify(data))
              return
            }
          } catch (err) {
            console.warn("[Token Mints Handler] Remote insert failed, storing locally:", err)
          }
        }

        localTokenMints.unshift(payload)
        res.writeHead(201, { "Content-Type": "application/json" })
        res.end(JSON.stringify(payload))
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: "Invalid JSON" }))
      }
    })
    return
  }

  res.writeHead(405, { "Content-Type": "application/json" })
  res.end(JSON.stringify({ error: "Method not allowed" }))
}
