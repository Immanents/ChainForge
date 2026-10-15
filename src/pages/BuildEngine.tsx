import { useState, useEffect, useMemo } from "react"
import { Icon } from "../components/Icons"
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeading,
  SectionHeading,
  Select,
  Tabs,
} from "../components/ui"
import {
  loadBlueprints,
  saveBlueprint,
  deleteBlueprint,
  type Blueprint,
  type BlueprintInput,
  type BlueprintResult,
} from "../data/blueprints"
import { generateBlueprint, GeminiError } from "../services/gemini"

const PRESET_IDEAS: Array<{
  name: string
  tag: string
  chain: string
  input: BlueprintInput
}> = [
  {
    name: "Nova Yield",
    tag: "DeFi Aggregator",
    chain: "Arbitrum",
    input: {
      projectName: "Nova Yield",
      projectIdea:
        "A decentralized cross-chain yield optimizer that automatically routes LP liquidity and single-sided stakes to the highest risk-adjusted yield strategies across Layer 2 rollups.",
      targetAudience:
        "DeFi yield farmers, DAO treasuries, and passive crypto asset holders",
      preferredBlockchain: "Arbitrum",
      additionalContext:
        "Requires automated rebalancing vaults, slippage protection, and real-time APY calculation oracles via Chainlink.",
    },
  },
  {
    name: "ZeroProof ID",
    tag: "ZK Identity",
    chain: "Polygon",
    input: {
      projectName: "ZeroProof ID",
      projectIdea:
        "A privacy-preserving decentralized identity and verifiable credential protocol using zero-knowledge proofs to allow compliance verification without exposing PII.",
      targetAudience:
        "Web3 dApp developers, institutional DeFi protocols, and privacy-conscious users",
      preferredBlockchain: "Polygon",
      additionalContext:
        "EIP-712 signature verification, Polygon zkEVM compatibility, and lightweight client-side proof generation using circom.",
    },
  },
  {
    name: "HyperMesh",
    tag: "DePIN Sensors",
    chain: "Solana",
    input: {
      projectName: "HyperMesh",
      projectIdea:
        "A decentralized physical infrastructure network (DePIN) for environmental and micro-weather sensors that rewards node operators with token micropayments for verifiable telemetry data.",
      targetAudience:
        "Hardware IoT enthusiasts, smart city researchers, and autonomous fleet operators",
      preferredBlockchain: "Solana",
      additionalContext:
        "High-frequency micropayments on Solana state compression, cryptographic hardware proof-of-witness, and IPFS data archiving.",
    },
  },
]

export default function BuildEngine() {
  const [tab, setTab] = useState("Generate")
  const [blueprints, setBlueprints] = useState<Blueprint[]>(loadBlueprints)
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(
    null,
  )

  const refreshBlueprints = () => setBlueprints(loadBlueprints())

  const selectedBlueprint = selectedBlueprintId
    ? blueprints.find((b) => b.id === selectedBlueprintId) || null
    : null

  return (
    <div className="page">
      <PageHeading
        title="Build Engine"
        description="Transform your Web3 idea into a structured project blueprint powered by AI."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="cyan">Gemini 3.8 Flash</Badge>
            {blueprints.length > 0 && (
              <Badge tone="brand">
                {blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""}{" "}
                saved
              </Badge>
            )}
          </div>
        }
      />
      <Tabs
        items={["Generate", "Saved blueprints"]}
        active={tab}
        onChange={(t) => {
          setTab(t)
          if (t === "Saved blueprints") refreshBlueprints()
        }}
      />
      {tab === "Generate" && (
        <GenerateTab
          onSaved={() => {
            refreshBlueprints()
            setTab("Saved blueprints")
          }}
        />
      )}
      {tab === "Saved blueprints" && (
        <SavedTab
          blueprints={blueprints}
          selectedBlueprint={selectedBlueprint}
          onSelect={setSelectedBlueprintId}
          onGoToGenerate={() => setTab("Generate")}
          onDelete={(id) => {
            deleteBlueprint(id)
            if (selectedBlueprintId === id) setSelectedBlueprintId(null)
            refreshBlueprints()
          }}
        />
      )}
    </div>
  )
}

