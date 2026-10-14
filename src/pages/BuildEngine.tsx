import { useState, useEffect } from "react"
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
          blueprints.length > 0 ? (
            <Badge tone="brand">
              {blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""}{" "}
              saved
            </Badge>
          ) : undefined
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

  const updateField = (field: keyof BlueprintInput, value: string) => {
    setInput((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
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
          title="Project details"
          description="Tell us about your Web3 project idea"
        />
        <label className="field">
          <span>Project name *</span>
          <Input
            value={input.projectName}
            onChange={(e) => updateField("projectName", e.target.value)}
            placeholder="e.g. Nova Protocol"
            aria-invalid={Boolean(errors.projectName)}
          />
          {errors.projectName && (
            <small className="field-error">{errors.projectName}</small>
          )}
        </label>
        <label className="field">
          <span>Project idea and problem being solved *</span>
          <textarea
            className="textarea"
            rows={5}
            value={input.projectIdea}
            onChange={(e) => updateField("projectIdea", e.target.value)}
            placeholder="Describe the problem you want to solve, your proposed approach, and what makes it unique..."
            aria-invalid={Boolean(errors.projectIdea)}
          />
          {errors.projectIdea && (
            <small className="field-error">{errors.projectIdea}</small>
          )}
        </label>
        <label className="field">
          <span>Target audience *</span>
          <Input
            value={input.targetAudience}
            onChange={(e) => updateField("targetAudience", e.target.value)}
            placeholder="e.g. DeFi users, Web3 developers, NFT creators..."
            aria-invalid={Boolean(errors.targetAudience)}
          />
          {errors.targetAudience && (
            <small className="field-error">{errors.targetAudience}</small>
          )}
        </label>
        <label className="field">
          <span>Preferred blockchain (optional)</span>
          <Select
            value={input.preferredBlockchain}
            onChange={(e) => updateField("preferredBlockchain", e.target.value)}
          >
            <option value="">No preference</option>
            <option>Ethereum</option>
            <option>Solana</option>
            <option>Polygon</option>
            <option>Arbitrum</option>
            <option>Base</option>
            <option>Avalanche</option>
            <option>BNB Chain</option>
            <option>Optimism</option>
            <option>Other</option>
          </Select>
        </label>
        <label className="field">
          <span>Additional context or constraints (optional)</span>
          <textarea
            className="textarea"
            rows={3}
            value={input.additionalContext}
            onChange={(e) => updateField("additionalContext", e.target.value)}
            placeholder="Budget constraints, timeline, technical preferences, regulatory considerations..."
          />
        </label>
        <Button
          icon="sparkles"
          className="full-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating blueprint..." : "Generate blueprint"}
        </Button>
        {apiError && (
          <div className="build-engine-error">
            <Icon name="activity" />
            <div>
              <strong>Generation failed</strong>
              <p>{apiError}</p>
            </div>
          </div>
        )}
      </Card>
      <div className="build-engine-result">
        {loading && <LoadingSkeleton />}
        {!loading && !result && !apiError && (
          <Card className="build-engine-empty">
            <EmptyState
              icon="sparkles"
              title="Your blueprint will appear here"
              description="Fill in the project details on the left and click Generate to create a structured project blueprint powered by Gemini AI."
            />
          </Card>
        )}
        {!loading && result && (
          <BlueprintDisplay
            result={result}
            input={input}
            onSave={handleSave}
            saved={saved}
          />
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="loading-card">
      <span />
      <span />
      <span />
      <span />
    </Card>
  )
}

function BlueprintDisplay({
  result,
  input,
  onSave,
  saved,
}: {
  result: BlueprintResult
  input?: BlueprintInput
  onSave?: () => void
  saved?: boolean
}) {
  return (
    <div className="blueprint-display">
      <div className="blueprint-header">
        <div>
          <h2>{input?.projectName || "Project Blueprint"}</h2>
          <p>AI-generated project blueprint</p>
        </div>
        {onSave && (
          <Button
            icon={saved ? "check" : "download"}
            variant={saved ? "secondary" : "primary"}
            onClick={onSave}
            disabled={saved}
          >
            {saved ? "Saved" : "Save blueprint"}
          </Button>
        )}
      </div>

      <div className="blueprint-disclaimer">
        <Icon name="shield" />
        <p>
          <strong>AI-generated content.</strong> This blueprint is a starting
          point and has not been audited. Any smart contract requirements must
          be reviewed by a qualified security professional before
          implementation.
        </p>
      </div>

      <BlueprintSection title="Problem statement" icon="target">
        <p>{result.problemStatement}</p>
      </BlueprintSection>

      <BlueprintSection title="Target users" icon="users">
        <p>{result.targetUsers}</p>
      </BlueprintSection>

      <BlueprintSection title="Proposed solution" icon="sparkles">
        <p>{result.proposedSolution}</p>
      </BlueprintSection>

      <BlueprintSection title="Core MVP features" icon="check">
        <ul className="blueprint-list">
          {result.coreMvpFeatures.map((feature, i) => (
            <li key={i}>
              <Icon name="check" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </BlueprintSection>

      <BlueprintSection title="Recommended architecture" icon="project">
        <p>{result.recommendedArchitecture}</p>
      </BlueprintSection>

      <BlueprintSection title="Smart contract requirements" icon="link">
        <p>{result.smartContractRequirements}</p>
      </BlueprintSection>

      <BlueprintSection title="Security considerations" icon="shield">
        <p>{result.securityConsiderations}</p>
      </BlueprintSection>

      <BlueprintSection title="Open questions" icon="message">
        <ul className="blueprint-list questions">
          {result.openQuestions.map((question, i) => (
            <li key={i}>
              <span className="question-number">{i + 1}</span>
              <span>{question}</span>
            </li>
          ))}
        </ul>
      </BlueprintSection>
    </div>
  )
}

function BlueprintSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: import("../components/Icons").IconName
  children: React.ReactNode
}) {
  return (
    <Card className="blueprint-section">
      <div className="blueprint-section-header">
        <span className="blueprint-section-icon">
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
  onDelete,
}: {
  blueprints: Blueprint[]
  selectedBlueprint: Blueprint | null
  onSelect: (id: string | null) => void
  onDelete: (id: string) => void
}) {
  if (blueprints.length === 0) {
    return (
      <Card className="build-engine-empty">
        <EmptyState
          icon="project"
          title="No blueprints saved yet"
          description="Generate a project blueprint from the Generate tab and save it to see it here."
        />
      </Card>
    )
  }

  if (selectedBlueprint) {
    return (
      <div className="page">
        <button className="back-link" onClick={() => onSelect(null)}>
          <Icon name="arrow" className="rotate-180" /> Back to saved blueprints
        </button>
        <BlueprintDisplay
          result={selectedBlueprint.result}
          input={selectedBlueprint.input}
        />
        <div className="blueprint-meta-bar">
          <small>
            Created {new Date(selectedBlueprint.createdAt).toLocaleDateString()}{" "}
            at {new Date(selectedBlueprint.createdAt).toLocaleTimeString()}
          </small>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onDelete(selectedBlueprint.id)
              onSelect(null)
            }}
          >
            Delete blueprint
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="blueprint-grid">
      {blueprints
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map((bp) => (
          <Card key={bp.id} className="blueprint-card">
            <button
              className="blueprint-card-btn"
              onClick={() => onSelect(bp.id)}
            >
              <div className="blueprint-card-top">
                <span className="nova-logo small">
                  {bp.input.projectName[0]?.toUpperCase() || "?"}
                </span>
                <div>
                  <strong>{bp.input.projectName}</strong>
                  <small>
                    {new Date(bp.createdAt).toLocaleDateString()} ·{" "}
                    {bp.result.coreMvpFeatures.length} MVP features
                  </small>
                </div>
              </div>
              <p>{bp.result.problemStatement.slice(0, 150)}...</p>
              <div className="blueprint-card-tags">
                {bp.input.preferredBlockchain && (
                  <Badge tone="brand">{bp.input.preferredBlockchain}</Badge>
                )}
                <Badge tone="neutral">
                  {bp.result.openQuestions.length} open question
                  {bp.result.openQuestions.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </button>
          </Card>
        ))}
    </div>
  )
}
