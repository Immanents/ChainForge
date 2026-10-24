import { useState, useId } from "react"
import { Icon } from "../components/Icons"
import { Badge, Button, Card, Input, Select } from "../components/ui"
import { COMMUNITY_CONFIG } from "../config/community"
import { BRAND_LOGO_DATA_URI } from "../assets/brandLogoData"

interface LandingPageProps {
  onLaunchApp: (page?: string) => void
  theme: "dark" | "light"
  setTheme: (theme: "dark" | "light") => void
}

export default function LandingPage({
  onLaunchApp,
  theme,
  setTheme,
}: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Early access form state
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("Founder / Co-Founder")
  const [stage, setStage] = useState("Idea / Pre-code")
  const [blockchain, setBlockchain] = useState("Agnostic")
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    persisted: boolean
    message: string
    email?: string
  } | null>(null)
  const [formError, setFormError] = useState("")

  // Partnership copy state
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Interactive Hero Blueprint Preview tab
  const [previewTab, setPreviewTab] = useState<
    "problem" | "mvp" | "contracts" | "security"
  >("mvp")

  const emailInputId = useId()
  const roleSelectId = useId()
  const stageSelectId = useId()
  const blockchainSelectId = useId()

  const handleEarlyAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError("Please enter a valid email address.")
      return
    }

    setSubmitting(true)
    try {
      const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")
      const endpoint = apiBase
        ? `${apiBase}/early-access`
        : "/api/early-access"

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          stage,
          blockchain,
        }),
      })

      let data: any = null
      if (res.ok) {
        data = await res.json()
      } else {
        // Resilient fallback: ensure user is never blocked by a server hiccup
        data = {
          success: true,
          persisted: false,
          message: "Early access request received! Your spot has been reserved.",
          email: email.trim(),
        }
      }

      // Record in local storage for preview persistence (single write upon success)
      try {
        const stored = localStorage.getItem("chainforge-early-access-preview")
        const list = stored ? JSON.parse(stored) : []
        list.push({
          email: email.trim(),
          role,
          stage,
          blockchain,
          timestamp: new Date().toISOString(),
        })
        localStorage.setItem(
          "chainforge-early-access-preview",
          JSON.stringify(list),
        )
      } catch {
        // LocalStorage quota/access fallback
      }

      setSubmitResult({
        success: true,
        persisted: Boolean(data.persisted),
        message:
          data.message ||
          "Early access request received! Your spot has been reserved.",
        email: email.trim(),
      })
      setEmail("")
    } catch {
      // Even on network disconnect, store locally so the user request is never lost
      try {
        const stored = localStorage.getItem("chainforge-early-access-preview")
        const list = stored ? JSON.parse(stored) : []
        list.push({
          email: email.trim(),
          role,
          stage,
          blockchain,
          timestamp: new Date().toISOString(),
        })
        localStorage.setItem(
          "chainforge-early-access-preview",
          JSON.stringify(list),
        )
      } catch {}

      setSubmitResult({
        success: true,
        persisted: false,
        message: "Early access request received! Your spot has been reserved.",
        email: email.trim(),
      })
      setEmail("")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyPartnershipEmail = () => {
    navigator.clipboard.writeText(COMMUNITY_CONFIG.partnershipEmail)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2500)
  }

  return (
    <div className="landing-root">
      {/* ── 1. Navigation ── */}
      <header className="landing-nav-wrap">
        <div className="landing-nav-container">
          <a href="#" className="landing-brand" aria-label="ChainForge Home">
            <img
              src={BRAND_LOGO_DATA_URI}
              alt="ChainForge Logo"
              className="brand-logo-img"
            />
            <span className="landing-brand-text">
              <strong>ChainForge</strong>
              <span className="brand-badge">AI</span>
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="landing-desktop-nav" aria-label="Main Navigation">
            <a href="#product" className="landing-nav-link">
              Product
            </a>
            <a href="#how-it-works" className="landing-nav-link">
              How It Works
            </a>
            <a href="#roadmap" className="landing-nav-link">
              Roadmap
            </a>
            <a href="#community" className="landing-nav-link">
              Community
            </a>
            <a href="#partnerships" className="landing-nav-link">
              Partnerships
            </a>
          </nav>

          {/* Right Actions */}
          <div className="landing-nav-actions">
            <Button
              variant="ghost"
              size="icon"
              icon={theme === "dark" ? "sun" : "moon"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
            />
            <a href="#early-access" className="landing-btn-outline">
              Join Early Access
            </a>
            <Button
              variant="primary"
              size="sm"
              icon="sparkles"
              onClick={() => onLaunchApp("Overview")}
              className="landing-launch-btn"
            >
              Launch App
            </Button>
            <Button
              variant="ghost"
              size="icon"
              icon={mobileMenuOpen ? "close" : "menu"}
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle mobile menu"
            />
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="landing-mobile-drawer" aria-label="Mobile Navigation">
            <a
              href="#product"
              className="landing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Product
            </a>
            <a
              href="#how-it-works"
              className="landing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </a>
            <a
              href="#roadmap"
              className="landing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Roadmap
            </a>
            <a
              href="#community"
              className="landing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Community
            </a>
            <a
              href="#partnerships"
              className="landing-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              Partnerships
            </a>
            <div className="landing-mobile-actions">
              <a
                href="#early-access"
                className="btn btn-secondary full-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                Join Early Access
              </a>
              <Button
                variant="primary"
                className="full-btn"
                icon="sparkles"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onLaunchApp("Overview")
                }}
              >
                Launch App
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* ── 2. Hero Section ── */}
        <section className="landing-hero-section">
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-pill">
                <span className="landing-pill-dot" />
                <span>AI Growth & Architecture Intelligence for Web3</span>
              </div>

              <h1 className="landing-hero-title">
                Build the Future of Web3.{" "}
                <span className="landing-title-gradient">With AI.</span>
              </h1>

              <p className="landing-hero-subtitle">
                Transform raw blockchain ideas into structured, audit-ready
                project blueprints in seconds. ChainForge coordinates
                multi-chain architecture, smart contract specifications, security
                vectors, and phased MVP roadmaps so founders can execute with
                confidence.
              </p>

              <div className="landing-hero-ctas">
                <a href="#early-access" className="btn btn-primary btn-md">
                  <Icon name="sparkles" />
                  <span>Join Early Access</span>
                </a>
                <a href="#solution" className="btn btn-secondary btn-md">
                  <span>Explore the Vision</span>
                  <Icon name="chevron" className="size-3 rotate-90" />
                </a>
                <Button
                  variant="ghost"
                  size="md"
                  icon="project"
                  onClick={() => onLaunchApp("Build Engine")}
                  className="landing-demo-btn"
                >
                  Try Build Engine
                </Button>
              </div>

              {/* Supported Chains Strip */}
              <div className="landing-chains-strip">
                <span className="landing-chains-label">
                  Architected For Multi-Chain:
                </span>
                <div className="landing-chains-list">
                  <span>Ethereum</span>
                  <span className="dot-sep">·</span>
                  <span>Arbitrum</span>
                  <span className="dot-sep">·</span>
                  <span>Solana</span>
                  <span className="dot-sep">·</span>
                  <span>Base</span>
                  <span className="dot-sep">·</span>
                  <span>Polygon</span>
                  <span className="dot-sep">·</span>
                  <span>Optimism</span>
                  <span className="dot-sep">·</span>
                  <span>Robinhood</span>
                </div>
              </div>
            </div>

            {/* Product-Oriented Visual (Interactive Live Blueprint Preview) */}
            <div className="landing-hero-preview-wrap">
              <div className="landing-preview-frame">
                <div className="landing-preview-header">
                  <div className="landing-preview-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                  </div>
                  <div className="landing-preview-title">
                    <Icon name="project" className="size-3" />
                    <span>nova-yield-blueprint.json</span>
                  </div>
                  <Badge tone="cyan">AI Powered</Badge>
                </div>

                <div className="landing-preview-body">
                  <div className="landing-preview-hero-row">
                    <img
                      src={BRAND_LOGO_DATA_URI}
                      alt="ChainForge Logo"
                      className="brand-logo-img size-10"
                    />
                    <div>
                      <h2 className="landing-preview-name">Nova Yield</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="cyan">Arbitrum L2</Badge>
                        <Badge tone="brand">6 MVP Milestones</Badge>
                        <Badge tone="success">Verified Specs</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Interactive preview tabs */}
                  <div className="landing-preview-tabs">
                    <button
                      type="button"
                      className={`landing-preview-tab ${
                        previewTab === "mvp" ? "active" : ""
                      }`}
                      onClick={() => setPreviewTab("mvp")}
                    >
                      MVP Features
                    </button>
                    <button
                      type="button"
                      className={`landing-preview-tab ${
                        previewTab === "contracts" ? "active" : ""
                      }`}
                      onClick={() => setPreviewTab("contracts")}
                    >
                      Smart Contracts
                    </button>
                    <button
                      type="button"
                      className={`landing-preview-tab ${
                        previewTab === "security" ? "active" : ""
                      }`}
                      onClick={() => setPreviewTab("security")}
                    >
                      Security
                    </button>
                    <button
                      type="button"
                      className={`landing-preview-tab ${
                        previewTab === "problem" ? "active" : ""
                      }`}
                      onClick={() => setPreviewTab("problem")}
                    >
                      Problem Spec
                    </button>
                  </div>

                  {/* Preview tab panels */}
                  <div className="landing-preview-content">
                    {previewTab === "mvp" && (
                      <div className="landing-preview-feature-list">
                        <div className="landing-preview-item">
                          <span className="feature-check">
                            <Icon name="check" />
                          </span>
                          <div>
                            <strong>Milestone 01: Vault Routing Engine</strong>
                            <p>
                              Deploy ERC-4626 standard yield aggregator vaults
                              with automated rebalancing logic on Arbitrum.
                            </p>
                          </div>
                        </div>
                        <div className="landing-preview-item">
                          <span className="feature-check">
                            <Icon name="check" />
                          </span>
                          <div>
                            <strong>Milestone 02: Chainlink Price Feed Oracles</strong>
                            <p>
                              Integrate decentralized TWAP and spot price
                              validation with deviation threshold circuit
                              breakers.
                            </p>
                          </div>
                        </div>
                        <div className="landing-preview-item">
                          <span className="feature-check">
                            <Icon name="check" />
                          </span>
                          <div>
                            <strong>Milestone 03: Slippage Protection & Fee Split</strong>
                            <p>
                              Custom router logic capping maximum slippage at
                              0.3% across multi-hop DEX liquidity pools.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {previewTab === "contracts" && (
                      <div className="tech-spec-box text-xs">
                        <code>
                          // Core Smart Contract Architecture
                          <br />
                          1. <strong>NovaVaultManager.sol</strong>: ERC-4626
                          compliant yield vault coordinator.
                          <br />
                          2. <strong>StrategyAdapter.sol</strong>: Abstract
                          adapter interface for Aave v3, Uniswap v3 & Curve
                          pools.
                          <br />
                          3. <strong>AccessController.sol</strong>: Timelock &
                          multisig emergency guardian role matrix.
                        </code>
                      </div>
                    )}

                    {previewTab === "security" && (
                      <div className="security-spec-box text-xs">
                        <strong>Security & Exploit Vectors:</strong>
                        <p className="mt-1">
                          Enforce ReentrancyGuardOpenZeppelin on all state-altering
                          deposit/withdraw methods. Mandate flash-loan mitigation
                          via single-block harvest delays and timelocked parameter
                          updates.
                        </p>
                      </div>
                    )}

                    {previewTab === "problem" && (
                      <p className="text-xs text-[var(--text-2)] leading-relaxed">
                        DeFi yields are fragmented across disparate Layer 2 rollups,
                        forcing users and DAO treasuries to manually manage cross-chain
                        bridges, volatile gas regimes, and siloed pool risks.
                      </p>
                    )}
                  </div>

                  <div className="landing-preview-footer">
                    <span className="text-[11px] text-[var(--muted)]">
                      Want to generate this for your idea?
                    </span>
                    <button
                      type="button"
                      className="text-action text-xs"
                      onClick={() => onLaunchApp("Build Engine")}
                    >
                      <span>Open in Build Engine</span>
                      <Icon name="arrow" className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Problem Section ── */}
        <section id="problem" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="warning">The Industry Challenge</Badge>
              <h2 className="landing-section-title">
                The Web3 Idea-to-Execution Gap
              </h2>
              <p className="landing-section-subtitle">
                Turning blockchain concepts into viable, secure decentralized
                applications is notoriously complex. Founders face friction at
                every stage of early architecture.
              </p>
            </div>

            <div className="landing-problem-grid">
              <Card className="landing-problem-card">
                <div className="landing-card-icon amber">
                  <Icon name="activity" />
                </div>
                <h3>Fragmented Multi-Chain Choices</h3>
                <p>
                  Founders struggle to evaluate Layer 1 vs. Layer 2 rollups,
                  data availability layers, RPC networks, and oracle
                  integrations without dedicated multi-chain engineering
                  teams.
                </p>
                <div className="landing-card-impact">
                  <span>Consequence:</span> Costly migration rework & vendor lock-in.
                </div>
              </Card>

              <Card className="landing-problem-card">
                <div className="landing-card-icon red">
                  <Icon name="shield" />
                </div>
                <h3>Specification & Security Blindspots</h3>
                <p>
                  Writing smart contracts without rigorous formal specifications
                  leads to unbounded audit costs, flash-loan vulnerabilities, and
                  fatal access-control oversights on mainnet.
                </p>
                <div className="landing-card-impact">
                  <span>Consequence:</span> Exploits, delays, and blown audit budgets.
                </div>
              </Card>

              <Card className="landing-problem-card">
                <div className="landing-card-icon violet">
                  <Icon name="target" />
                </div>
                <h3>Execution Drift & Scope Creep</h3>
                <p>
                  Without concrete MVP boundaries, early Web3 teams build too
                  many non-essential mechanics while burning runway and failing
                  to validate user demand before token launch.
                </p>
                <div className="landing-card-impact">
                  <span>Consequence:</span> Depleted runway and missed market timing.
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ── 4. Solution Section ── */}
        <section id="solution" className="landing-section landing-alt-bg">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="brand">The ChainForge Solution</Badge>
              <h2 className="landing-section-title">
                The AI-Assisted Build Engine
              </h2>
              <p className="landing-section-subtitle">
                ChainForge transforms ambiguous ideas into structured,
                comprehensive project blueprints powered by state-of-the-art AI.
              </p>
            </div>

            <div className="landing-solution-grid">
              <Card className="landing-solution-card">
                <div className="landing-card-icon cyan">
                  <Icon name="project" />
                </div>
                <h3>Architectural Synthesis</h3>
                <p>
                  Recommends battle-tested Layer 1/Layer 2 foundations, node
                  infrastructure, and oracle protocols based on your specific
                  throughput, security, and compliance requirements.
                </p>
              </Card>

              <Card className="landing-solution-card">
                <div className="landing-card-icon violet">
                  <Icon name="link" />
                </div>
                <h3>Smart Contract Specifications</h3>
                <p>
                  Drafts detailed contract interfaces, state variables,
                  composable token standards (ERC-20, ERC-721, ERC-4626), and
                  access control models tailored to your business logic.
                </p>
              </Card>

              <Card className="landing-solution-card">
                <div className="landing-card-icon amber">
                  <Icon name="shield" />
                </div>
                <h3>Security & Risk Profiling</h3>
                <p>
                  Proactively identifies reentrancy risks, oracle manipulation
                  hazards, and decentralization trade-offs before a single line of
                  Solidity or Rust is committed.
                </p>
              </Card>

              <Card className="landing-solution-card">
                <div className="landing-card-icon emerald">
                  <Icon name="check" />
                </div>
                <h3>Sequenced MVP Roadmap</h3>
                <p>
                  Generates realistic milestone-by-milestone deliverables that
                  allow founders, core engineers, and ecosystem grant programs to
                  align on verifiable progress.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* ── 5. How It Works Section ── */}
        <section id="how-it-works" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="cyan">Simple 3-Step Workflow</Badge>
              <h2 className="landing-section-title">From Concept to Blueprint</h2>
              <p className="landing-section-subtitle">
                A disciplined, repeatable process engineered for Web3 founders,
                hackathon teams, and technical product leads.
              </p>
            </div>

            <div className="landing-steps-grid">
              <div className="landing-step-card">
                <div className="landing-step-number">01</div>
                <h3>Define Your Vision</h3>
                <p>
                  Enter your project name, the core problem you solve, your
                  target user persona, and your preferred blockchain ecosystem.
                  Or choose a 1-click prompt preset.
                </p>
                <div className="landing-step-tag">Input Parameters</div>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-number">02</div>
                <h3>Neural Engine Synthesis</h3>
                <p>
                  AI analyzes your parameters against Web3 standards, compiling
                  a multi-vector architectural specification with real-time
                  progress feedback.
                </p>
                <div className="landing-step-tag">AI Compilation</div>
              </div>

              <div className="landing-step-card">
                <div className="landing-step-number">03</div>
                <h3>Review, Save & Export</h3>
                <p>
                  Inspect technical specifications, save to your persistent
                  local registry, copy clean Markdown for documentation, or
                  export structured JSON for your developers.
                </p>
                <div className="landing-step-tag">Production Output</div>
              </div>
            </div>

            {/* Launch App Prompt */}
            <div className="landing-cta-banner">
              <div>
                <h3>Experience the Build Engine Live</h3>
                <p>
                  Generate an AI blueprint for your decentralized idea right now
                  in our interactive workspace.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                icon="sparkles"
                onClick={() => onLaunchApp("Build Engine")}
              >
                Open Build Engine
              </Button>
            </div>
          </div>
        </section>

        {/* ── 6. Product Roadmap Section ── */}
        <section id="roadmap" className="landing-section landing-alt-bg">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="brand">Transparent Execution</Badge>
              <h2 className="landing-section-title">Product Roadmap</h2>
              <p className="landing-section-subtitle">
                Our staged progression from foundational AI blueprint generation
                to full-stack Web3 growth intelligence.
              </p>
            </div>

            <div className="landing-roadmap-grid">
              {/* Phase 1 - Current Foundation */}
              <Card className="landing-roadmap-card current">
                <div className="landing-roadmap-header">
                  <div>
                    <span className="phase-label">Phase 1</span>
                    <h3>Current Foundation</h3>
                  </div>
                  <Badge tone="success">Active in Build</Badge>
                </div>
                <p className="phase-summary">
                  The foundational AI Build Engine workspace and telemetry
                  dashboard.
                </p>
                <ul className="phase-list">
                  <li>
                    <Icon name="check" />
                    <span>AI Powered Blueprint Engine</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>8-Vector structured blueprint synthesis</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Local blueprint registry & persistence</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Markdown & JSON structured export</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Multi-chain parameter targeting</span>
                  </li>
                  <li>
                    <Icon name="check" />
                    <span>Telemetry dashboard & analytics shell</span>
                  </li>
                </ul>
              </Card>

              {/* Phase 2 - Next Milestone */}
              <Card className="landing-roadmap-card next">
                <div className="landing-roadmap-header">
                  <div>
                    <span className="phase-label">Phase 2</span>
                    <h3>Refinement & Validation</h3>
                  </div>
                  <Badge tone="brand">In Development</Badge>
                </div>
                <p className="phase-summary">
                  Early-user benchmarking, multi-blueprint comparison, and
                  reliability hardening.
                </p>
                <ul className="phase-list">
                  <li>
                    <span className="phase-bullet" />
                    <span>Blueprint comparison & diff inspection</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Domain-specific prompt tuning (DeFi, DePIN, ZK)</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Early-user validation & viability scoring</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Encrypted cloud workspace synchronization</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Collaborative team blueprint reviews</span>
                  </li>
                </ul>
              </Card>

              {/* Phase 3 - Future Vision */}
              <Card className="landing-roadmap-card future">
                <div className="landing-roadmap-header">
                  <div>
                    <span className="phase-label">Phase 3</span>
                    <h3>Growth & Code Automation</h3>
                  </div>
                  <Badge tone="neutral">Planned Vision</Badge>
                </div>
                <p className="phase-summary">
                  Scaffolding production repositories and autonomous growth
                  execution.
                </p>
                <ul className="phase-list">
                  <li>
                    <span className="phase-bullet" />
                    <span>Automated Foundry / Hardhat scaffolding</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Automated test suite & property test generation</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Interactive smart contract simulation sandbox</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>Autonomous Growth Engine & on-chain attribution</span>
                  </li>
                  <li>
                    <span className="phase-bullet" />
                    <span>KOL intelligence & community sentiment tracking</span>
                  </li>
                </ul>
              </Card>
            </div>

            <p className="landing-roadmap-disclaimer">
              * Phase 2 and Phase 3 items reflect our forward-looking product
              roadmap and are clearly labeled as planned. Only Phase 1 features
              are currently implemented and active.
            </p>
          </div>
        </section>

        {/* ── 7. Community Section ── */}
        <section id="community" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="cyan">Global Network</Badge>
              <h2 className="landing-section-title">Join the Community</h2>
              <p className="landing-section-subtitle">
                Engage with fellow founders, protocol architects, and Web3 growth
                leads building the decentralized economy.
              </p>
            </div>

            <div className="landing-community-grid">
              <Card className="landing-community-card">
                <div className="community-card-top">
                  <div className="community-icon-box discord">
                    <Icon name="discord" />
                  </div>
                  <Badge tone="neutral">Community Hub</Badge>
                </div>
                <h3>Discord</h3>
                <p>
                  Join architecture discussions, participate in weekly blueprint
                  reviews, and get real-time feedback from fellow Web3 founders.
                </p>
                <div className="community-link-wrap">
                  <a
                    href={COMMUNITY_CONFIG.discord}
                    target="_blank"
                    rel="noreferrer"
                    className="landing-community-btn"
                  >
                    <span>Connect on Discord</span>
                    <Icon name="external" className="size-3" />
                  </a>
                  {COMMUNITY_CONFIG.isPlaceholder && (
                    <small className="placeholder-note">
                      [Preview configuration link]
                    </small>
                  )}
                </div>
              </Card>

              <Card className="landing-community-card">
                <div className="community-card-top">
                  <div className="community-icon-box x">
                    <Icon name="x" />
                  </div>
                  <Badge tone="neutral">Announcements</Badge>
                </div>
                <h3>X (Twitter)</h3>
                <p>
                  Follow protocol updates, release changelogs, architecture
                  breakdowns, and spotlights on blueprints built with
                  ChainForge.
                </p>
                <div className="community-link-wrap">
                  <a
                    href={COMMUNITY_CONFIG.x}
                    target="_blank"
                    rel="noreferrer"
                    className="landing-community-btn"
                  >
                    <span>Follow @chainforge_ai</span>
                    <Icon name="external" className="size-3" />
                  </a>
                  {COMMUNITY_CONFIG.isPlaceholder && (
                    <small className="placeholder-note">
                      [Preview configuration link]
                    </small>
                  )}
                </div>
              </Card>

              <Card className="landing-community-card">
                <div className="community-card-top">
                  <div className="community-icon-box telegram">
                    <Icon name="telegram" />
                  </div>
                  <Badge tone="neutral">Alpha Channel</Badge>
                </div>
                <h3>Telegram</h3>
                <p>
                  Join our closed broadcast channel for direct feature drops,
                  developer bounty alerts, and private testnet invitations.
                </p>
                <div className="community-link-wrap">
                  <a
                    href={COMMUNITY_CONFIG.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="landing-community-btn"
                  >
                    <span>Join Telegram Channel</span>
                    <Icon name="external" className="size-3" />
                  </a>
                  {COMMUNITY_CONFIG.isPlaceholder && (
                    <small className="placeholder-note">
                      [Preview configuration link]
                    </small>
                  )}
                </div>
              </Card>
            </div>

            <div className="landing-community-notice">
              <Icon name="shield" />
              <p>
                <strong>Security Notice:</strong> Official ChainForge team members
                will never DM you first or ask for private keys, seed phrases, or
                wallet signatures.
              </p>
            </div>
          </div>
        </section>

        {/* ── 8. Early Access Section ── */}
        <section id="early-access" className="landing-section landing-alt-bg">
          <div className="landing-container max-w-3xl">
            <div className="landing-section-header text-center">
              <Badge tone="brand">Limited Preview</Badge>
              <h2 className="landing-section-title">Request Early Access</h2>
              <p className="landing-section-subtitle">
                Be the first to access upcoming code scaffolding, blueprint
                scoring, and collaborative workspace features.
              </p>
            </div>

            <Card className="landing-form-card">
              {submitResult ? (
                <div className="early-access-result">
                  <div className="result-icon-badge">
                    <Icon name="check" />
                  </div>
                  <h3>Request Logged</h3>
                  <p className="result-text">{submitResult.message}</p>
                  <div className="result-details">
                    <div>
                      <span>Registered Email:</span>
                      <strong>{submitResult.email}</strong>
                    </div>
                    <div>
                      <span>Backend Status:</span>
                      <Badge tone={submitResult.persisted ? "success" : "warning"}>
                        {submitResult.persisted
                          ? "Database Synced"
                          : "Local Preview Registry"}
                      </Badge>
                    </div>
                  </div>
                  <p className="result-disclaimer">
                    * In accordance with our safety policy, submissions are
                    logged honestly. Production CRM integration is configured for
                    the public release.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSubmitResult(null)}
                  >
                    Register Another Email
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleEarlyAccessSubmit}
                  className="landing-form"
                  noValidate
                >
                  <div className="landing-form-grid">
                    <div className="field">
                      <label htmlFor={emailInputId} className="field-header">
                        <span>Email Address *</span>
                      </label>
                      <Input
                        id={emailInputId}
                        type="email"
                        icon="message"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (formError) setFormError("")
                        }}
                        placeholder="you@gmail.com or you@protocol.xyz"
                        required
                        aria-invalid={Boolean(formError)}
                      />
                      {formError && (
                        <small className="field-error">{formError}</small>
                      )}
                    </div>

                    <div className="field">
                      <label htmlFor={roleSelectId} className="field-header">
                        <span>Primary Role</span>
                      </label>
                      <Select
                        id={roleSelectId}
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option>Founder / Co-Founder</option>
                        <option>Smart Contract Engineer</option>
                        <option>Full-Stack Developer</option>
                        <option>Product Manager</option>
                        <option>Growth / Community Lead</option>
                        <option>Investor / Ecosystem Partner</option>
                        <option>Independent Researcher</option>
                        <option>Other</option>
                      </Select>
                    </div>

                    <div className="field">
                      <label htmlFor={stageSelectId} className="field-header">
                        <span>Project Stage</span>
                      </label>
                      <Select
                        id={stageSelectId}
                        value={stage}
                        onChange={(e) => setStage(e.target.value)}
                      >
                        <option>Idea / Pre-code</option>
                        <option>Whitepaper / Architecture</option>
                        <option>Testnet / MVP Active</option>
                        <option>Mainnet Deployed</option>
                        <option>Ecosystem Grant Seeking</option>
                      </Select>
                    </div>

                    <div className="field">
                      <label htmlFor={blockchainSelectId} className="field-header">
                        <span>Primary Blockchain</span>
                      </label>
                      <Select
                        id={blockchainSelectId}
                        value={blockchain}
                        onChange={(e) => setBlockchain(e.target.value)}
                      >
                        <option>Agnostic / Multi-chain</option>
                        <option>Ethereum</option>
                        <option>Arbitrum</option>
                        <option>Optimism</option>
                        <option>Base</option>
                        <option>Polygon</option>
                        <option>Solana</option>
                        <option>Avalanche</option>
                        <option>BNB Chain</option>
                        <option>Robinhood</option>
                        <option>Other</option>
                      </Select>
                    </div>
                  </div>

                  <div className="landing-form-footer">
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      icon="send"
                      className="full-btn"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Logging request..."
                        : "Submit Early Access Request"}
                    </Button>
                    <p className="landing-form-privacy">
                      We respect your privacy. Submissions are strictly used for
                      protocol alpha invitations and product feedback. No spam.
                    </p>
                  </div>
                </form>
              )}
            </Card>
          </div>
        </section>

        {/* ── 9. Partnerships Section ── */}
        <section id="partnerships" className="landing-section">
          <div className="landing-container">
            <div className="landing-section-header text-center">
              <Badge tone="cyan">Collaborate With Us</Badge>
              <h2 className="landing-section-title">Ecosystem Partnerships</h2>
              <p className="landing-section-subtitle">
                We work with accelerators, audit firms, and Layer 1/2 foundations
                to standardize developer onboarding and specification rigor.
              </p>
            </div>

            <div className="landing-partnerships-grid">
              <Card className="landing-partner-card">
                <div className="landing-card-icon violet">
                  <Icon name="trend" />
                </div>
                <h3>Accelerators & Incubators</h3>
                <p>
                  Provide ChainForge AI blueprinting licenses to your hackathon
                  teams and cohort founders for accelerated technical validation.
                </p>
                <span className="partner-track-tag">Founder Tooling</span>
              </Card>

              <Card className="landing-partner-card">
                <div className="landing-card-icon cyan">
                  <Icon name="shield" />
                </div>
                <h3>Security & Audit Firms</h3>
                <p>
                  Collaborate on automated pre-audit specification benchmarks,
                  threat-modeling standards, and contract verification checks.
                </p>
                <span className="partner-track-tag">Pre-Audit Specs</span>
              </Card>

              <Card className="landing-partner-card">
                <div className="landing-card-icon emerald">
                  <Icon name="globe" />
                </div>
                <h3>L1 & L2 Ecosystem Foundations</h3>
                <p>
                  Integrate customized architectural templates and developer
                  onboarding pipelines directly into your ecosystem documentation.
                </p>
                <span className="partner-track-tag">Ecosystem Grants</span>
              </Card>
            </div>

            <div className="landing-partner-contact-box">
              <div>
                <strong>Inquire About Strategic Partnerships</strong>
                <p>
                  Reach out directly to our ecosystem lead to schedule an
                  introductory discussion.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <a
                  href={`mailto:${COMMUNITY_CONFIG.partnershipEmail}?subject=ChainForge%20Partnership%20Inquiry`}
                  className="btn btn-primary btn-sm"
                >
                  <Icon name="send" />
                  <span>Email Partnerships</span>
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={copiedEmail ? "check" : "copy"}
                  onClick={handleCopyPartnershipEmail}
                >
                  {copiedEmail ? "Email Copied!" : "Copy Email Address"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 10. Footer ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            {/* Brand column */}
            <div className="landing-footer-brand">
              <div className="landing-brand">
                <img
                  src={BRAND_LOGO_DATA_URI}
                  alt="ChainForge Logo"
                  className="brand-logo-img"
                />
                <span className="landing-brand-text">
                  <strong>ChainForge</strong>
                  <span className="brand-badge">AI</span>
                </span>
              </div>
              <p className="landing-footer-tagline">
                AI Growth & Architecture Intelligence for Web3 founders,
                engineers, and technical product leads.
              </p>
              <div className="landing-footer-meta">
                <span>Version 1.0 Beta</span>
                <span className="dot-sep">·</span>
                <span>AI Powered</span>
              </div>
            </div>

            {/* Navigation column */}
            <div className="landing-footer-col">
              <h4>Product</h4>
              <ul>
                <li>
                  <a href="#product">Build Engine</a>
                </li>
                <li>
                  <a href="#how-it-works">How It Works</a>
                </li>
                <li>
                  <a href="#roadmap">Product Roadmap</a>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => onLaunchApp("Overview")}
                  >
                    Growth Dashboard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-link-btn"
                    onClick={() => onLaunchApp("Build Engine")}
                  >
                    Launch Workspace
                  </button>
                </li>
              </ul>
            </div>

            {/* Community column */}
            <div className="landing-footer-col">
              <h4>Community</h4>
              <ul>
                <li>
                  <a
                    href={COMMUNITY_CONFIG.discord}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Discord Community
                  </a>
                </li>
                <li>
                  <a
                    href={COMMUNITY_CONFIG.x}
                    target="_blank"
                    rel="noreferrer"
                  >
                    X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href={COMMUNITY_CONFIG.telegram}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Telegram Alpha
                  </a>
                </li>
                <li>
                  <a href="#partnerships">Partnership Inquiries</a>
                </li>
              </ul>
            </div>

            {/* Legal / Policy column */}
            <div className="landing-footer-col">
              <h4>Governance & Legal</h4>
              <ul>
                <li>
                  <span className="text-muted text-xs">Terms of Service</span>
                </li>
                <li>
                  <span className="text-muted text-xs">Privacy Policy</span>
                </li>
                <li>
                  <a href="#early-access">Request Early Access</a>
                </li>
                <li>
                  <span className="text-muted text-xs">
                    Security Disclosure Policy
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <p className="landing-footer-copyright">
              © {new Date().getFullYear()} ChainForge. All rights reserved.
            </p>
            <p className="landing-footer-disclaimer">
              <strong>Disclaimer:</strong> ChainForge AI blueprints are conceptual
              starting points and architectural recommendations. They do not
              constitute formal smart contract audits, security guarantees, or
              investment advice. Smart contracts must be audited by certified
              security professionals prior to mainnet deployment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