function GenerateTab({ onSaved }: { onSaved: () => void }) {
  const [input, setInput] = useState<BlueprintInput>({
    projectName: "",
    projectIdea: "",
    targetAudience: "",
    preferredBlockchain: "",
    additionalContext: "",
  })
  const [errors, setErrors] =
    useState<Partial<Record<keyof BlueprintInput, string>>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [result, setResult] = useState<BlueprintResult | null>(null)
  const [saved, setSaved] = useState(false)

  const isDirty = Boolean(
    input.projectName ||
      input.projectIdea ||
      input.targetAudience ||
      input.preferredBlockchain ||
      input.additionalContext,
  )

  const updateField = (field: keyof BlueprintInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setApiError("")
  }

  const handleApplyPreset = (preset: (typeof PRESET_IDEAS)[0]) => {
    setInput(preset.input)
    setErrors({})
    setApiError("")
  }

  const handleResetForm = () => {
    setInput({
      projectName: "",
      projectIdea: "",
      targetAudience: "",
      preferredBlockchain: "",
      additionalContext: "",
    })
    setErrors({})
    setApiError("")
  }

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!input.projectName.trim())
      next.projectName = "Project name is required."
    if (!input.projectIdea.trim())
      next.projectIdea = "Describe the problem your project solves."
    if (!input.targetAudience.trim())
      next.targetAudience = "Who is the target audience?"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    setLoading(true)
    setApiError("")
    setResult(null)
    setSaved(false)
    try {
      const blueprintResult = await generateBlueprint(input)
      setResult(blueprintResult)
    } catch (err) {
      if (err instanceof GeminiError) {
        setApiError(err.message)
      } else {
        setApiError(
          "An unexpected error occurred. Please check your API key and try again.",
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!result) return
    const blueprint: Blueprint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: input.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      createdAt: new Date().toISOString(),
      input,
      result,
    }
    saveBlueprint(blueprint)
    setSaved(true)
    onSaved()
  }

  return (
    <div className="build-engine-layout">
      <Card className="build-engine-form">
        <SectionHeading
          title="Project parameters"
          description="Define the vision, market, and blockchain parameters"
          action={
            isDirty && !loading ? (
              <button
                type="button"
                className="text-action"
                onClick={handleResetForm}
                title="Reset form"
              >
                Clear
              </button>
            ) : undefined
          }
        />

        <div className="preset-bar">
          <div className="preset-bar-title">
            <span>Quick prompt presets</span>
            <span className="text-[9px] text-[var(--muted)]">1-Click fill</span>
          </div>
          <div className="preset-chips">
            {PRESET_IDEAS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="preset-chip"
                onClick={() => handleApplyPreset(preset)}
                disabled={loading}
              >
                <span>✦</span>
                <strong>{preset.name}</strong>
                <small className="opacity-70">({preset.chain})</small>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <div className="field-header">
            <span>Project name *</span>
            {input.projectName.length > 0 && (
              <span className="text-[10px] text-[var(--muted)]">
                {input.projectName.length} chars
              </span>
            )}
          </div>
          <Input
            value={input.projectName}
            onChange={(e) => updateField("projectName", e.target.value)}
            placeholder="e.g. Nova Protocol"
            aria-invalid={Boolean(errors.projectName)}
            disabled={loading}
          />
          {errors.projectName && (
            <small className="field-error">{errors.projectName}</small>
          )}
        </label>

        <label className="field">
          <div className="field-header">
            <span>Project vision & problem solved *</span>
            {input.projectIdea.length > 0 && (
              <span className="text-[10px] text-[var(--muted)]">
                {input.projectIdea.length} chars
              </span>
            )}
          </div>
          <textarea
            className="textarea"
            rows={4}
            value={input.projectIdea}
            onChange={(e) => updateField("projectIdea", e.target.value)}
            placeholder="Describe the problem, your architectural approach, and unique value proposition..."
            aria-invalid={Boolean(errors.projectIdea)}
            disabled={loading}
          />
          {errors.projectIdea && (
            <small className="field-error">{errors.projectIdea}</small>
          )}
          <p className="field-tip">
            Be as specific as possible regarding token utility, user flows, and
            market gap.
          </p>
        </label>

        <label className="field">
          <div className="field-header">
            <span>Target users & ecosystem *</span>
          </div>
          <Input
            value={input.targetAudience}
            onChange={(e) => updateField("targetAudience", e.target.value)}
            placeholder="e.g. DeFi yield farmers, DAO treasuries, L2 developers"
            aria-invalid={Boolean(errors.targetAudience)}
            disabled={loading}
          />
          {errors.targetAudience && (
            <small className="field-error">{errors.targetAudience}</small>
          )}
        </label>

        <label className="field">
          <div className="field-header">
            <span>Target blockchain ecosystem</span>
            <span className="text-[10px] text-[var(--muted)]">Optional</span>
          </div>
          <Select
            value={input.preferredBlockchain}
            onChange={(e) => updateField("preferredBlockchain", e.target.value)}
            disabled={loading}
          >
            <option value="">Agnostic / Multi-chain</option>
            <option>Ethereum</option>
            <option>Arbitrum</option>
            <option>Optimism</option>
            <option>Base</option>
            <option>Polygon</option>
            <option>Solana</option>
            <option>Avalanche</option>
            <option>BNB Chain</option>
            <option>Other</option>
          </Select>
        </label>

        <label className="field">
          <div className="field-header">
            <span>Technical constraints & notes</span>
            <span className="text-[10px] text-[var(--muted)]">Optional</span>
          </div>
          <textarea
            className="textarea"
            rows={3}
            value={input.additionalContext}
            onChange={(e) => updateField("additionalContext", e.target.value)}
            placeholder="Tokenomics constraints, oracles, audit timeline, regulatory considerations..."
            disabled={loading}
          />
        </label>

        <Button
          icon={loading ? "refresh" : "sparkles"}
          className="full-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Synthesizing blueprint..." : "Generate AI Blueprint"}
        </Button>

        {apiError && (
          <div className="build-engine-error">
            <Icon name="activity" />
            <div>
              <strong>Generation failed</strong>
              <p>{apiError}</p>
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={handleGenerate}
              >
                Retry generation
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="build-engine-result">
        {loading && (
          <LoadingState
            projectName={input.projectName}
            blockchain={input.preferredBlockchain}
          />
        )}
        {!loading && !result && !apiError && (
          <Card className="build-engine-empty">
            <EmptyState
              icon="sparkles"
              title="Ready to engineer your Web3 blueprint"
              description="Configure project parameters on the left or select a prompt preset above to generate a comprehensive technical, security, and MVP blueprint."
            />
          </Card>
        )}
        {!loading && result && (
          <BlueprintDisplay
            result={result}
            input={input}
            onSave={handleSave}
            saved={saved}
            onReset={() => setResult(null)}
          />
        )}
      </div>
    </div>
  )
}

function LoadingState({
  projectName,
  blockchain,
}: {
  projectName: string
  blockchain?: string
}) {
  const [stageIndex, setStageIndex] = useState(0)

  const stages = [
    "Deconstructing problem domain & market landscape...",
    "Designing smart contract architecture & tokenomics...",
    "Formulating phased MVP feature specifications...",
    "Conducting security, exploit & decentralization profiling...",
    "Synthesizing final Web3 blueprint and execution roadmap...",
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev < stages.length - 1 ? prev + 1 : prev))
    }, 2000)
    return () => clearInterval(timer)
  }, [stages.length])

  return (
    <Card className="ai-synthesis-card">
      <div className="ai-synthesis-header">
        <div className="ai-radar-container">
          <div className="ai-radar-ring ring-1" />
          <div className="ai-radar-ring ring-2" />
          <div className="ai-radar-core">
            <Icon name="sparkles" />
          </div>
        </div>
        <div className="ai-synthesis-meta">
          <div className="ai-badge-row">
            <span className="ai-status-pulse" />
            <Badge tone="brand">Gemini 3.8 Flash Neural Engine</Badge>
            {blockchain && <Badge tone="cyan">{blockchain}</Badge>}
          </div>
          <h3>Synthesizing blueprint for {projectName || "Web3 Project"}</h3>
          <p className="ai-stage-label">
            <span>⚡</span> {stages[stageIndex]}
          </p>
        </div>
      </div>

      <div className="ai-progress-track">
        <div
          className="ai-progress-fill"
          style={{ width: `${Math.min(100, (stageIndex + 1) * 22)}%` }}
        />
      </div>

      <div className="ai-skeleton-wrap">
        <div className="ai-skeleton-card">
          <span className="skel-line w-40" />
          <span className="skel-line w-100" />
          <span className="skel-line w-80" />
        </div>
        <div className="ai-skeleton-card">
          <span className="skel-line w-30" />
          <span className="skel-line w-90" />
          <span className="skel-line w-70" />
        </div>
      </div>
    </Card>
  )
}

