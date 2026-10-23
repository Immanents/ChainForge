# ChainForge AI — Sandboxed Build Worker Architecture

## Overview
This directory contains the containerized execution environment for compiling and testing untrusted AI-generated Web3 project codebases (Solidity via Foundry and Solana via Anchor).

## Security Boundaries & Design
1. **Air-gapped Network Isolation:** Automated unit and invariant tests execute with `--network none` to prevent untrusted code from making outbound HTTP/RPC calls or exfiltrating tokens.
2. **Resource Hard Clamps:** Docker resource definitions enforce a strict ceiling of **2.0 vCPUs** and **2048MB RAM** with a hard **120-second timeout** to mitigate algorithmic denial-of-service and infinite compiler loops.
3. **Unprivileged Execution:** Runs as an unprivileged user (`sandboxuser`) with dropped Linux capabilities (`cap_drop: ALL`).
4. **Least-Privilege Database Access:** The worker connects to Supabase strictly using a service role token restricted to reading `generation_jobs` and writing build logs and hashes.

## Deployment Options

### Option A: Fly.io Machines (Recommended)
```bash
fly launch --dockerfile Dockerfile
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
fly deploy
```

### Option B: AWS ECS Fargate
Deploy the Docker image to an AWS ECR repository and run on an ECS Fargate cluster with 0.5 vCPU / 2GB RAM tasks triggered via EventBridge or continuous polling.

### Option C: Local Development
```bash
docker compose up --build
```