function formatBlueprintMarkdown(bp: {
  input?: BlueprintInput
  result: BlueprintResult
  createdAt?: string
}): string {
  const name = bp.input?.projectName || "Web3 Project Blueprint"
  const chain = bp.input?.preferredBlockchain
    ? ` (${bp.input.preferredBlockchain})`
    : ""
  const date = bp.createdAt
    ? `\n*Created on ${new Date(bp.createdAt).toLocaleDateString()}*`
    : ""

  return `# ${name}${chain}
*Generated by ChainForge AI Build Engine*${date}

## 1. Problem Statement
${bp.result.problemStatement}

## 2. Target Users
${bp.result.targetUsers}

## 3. Proposed Solution
${bp.result.proposedSolution}

## 4. Core MVP Features
${bp.result.coreMvpFeatures.map((f, i) => `${i + 1}. ${f}`).join("\n")}

## 5. Recommended Architecture
${bp.result.recommendedArchitecture}

## 6. Smart Contract Requirements
${bp.result.smartContractRequirements}

## 7. Security Considerations
${bp.result.securityConsiderations}

## 8. Open Strategic Questions
${bp.result.openQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}
`
}

function BlueprintDisplay({
  result,
  input,
  onSave,
  saved,
  onReset,
}: {
  result: BlueprintResult
  input?: BlueprintInput
  onSave?: () => void
  saved?: boolean
  onReset?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyMarkdown = () => {
    const md = formatBlueprintMarkdown({ input, result })
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadJSON = () => {
    const payload = JSON.stringify(
      { input, result, exportedAt: new Date().toISOString() },
      null,
      2,
    )
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${(input?.projectName || "blueprint").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-blueprint.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="blueprint-display">
      <Card className="blueprint-hero">
        <div className="blueprint-hero-left">
          <div className="blueprint-avatar">
            {input?.projectName?.[0]?.toUpperCase() || "✦"}
          </div>
          <div className="blueprint-hero-info">
            <h2>{input?.projectName || "Web3 Project Blueprint"}</h2>
            <div className="blueprint-hero-tags">
              {input?.preferredBlockchain ? (
                <Badge tone="cyan">{input.preferredBlockchain}</Badge>
              ) : (
                <Badge tone="neutral">Multi-chain</Badge>
              )}
              <Badge tone="brand">
                {result.coreMvpFeatures.length} MVP Milestones
              </Badge>
              <Badge tone="neutral">Gemini 3.8 Flash</Badge>
            </div>
          </div>
        </div>

        <div className="blueprint-actions">
          <Button
            icon={copied ? "check" : "copy"}
            variant="secondary"
            size="sm"
            onClick={handleCopyMarkdown}
          >
            {copied ? "Copied Markdown" : "Copy Markdown"}
          </Button>
          <Button
            icon="download"
            variant="secondary"
            size="sm"
            onClick={handleDownloadJSON}
            title="Download structured JSON"
          >
            JSON
          </Button>
          {onSave && (
            <Button
              icon={saved ? "check" : "download"}
              variant={saved ? "secondary" : "primary"}
              size="sm"
              onClick={onSave}
              disabled={saved}
            >
              {saved ? "Saved" : "Save Blueprint"}
            </Button>
          )}
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              New
            </Button>
          )}
        </div>
      </Card>

      <div className="blueprint-disclaimer">
        <Icon name="shield" />
        <p>
          <strong>AI-generated strategic blueprint.</strong> This blueprint
          serves as a comprehensive conceptual and architectural foundation.
          Smart contract logic and security implementations must undergo formal
          auditing by accredited security firms before mainnet deployment.
        </p>
      </div>

      <div className="two-col">
        <BlueprintSection
          title="Problem statement"
          icon="target"
          iconTone="violet"
        >
          <p>{result.problemStatement}</p>
        </BlueprintSection>

        <BlueprintSection title="Target users" icon="users" iconTone="cyan">
          <p>{result.targetUsers}</p>
        </BlueprintSection>
      </div>

      <BlueprintSection
        title="Proposed solution & value prop"
        icon="sparkles"
        iconTone="cyan"
      >
        <p>{result.proposedSolution}</p>
      </BlueprintSection>

      <BlueprintSection
        title="Core MVP roadmap & features"
        icon="check"
        iconTone="emerald"
      >
        <div className="blueprint-feature-grid">
          {result.coreMvpFeatures.map((feature, i) => (
            <div key={i} className="blueprint-feature-card">
              <div className="feature-card-header">
                <span className="feature-check">
                  <Icon name="check" />
                </span>
                <span className="feature-number">Milestone 0{i + 1}</span>
              </div>
              <p className="feature-text">{feature}</p>
            </div>
          ))}
        </div>
      </BlueprintSection>

      <BlueprintSection
        title="Recommended architecture & tech stack"
        icon="project"
        iconTone="violet"
      >
        <div className="tech-spec-box">{result.recommendedArchitecture}</div>
      </BlueprintSection>

      <BlueprintSection
        title="Smart contract specifications"
        icon="link"
        iconTone="cyan"
      >
        <div className="contract-spec-box">
          {result.smartContractRequirements}
        </div>
      </BlueprintSection>

      <BlueprintSection
        title="Security & risk considerations"
        icon="shield"
        iconTone="amber"
      >
        <div className="security-spec-box">
          {result.securityConsiderations}
        </div>
      </BlueprintSection>

      <BlueprintSection
        title="Strategic & open questions"
        icon="message"
        iconTone="violet"
      >
        <div className="questions-grid">
          {result.openQuestions.map((question, i) => (
            <div key={i} className="question-item">
              <span className="question-badge">{i + 1}</span>
              <p>{question}</p>
            </div>
          ))}
        </div>
      </BlueprintSection>
    </div>
  )
}

function BlueprintSection({
  title,
  icon,
  iconTone = "cyan",
  children,
}: {
  title: string
  icon: import("../components/Icons").IconName
  iconTone?: "violet" | "cyan" | "amber" | "emerald"
  children: React.ReactNode
}) {
  return (
    <Card className="blueprint-section">
      <div className="blueprint-section-header">
        <span className={`blueprint-section-icon ${iconTone}`}>
          <Icon name={icon} />
        </span>
        <h3>{title}</h3>
      </div>
      {children}
    </Card>
  )
}

function SavedTab({
  blueprints,
  selectedBlueprint,
  onSelect,
  onGoToGenerate,
  onDelete,
}: {
  blueprints: Blueprint[]
  selectedBlueprint: Blueprint | null
  onSelect: (id: string | null) => void
  onGoToGenerate: () => void
  onDelete: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChain, setSelectedChain] = useState("all")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const uniqueChains = useMemo(() => {
    const set = new Set<string>()
    blueprints.forEach((b) => {
      if (b.input.preferredBlockchain) set.add(b.input.preferredBlockchain)
    })
    return Array.from(set)
  }, [blueprints])

  const totalFeaturesCount = useMemo(() => {
    return blueprints.reduce(
      (acc, b) => acc + (b.result.coreMvpFeatures?.length || 0),
      0,
    )
  }, [blueprints])

  const filteredBlueprints = useMemo(() => {
    return blueprints
      .filter((bp) => {
        const matchesSearch =
          bp.input.projectName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          bp.result.problemStatement
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        const matchesChain =
          selectedChain === "all" ||
          bp.input.preferredBlockchain === selectedChain
        return matchesSearch && matchesChain
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [blueprints, searchQuery, selectedChain])

  if (blueprints.length === 0) {
    return (
      <Card className="build-engine-empty">
        <EmptyState
          icon="project"
          title="No blueprints saved yet"
          description="Synthesize your first project blueprint with Gemini AI in the Generate tab and save it to your local registry."
          action={
            <Button icon="sparkles" onClick={onGoToGenerate}>
              Generate a blueprint
            </Button>
          }
        />
      </Card>
    )
  }

  if (selectedBlueprint) {
    return (
      <div className="page">
        <button
          type="button"
          className="back-link"
          onClick={() => onSelect(null)}
        >
          <Icon name="arrow" className="rotate-180" /> Back to saved blueprints
        </button>

        <BlueprintDisplay
          result={selectedBlueprint.result}
          input={selectedBlueprint.input}
        />

        <div className="blueprint-meta-bar">
          <small>
            Saved on{" "}
            {new Date(selectedBlueprint.createdAt).toLocaleDateString()} at{" "}
            {new Date(selectedBlueprint.createdAt).toLocaleTimeString()} · ID:{" "}
            {selectedBlueprint.id}
          </small>
          {confirmDeleteId === selectedBlueprint.id ? (
            <div className="delete-confirm-pop">
              <span>Delete permanently?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(selectedBlueprint.id)
                  onSelect(null)
                  setConfirmDeleteId(null)
                }}
              >
                Yes, delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              onClick={() => setConfirmDeleteId(selectedBlueprint.id)}
            >
              Delete blueprint
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="saved-stats-bar">
        <Card className="saved-stat-card">
          <div className="saved-stat-icon violet">
            <Icon name="project" />
          </div>
          <div className="saved-stat-info">
            <span>Total Blueprints</span>
            <strong>{blueprints.length}</strong>
          </div>
        </Card>
        <Card className="saved-stat-card">
          <div className="saved-stat-icon">
            <Icon name="link" />
          </div>
          <div className="saved-stat-info">
            <span>Active Blockchains</span>
            <strong>{uniqueChains.length || 1}</strong>
          </div>
        </Card>
        <Card className="saved-stat-card">
          <div className="saved-stat-icon emerald">
            <Icon name="check" />
          </div>
          <div className="saved-stat-info">
            <span>Total MVP Milestones</span>
            <strong>{totalFeaturesCount}</strong>
          </div>
        </Card>
      </div>

      <div className="saved-toolbar">
        <Input
          icon="search"
          placeholder="Search saved blueprints..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
        >
          <option value="all">All Blockchains</option>
          {uniqueChains.map((chain) => (
            <option key={chain} value={chain}>
              {chain}
            </option>
          ))}
        </Select>
      </div>

      {filteredBlueprints.length === 0 ? (
        <Card className="build-engine-empty">
          <EmptyState
            icon="search"
            title="No matching blueprints"
            description="No saved blueprints matched your search query or filter. Try a different term or clear filters."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedChain("all")
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="blueprint-grid">
          {filteredBlueprints.map((bp) => (
            <Card key={bp.id} className="blueprint-card">
              <div className="blueprint-card-body">
                <div className="blueprint-card-top">
                  <div className="blueprint-card-avatar">
                    {bp.input.projectName[0]?.toUpperCase() || "✦"}
                  </div>
                  <div className="blueprint-card-title-group">
                    <strong>{bp.input.projectName}</strong>
                    <small>
                      {new Date(bp.createdAt).toLocaleDateString()} ·{" "}
                      {bp.result.coreMvpFeatures.length} MVP features
                    </small>
                  </div>
                </div>

                <p className="blueprint-card-desc">
                  {bp.result.problemStatement}
                </p>

                <div className="blueprint-card-tags">
                  {bp.input.preferredBlockchain ? (
                    <Badge tone="cyan">{bp.input.preferredBlockchain}</Badge>
                  ) : (
                    <Badge tone="neutral">Multi-chain</Badge>
                  )}
                  <Badge tone="brand">
                    {bp.result.openQuestions.length} Questions
                  </Badge>
                </div>
              </div>

              <div className="blueprint-card-footer">
                <Button
                  variant="secondary"
                  size="sm"
                  icon="eye"
                  onClick={() => onSelect(bp.id)}
                >
                  View Blueprint
                </Button>

                {confirmDeleteId === bp.id ? (
                  <div className="delete-confirm-pop">
                    <span>Delete?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        onDelete(bp.id)
                        setConfirmDeleteId(null)
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={() => setConfirmDeleteId(bp.id)}
                    title="Delete blueprint"
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
