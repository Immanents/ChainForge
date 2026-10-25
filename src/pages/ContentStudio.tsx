// src/pages/ContentStudio.tsx
// Complete ChainForge Content Studio: AI Multi-Variation Generation, Draft Management, Calendar Scheduling & Export

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
  mockNanoBananaService,
  type GeneratedImage,
} from "../services/imageGeneration"
import {
  ContentStudioService,
  ContentStudioError,
  type ContentDraft,
  type ContentGenerationRequest,
  type GeneratedContentVariation,
} from "../services/contentStudioService"
import { useAuth } from "../context/AuthContext"

const PRESET_TOPICS = [
  "Nova Intent Layer launch & cross-chain abstraction",
  "Zero-slippage liquidity routing for Layer 2 rollups",
  "Builder waitlist announcement & developer grants",
  "Weekly ecosystem recap: validator milestones & TPS",
]

const PLATFORM_LIMITS: Record<string, { max: number; label: string }> = {
  X: { max: 280, label: "280 chars per tweet" },
  LinkedIn: { max: 3000, label: "Up to 3,000 chars" },
  Telegram: { max: 4096, label: "Markdown announcement" },
  Discord: { max: 2000, label: "Discord formatted" },
}

export default function ContentStudio() {
  const { user, creditsBalance, refreshProfile, openAuthModal } = useAuth()

  // Navigation tabs
  const [tab, setTab] = useState("Generate")

  // Generation workspace state
  const [platform, setPlatform] = useState<ContentGenerationRequest["platform"]>("X")
  const [contentType, setContentType] = useState<ContentGenerationRequest["contentType"]>("Launch post")
  const [topic, setTopic] = useState("Nova Intent Layer launch")
  const [tone, setTone] = useState<ContentGenerationRequest["tone"]>("Confident")
  const [goal, setGoal] = useState<ContentGenerationRequest["goal"]>("Drive awareness")
  const [audience, setAudience] = useState<ContentGenerationRequest["audience"]>("Web3 builders")
  const [additionalInstructions, setAdditionalInstructions] = useState("")

  // Visual generation settings
  const [includeImage, setIncludeImage] = useState(true)
  const [imagePrompt, setImagePrompt] = useState(
    "A precise orbital network visual representing seamless cross-chain intents, premium dark editorial style, Nova violet accent, no text",
  )
  const [images, setImages] = useState<GeneratedImage[]>([
    {
      id: "orbital-initial",
      prompt: "Nova Intent Layer launch visual",
      aspectRatio: "16:9",
      variant: "orbital",
    },
  ])
  const [selectedImage, setSelectedImage] = useState(0)

  // AI Generation status & outputs
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [variations, setVariations] = useState<GeneratedContentVariation[]>([
    {
      id: "var-1",
      title: "Value Proposition",
      content:
        "Cross-chain shouldn't mean cross-your-fingers. Nova's new Intent Layer turns complex routes into one simple outcome — tell the network what you want, and Nova handles the path. Built for users. Designed for builders. Explore the launch ↓",
      platform: "X",
      characterCount: 247,
      hook: "Cross-chain shouldn't mean cross-your-fingers.",
      callToAction: "Explore the launch ↓",
      suggestedHashtags: ["#Web3", "#CrossChain", "#NovaProtocol"],
    },
    {
      id: "var-2",
      title: "Technical Primitive",
      content:
        "The next phase of Nova is live. Our Intent Layer abstracts the complexity of moving across chains, giving developers a cleaner primitive and users a simpler experience. One intent. The best available route. No manual bridging. Read the technical overview ↓",
      platform: "X",
      characterCount: 266,
      hook: "The next phase of Nova is live.",
      callToAction: "Read the technical overview ↓",
      suggestedHashtags: ["#DeFi", "#CryptoDev", "#Rollups"],
    },
    {
      id: "var-3",
      title: "Community & Vision",
      content:
        "What if using 5 chains felt like using one? Nova Intent Layer is now live — coordinating liquidity, routes and execution behind a single user action. Read the technical overview and join the builder waitlist today.",
      platform: "X",
      characterCount: 226,
      hook: "What if using 5 chains felt like using one?",
      callToAction: "join the builder waitlist today.",
      suggestedHashtags: ["#Nova", "#Web3Builders", "#Layer2"],
    },
  ])

  // Active / Selected variation
  const [selectedVariationIndex, setSelectedVariationIndex] = useState(0)

  // Inline editing state
  const [editingVariationId, setEditingVariationId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // Global feedback notification
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null)

  // Drafts management state
  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [draftSearch, setDraftSearch] = useState("")
  const [draftFilter, setDraftFilter] = useState<"All" | "Approved" | "Awaiting review" | "Needs edits">("All")

  // Draft Edit Modal State
  const [activeModalDraft, setActiveModalDraft] = useState<ContentDraft | null>(null)

  // Scheduling Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedDraftToSchedule, setSelectedDraftToSchedule] = useState<string>("")
  const [scheduleDate, setScheduleDate] = useState("2026-03-28")
  const [scheduleTime, setScheduleTime] = useState("14:00")

  // Selected calendar item details modal
  const [viewCalendarItem, setViewCalendarItem] = useState<{
    day: number
    title: string
    platform: string
    content?: string
  } | null>(null)

  // Clear feedback timer
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Load drafts on mount or tab change
  const reloadDrafts = async () => {
    setDraftsLoading(true)
    try {
      const loaded = await ContentStudioService.fetchDrafts("default")
      setDrafts(loaded)
    } catch {
      setDrafts(ContentStudioService.getLocalDrafts())
    } finally {
      setDraftsLoading(false)
    }
  }

  useEffect(() => {
    reloadDrafts()
  }, [])

  // Primary AI Generation Handler
  const generate = async () => {
    if (!topic.trim()) {
      setGenerationError("Please enter a topic or content idea before generating.")
      return
    }

    if (!user) {
      openAuthModal("signin")
      setFeedback({
        message: "Please sign in to generate content using your ChainForge AI credits.",
        type: "info",
      })
      return
    }

    if (creditsBalance < 5) {
      setGenerationError(`Insufficient credits. Generating 3 content variations requires 5 credits (current balance: ${creditsBalance}).`)
      return
    }

    setGenerating(true)
    setGenerationError(null)

    try {
      // 1. Generate text variations via Gemini API
      const result = await ContentStudioService.generate({
        platform,
        contentType,
        topic: topic.trim(),
        tone,
        goal,
        audience,
        additionalInstructions: additionalInstructions.trim() || undefined,
        brandContext: "Nova Protocol",
      })

      setVariations(result.variations)
      setSelectedVariationIndex(0)
      setEditingVariationId(null)

      // Refresh credits balance in header
      await refreshProfile()

      // 2. Generate visuals if requested
      if (includeImage) {
        const generatedImages = await mockNanoBananaService.generate({
          prompt: imagePrompt || `${topic} visual`,
          aspectRatio: "16:9",
          brandContext: "Nova Protocol",
        })
        setImages(generatedImages)
        setSelectedImage(0)
      }

      setFeedback({
        message: "Generated 3 platform-tailored variations with Gemini AI.",
        type: "success",
      })
    } catch (err: unknown) {
      if (err instanceof ContentStudioError) {
        setGenerationError(err.message)
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        setGenerationError(`Generation encountered an issue: ${msg}`)
      }
    } finally {
      setGenerating(false)
    }
  }

  // Copy text to clipboard
  const handleCopy = async (text: string, label: string = "Content") => {
    const success = await ContentStudioService.copyText(text)
    if (success) {
      setFeedback({ message: `${label} copied to clipboard!`, type: "success" })
    } else {
      setFeedback({ message: "Failed to copy to clipboard.", type: "warning" })
    }
  }

  // Save variation as draft
  const handleSaveVariationDraft = async (variation: GeneratedContentVariation) => {
    try {
      const { draft, savedRemotely } = await ContentStudioService.saveDraft({
        title: variation.title || `${platform} ${contentType}`,
        content: variation.content,
        platform,
        approval: "Awaiting review",
        status: "Draft",
        imagePrompt: includeImage ? imagePrompt : undefined,
      })

      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)])
      setFeedback({
        message: savedRemotely
          ? "Draft securely saved to cloud workspace!"
          : "Draft saved to local workspace.",
        type: "success",
      })
    } catch (err) {
      setFeedback({ message: "Could not save draft.", type: "warning" })
    }
  }

  // Approve variation
  const handleApproveVariation = async (variation: GeneratedContentVariation) => {
    try {
      const { draft } = await ContentStudioService.saveDraft({
        title: variation.title || `${platform} ${contentType}`,
        content: variation.content,
        platform,
        approval: "Approved",
        status: "Draft",
        imagePrompt: includeImage ? imagePrompt : undefined,
      })

      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)])
      setFeedback({
        message: "Variation approved and saved to drafts!",
        type: "success",
      })
    } catch (err) {
      setFeedback({ message: "Could not approve variation.", type: "warning" })
    }
  }

  // Start editing variation
  const handleStartEdit = (variation: GeneratedContentVariation) => {
    setEditingVariationId(variation.id)
    setEditText(variation.content)
  }

  // Save edited variation text
  const handleSaveEdit = (variationId: string) => {
    setVariations((prev) =>
      prev.map((v) =>
        v.id === variationId
          ? { ...v, content: editText, characterCount: editText.length }
          : v,
      ),
    )
    setEditingVariationId(null)
    setFeedback({ message: "Variation edits saved.", type: "success" })
  }

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingVariationId(null)
    setEditText("")
  }

  // Export variation as file
  const handleExportVariation = (variation: GeneratedContentVariation) => {
    ContentStudioService.exportToFile(
      variation.title || `${platform}-${contentType}`,
      variation.content,
      platform,
    )
    setFeedback({ message: "Downloaded Markdown content file.", type: "success" })
  }

  // Delete draft
  const handleDeleteDraft = async (draftId: string) => {
    await ContentStudioService.deleteDraft(draftId)
    setDrafts((prev) => prev.filter((d) => d.id !== draftId))
    setFeedback({ message: "Draft removed.", type: "info" })
    if (activeModalDraft?.id === draftId) {
      setActiveModalDraft(null)
    }
  }

  // Update draft from modal
  const handleSaveModalDraft = async () => {
    if (!activeModalDraft) return
    const updated = await ContentStudioService.updateDraft(activeModalDraft.id, {
      title: activeModalDraft.title,
      content: activeModalDraft.content,
      platform: activeModalDraft.platform,
      status: activeModalDraft.status,
      approval: activeModalDraft.approval,
    })
    if (updated) {
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setFeedback({ message: "Draft updated successfully.", type: "success" })
      setActiveModalDraft(null)
    }
  }

  // Schedule a post
  const handleSchedulePost = async () => {
    if (!selectedDraftToSchedule) {
      setFeedback({ message: "Please select a draft to schedule.", type: "warning" })
      return
    }

    const scheduledTimestamp = `${scheduleDate}T${scheduleTime}:00`
    const updated = await ContentStudioService.updateDraft(selectedDraftToSchedule, {
      status: "Scheduled",
      approval: "Approved",
      scheduledFor: scheduledTimestamp,
    })

    if (updated) {
      setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
      setFeedback({
        message: `Post scheduled for ${scheduleDate} at ${scheduleTime}!`,
        type: "success",
      })
      setScheduleModalOpen(false)
      setSelectedDraftToSchedule("")
    }
  }

  // Filtered drafts for Drafts table
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      if (d.status === "Published") return false
      const matchesSearch =
        d.content.toLowerCase().includes(draftSearch.toLowerCase()) ||
        d.title.toLowerCase().includes(draftSearch.toLowerCase()) ||
        d.platform.toLowerCase().includes(draftSearch.toLowerCase()) ||
        d.author.toLowerCase().includes(draftSearch.toLowerCase())

      if (!matchesSearch) return false

      if (draftFilter === "Approved") return d.approval === "Approved"
      if (draftFilter === "Awaiting review") return d.approval === "Awaiting review"
      if (draftFilter === "Needs edits") return d.approval === "Needs edits"
      return true
    })
  }, [drafts, draftSearch, draftFilter])

  // Published drafts for Published tab
  const publishedDrafts = useMemo(() => {
    return drafts.filter((d) => d.status === "Published")
  }, [drafts])

  return (
    <div className="page">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-border bg-[#161b22] px-4 py-3 text-sm text-foreground shadow-2xl backdrop-blur-md animate-fade-in">
          <Icon
            name={feedback.type === "success" ? "check" : feedback.type === "warning" ? "shield" : "sparkles"}
            className={feedback.type === "success" ? "text-success" : feedback.type === "warning" ? "text-warning" : "text-brand"}
          />
          <span>{feedback.message}</span>
        </div>
      )}

      <PageHeading
        title="Content Studio"
        description="Turn live community intelligence into high-converting Web3 content your team can review, edit, and publish."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={tab === "Calendar" ? "primary" : "secondary"}
              icon="calendar"
              onClick={() => setTab("Calendar")}
            >
              Content calendar
            </Button>
            {tab !== "Generate" && (
              <Button icon="sparkles" onClick={() => setTab("Generate")}>
                Create content
              </Button>
            )}
          </div>
        }
      />

      <div className="approval-note">
        <Icon name="shield" />
        <p>
          <strong>Human approval is always required.</strong> AI creates
          editable drafts; nothing is published without your team's review.
        </p>
      </div>

      <Tabs
        items={["Generate", "Drafts", "Calendar", "Published"]}
        active={tab}
        onChange={setTab}
      />

      {/* TAB 1: GENERATE */}
      {tab === "Generate" && (
        <div className="generate-layout">
          {/* Controls Card */}
          <Card className="generation-controls">
            <SectionHeading
              title="Create content"
              description="Set the context for Gemini AI"
            />

            {/* Platform Selection */}
            <Field label="Platform">
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as ContentGenerationRequest["platform"])}
              >
                <option value="X">X (Twitter)</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Telegram">Telegram</option>
                <option value="Discord">Discord</option>
              </Select>
            </Field>

            {/* Content Type Choice Grid */}
            <Field label="Content type">
              <div className="choice-grid">
                {(["Launch post", "Thread", "Update", "Educational"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`choice ${contentType === type ? "active" : ""}`}
                    onClick={() => setContentType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </Field>

            {/* Topic Input */}
            <Field label="Topic or Brief">
              <Input
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value)
                  if (generationError) setGenerationError(null)
                }}
                placeholder="e.g. Nova Intent Layer launch"
              />
              {/* Presets */}
              <div className="mt-2 flex flex-wrap gap-1">
                {PRESET_TOPICS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="text-[10px] text-muted hover:text-brand bg-surface-2 px-2 py-0.5 rounded border border-border transition-colors text-left truncate max-w-full"
                    onClick={() => setTopic(preset)}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </Field>

            {/* Tone & Goal Row */}
            <div className="field-row">
              <Field label="Tone">
                <Select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ContentGenerationRequest["tone"])}
                >
                  <option value="Confident">Confident</option>
                  <option value="Technical">Technical</option>
                  <option value="Conversational">Conversational</option>
                  <option value="Visionary">Visionary</option>
                  <option value="Urgent">Urgent</option>
                </Select>
              </Field>

              <Field label="Goal">
                <Select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as ContentGenerationRequest["goal"])}
                >
                  <option value="Drive awareness">Drive awareness</option>
                  <option value="Educate">Educate</option>
                  <option value="Engage">Engage</option>
                  <option value="Waitlist / Conversion">Waitlist / Conversion</option>
                </Select>
              </Field>
            </div>

            {/* Audience */}
            <Field label="Target Audience">
              <Select
                value={audience}
                onChange={(e) => setAudience(e.target.value as ContentGenerationRequest["audience"])}
              >
                <option value="Web3 builders">Web3 builders</option>
                <option value="Token holders">Token holders</option>
                <option value="DeFi users">DeFi users</option>
                <option value="Enterprise partners">Enterprise partners</option>
              </Select>
            </Field>

            {/* Post Visual Choice Grid */}
            <Field label="Post visual">
              <div className="choice-grid">
                <button
                  type="button"
                  className={`choice ${!includeImage ? "active" : ""}`}
                  onClick={() => setIncludeImage(false)}
                >
                  Text only
                </button>
                <button
                  type="button"
                  className={`choice ${includeImage ? "active" : ""}`}
                  onClick={() => setIncludeImage(true)}
                >
                  <Icon name="sparkles" />
                  Generate image
                </button>
              </div>
            </Field>

            {/* Image Generator Settings */}
            {includeImage && (
              <div className="image-generator-settings">
                <div className="model-label">
                  <span className="nano-mark">
                    <Icon name="sparkles" />
                  </span>
                  <div>
                    <strong>Nano Banana</strong>
                    <small>Gemini image synthesis</small>
                  </div>
                  <Badge tone="brand">Image</Badge>
                </div>

                <Field label="Image prompt">
                  <textarea
                    className="textarea"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    rows={3}
                  />
                </Field>

                <div className="field-row">
                  <Field label="Aspect ratio">
                    <Select defaultValue="16:9">
                      <option value="16:9">16:9 (Landscape)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="4:5">4:5 (Portrait)</option>
                    </Select>
                  </Field>
                  <Field label="Style">
                    <Select defaultValue="Brand editorial">
                      <option value="Brand editorial">Brand editorial</option>
                      <option value="3D abstract">3D abstract</option>
                      <option value="Technical diagram">Technical diagram</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {/* Additional Guidance */}
            <Field label="Additional instructions (Optional)">
              <textarea
                className="textarea"
                placeholder="Include developer waitlist, avoid price speculation, highlight zero-slippage guarantee..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                rows={3}
              />
            </Field>

            {/* Error Message */}
            {generationError && (
              <div className="p-3 text-xs bg-danger/10 border border-danger/30 text-danger rounded-lg flex items-start gap-2">
                <Icon name="shield" className="size-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{generationError}</p>
                  <button
                    type="button"
                    onClick={generate}
                    className="mt-1.5 underline font-medium hover:opacity-80"
                  >
                    Retry generation
                  </button>
                </div>
              </div>
            )}

            {/* Primary Generate Button */}
            <Button
              icon="sparkles"
              className="full-btn"
              onClick={generate}
              disabled={generating || !topic.trim()}
            >
              {generating
                ? includeImage
                  ? "Generating variations & visuals..."
                  : "Generating with Gemini..."
                : includeImage
                  ? "Generate post & image (5 credits)"
                  : "Generate content (5 credits)"}
            </Button>
          </Card>

          {/* Variations Preview Column */}
          <div className="preview-column">
            <div className="preview-header">
              <div>
                <h2>Generated variations</h2>
                <p>Review, edit inline, copy, or approve your preferred direction.</p>
              </div>
              <Badge tone="brand">
                {variations.length} {platform} {variations.length === 1 ? "variation" : "variations"}
              </Badge>
            </div>

            {generating ? (
              <>
                <Card className="loading-card">
                  <span />
                  <span />
                  <span />
                  <span />
                </Card>
                <Card className="loading-card">
                  <span />
                  <span />
                  <span />
                  <span />
                </Card>
              </>
            ) : (
              <>
                {/* Visual Variations Selector */}
                {includeImage && images.length > 1 && (
                  <Card className="image-variations">
                    <div className="image-variations-head">
                      <div>
                        <strong>Nano Banana visuals</strong>
                        <small>Select an artwork variant to pair with the approved post.</small>
                      </div>
                      <Badge tone="brand">{images.length} generated</Badge>
                    </div>
                    <div className="image-variation-grid">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          className={selectedImage === index ? "selected" : ""}
                          onClick={() => setSelectedImage(index)}
                        >
                          <GeneratedVisual variant={image.variant} compact />
                          {selectedImage === index && (
                            <span className="image-selected">
                              <Icon name="check" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Variations List */}
                {variations.map((v, i) => {
                  const isSelected = selectedVariationIndex === i
                  const isEditing = editingVariationId === v.id
                  const charLimit = PLATFORM_LIMITS[platform]?.max || 280

                  return (
                    <Card
                      className={`content-preview ${isSelected ? "selected" : ""}`}
                      key={v.id}
                    >
                      <div className="preview-top">
                        <div className="flex items-center gap-2">
                          <span className={`platform-icon platform-${platform.toLowerCase()}`}>
                            <Icon name={platform === "Telegram" ? "telegram" : platform === "Discord" ? "discord" : "x"} />
                          </span>
                          <div>
                            <strong>Nova Protocol</strong>
                            <small>
                              @{platform === "X" ? "NovaProtocol" : "novaprotocol"} · {v.title || `Variation ${i + 1}`}
                            </small>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {v.suggestedHashtags && v.suggestedHashtags.length > 0 && (
                            <span className="text-[10px] text-muted hidden sm:inline">
                              {v.suggestedHashtags.slice(0, 2).join(" ")}
                            </span>
                          )}
                          <Badge tone={isSelected ? "brand" : "neutral"}>
                            Variation {i + 1}
                          </Badge>
                        </div>
                      </div>

                      {/* Content or Inline Editor */}
                      {isEditing ? (
                        <div className="my-3 space-y-2">
                          <textarea
                            className="textarea w-full"
                            rows={5}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-xs text-muted">
                            <span className={editText.length > charLimit ? "text-danger font-medium" : ""}>
                              {editText.length} / {charLimit} characters
                            </span>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => handleSaveEdit(v.id)}>
                                Save changes
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="my-3 text-sm leading-relaxed whitespace-pre-wrap cursor-pointer"
                          onClick={() => setSelectedVariationIndex(i)}
                        >
                          {v.content}
                        </p>
                      )}

                      {/* Image Visual (if enabled) */}
                      {includeImage && isSelected && images[selectedImage] && (
                        <div className="generated-media">
                          <GeneratedVisual variant={images[selectedImage].variant} />
                          <div className="generated-media-label">
                            <span>
                              <Icon name="sparkles" /> Generated with Nano Banana
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="refresh"
                                onClick={async () => {
                                  const refreshed = await mockNanoBananaService.generate({
                                    prompt: imagePrompt,
                                    aspectRatio: "16:9",
                                    brandContext: "Nova Protocol",
                                  })
                                  setImages(refreshed)
                                }}
                              >
                                Regenerate visual
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Post Meta Bar */}
                      <div className="post-meta">
                        <span className={v.content.length > charLimit ? "text-danger" : ""}>
                          {v.content.length}/{charLimit} characters · {PLATFORM_LIMITS[platform]?.label}
                        </span>
                        <span>AI-generated · Human review required</span>
                      </div>

                      {/* Preview Action Buttons */}
                      <div className="preview-actions flex flex-wrap items-center gap-2 mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="copy"
                          onClick={() => handleCopy(v.content, `Variation ${i + 1}`)}
                        >
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="edit"
                          onClick={() => handleStartEdit(v)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="download"
                          onClick={() => handleExportVariation(v)}
                        >
                          Export
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSaveVariationDraft(v)}
                        >
                          Save draft
                        </Button>
                        <Button
                          size="sm"
                          icon="check"
                          onClick={() => handleApproveVariation(v)}
                        >
                          Approve
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DRAFTS */}
      {tab === "Drafts" && (
        <Card>
          <SectionHeading
            title="Content drafts"
            description="Review, edit, copy, approve, or schedule content before publishing"
            action={
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  icon="search"
                  placeholder="Search drafts by text or platform..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  className="w-64"
                />
                <Select
                  value={draftFilter}
                  onChange={(e) => setDraftFilter(e.target.value as any)}
                  className="w-40"
                >
                  <option value="All">All drafts</option>
                  <option value="Awaiting review">Awaiting review</option>
                  <option value="Approved">Approved</option>
                  <option value="Needs edits">Needs edits</option>
                </Select>
                <Button
                  variant="secondary"
                  icon="plus"
                  onClick={() => setScheduleModalOpen(true)}
                >
                  Schedule post
                </Button>
              </div>
            }
          />

          {draftsLoading ? (
            <div className="p-8 text-center text-sm text-muted">Loading drafts...</div>
          ) : filteredDrafts.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon="content"
                title="No drafts found"
                description={
                  draftSearch || draftFilter !== "All"
                    ? "No content drafts match your search filters."
                    : "You haven't saved any drafts yet. Generate fresh content to get started."
                }
                action={
                  <Button icon="sparkles" onClick={() => setTab("Generate")}>
                    Generate new content
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="table-scroll">
              <div className="draft-table">
                <div className="table-head">
                  <span>Content</span>
                  <span>Platform</span>
                  <span>Status</span>
                  <span>Date</span>
                  <span>Author</span>
                  <span>Approval</span>
                  <span>Actions</span>
                </div>

                {filteredDrafts.map((d) => (
                  <div className="table-row" key={d.id}>
                    <p
                      className="cursor-pointer font-medium hover:text-brand transition-colors truncate"
                      onClick={() => setActiveModalDraft(d)}
                      title={d.content}
                    >
                      {d.content}
                    </p>
                    <Badge tone={d.platform === "X" ? "cyan" : "brand"}>{d.platform}</Badge>
                    <Badge
                      tone={
                        d.status === "Published"
                          ? "success"
                          : d.status === "Scheduled"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {d.status}
                    </Badge>
                    <small className="text-muted text-[10px]">{d.date}</small>
                    <span className="text-[10px]">{d.author}</span>
                    <Badge
                      tone={
                        d.approval === "Approved"
                          ? "success"
                          : d.approval === "Needs edits"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {d.approval}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="copy"
                        title="Copy text"
                        onClick={() => handleCopy(d.content, "Draft")}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="edit"
                        title="Edit draft"
                        onClick={() => setActiveModalDraft(d)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="trash"
                        title="Delete draft"
                        onClick={() => handleDeleteDraft(d.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: CALENDAR */}
      {tab === "Calendar" && (
        <Card>
          <SectionHeading
            title="March 2026"
            description="Interactive content calendar — click any event to inspect or click 'Schedule post' to add an approved draft"
            action={
              <div className="heading-actions flex items-center gap-2">
                <Button variant="secondary" size="icon" icon="chevron" />
                <Button
                  variant="secondary"
                  size="icon"
                  icon="chevron"
                  className="rotate-180"
                />
                <Button icon="plus" onClick={() => setScheduleModalOpen(true)}>
                  Schedule post
                </Button>
              </div>
            }
          />

          <div className="table-scroll">
            <div className="calendar-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <strong key={d}>{d}</strong>
              ))}

              {Array.from({ length: 35 }, (_, i) => i - 2).map((d, i) => {
                const isOutside = d < 1 || d > 31
                const dayNumber = d < 1 ? d + 28 : d > 31 ? d - 31 : d

                // Scheduled posts mapped to days
                const eventDay = [4, 8, 12, 18, 24, 27].includes(d)
                const scheduledForDay = drafts.find(
                  (draft) => draft.status === "Scheduled" && draft.scheduledFor?.includes(`2026-03-${dayNumber < 10 ? "0" + dayNumber : dayNumber}`),
                )

                return (
                  <div key={i} className={isOutside ? "outside" : ""}>
                    <span>{dayNumber}</span>

                    {/* Pre-scheduled mock items */}
                    {!isOutside && eventDay && !scheduledForDay && (
                      <button
                        type="button"
                        className="calendar-event"
                        onClick={() =>
                          setViewCalendarItem({
                            day: dayNumber,
                            title: d === 18 ? "Builder spotlight" : "Nova Protocol update",
                            platform: d % 2 ? "Telegram" : "X",
                            content:
                              d === 18
                                ? "Meet the team building cross-chain intent routers on Nova. Join our live AMA this Thursday at 16:00 UTC."
                                : "Nova Intent Layer benchmark report: 99.4% route execution rate across 6 testnet rollups. Read the data ↓",
                          })
                        }
                      >
                        <Icon name={d % 2 ? "telegram" : "x"} />
                        <span>{d === 18 ? "Builder spotlight" : "Nova update"}</span>
                      </button>
                    )}

                    {/* Real scheduled posts from drafts */}
                    {!isOutside && scheduledForDay && (
                      <button
                        type="button"
                        className="calendar-event"
                        onClick={() =>
                          setViewCalendarItem({
                            day: dayNumber,
                            title: scheduledForDay.title,
                            platform: scheduledForDay.platform,
                            content: scheduledForDay.content,
                          })
                        }
                      >
                        <Icon name={scheduledForDay.platform === "Telegram" ? "telegram" : scheduledForDay.platform === "Discord" ? "discord" : "x"} />
                        <span className="truncate">{scheduledForDay.title}</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: PUBLISHED */}
      {tab === "Published" && (
        <Card>
          <SectionHeading
            title="Published content"
            description="Verified content published to your protocol's official channels"
            action={
              <Button icon="sparkles" onClick={() => setTab("Generate")}>
                Create new post
              </Button>
            }
          />

          {publishedDrafts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">
              <EmptyState
                icon="check"
                title="No published posts yet"
                description="When you approve and publish drafts, their performance and reach will appear here."
                action={
                  <Button variant="secondary" onClick={() => setTab("Drafts")}>
                    Review drafts
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="table-scroll">
              <div className="draft-table">
                <div className="table-head">
                  <span>Content</span>
                  <span>Platform</span>
                  <span>Status</span>
                  <span>Date Published</span>
                  <span>Author</span>
                  <span>Approval</span>
                  <span>Actions</span>
                </div>

                {publishedDrafts.map((d) => (
                  <div className="table-row" key={d.id}>
                    <p className="font-medium truncate">{d.content}</p>
                    <Badge tone="brand">{d.platform}</Badge>
                    <Badge tone="success">Published</Badge>
                    <small className="text-muted text-[10px]">{d.date}</small>
                    <span className="text-[10px]">{d.author}</span>
                    <Badge tone="success">Approved</Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="copy"
                        title="Copy text"
                        onClick={() => handleCopy(d.content, "Published post")}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        icon="download"
                        title="Export file"
                        onClick={() => ContentStudioService.exportToFile(d.title, d.content, d.platform)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* DRAFT EDIT MODAL */}
      {activeModalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-xl border border-border bg-[#0d1117] text-foreground p-6 shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon name="edit" className="text-brand size-5" />
                <h3 className="text-base font-semibold">Edit Content Draft</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalDraft(null)}
                className="text-muted hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Title / Headline">
                <Input
                  value={activeModalDraft.title}
                  onChange={(e) =>
                    setActiveModalDraft({ ...activeModalDraft, title: e.target.value })
                  }
                />
              </Field>

              <Field label="Platform">
                <Select
                  value={activeModalDraft.platform}
                  onChange={(e) =>
                    setActiveModalDraft({ ...activeModalDraft, platform: e.target.value })
                  }
                >
                  <option value="X">X (Twitter)</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Discord">Discord</option>
                </Select>
              </Field>

              <Field label="Draft Copy">
                <textarea
                  className="textarea w-full text-sm"
                  rows={6}
                  value={activeModalDraft.content}
                  onChange={(e) =>
                    setActiveModalDraft({ ...activeModalDraft, content: e.target.value })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select
                    value={activeModalDraft.status}
                    onChange={(e) =>
                      setActiveModalDraft({
                        ...activeModalDraft,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Published">Published</option>
                  </Select>
                </Field>

                <Field label="Approval Stage">
                  <Select
                    value={activeModalDraft.approval}
                    onChange={(e) =>
                      setActiveModalDraft({
                        ...activeModalDraft,
                        approval: e.target.value as any,
                      })
                    }
                  >
                    <option value="Awaiting review">Awaiting review</option>
                    <option value="Approved">Approved</option>
                    <option value="Needs edits">Needs edits</option>
                  </Select>
                </Field>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="danger"
                  size="sm"
                  icon="trash"
                  onClick={() => handleDeleteDraft(activeModalDraft.id)}
                >
                  Delete draft
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveModalDraft(null)}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveModalDraft}>
                    Save changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SCHEDULE POST MODAL */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md border border-border bg-[#0d1117] text-foreground p-6 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon name="calendar" className="text-brand size-5" />
                <h3 className="text-base font-semibold">Schedule Content</h3>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-muted hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Select Draft to Schedule">
                <Select
                  value={selectedDraftToSchedule}
                  onChange={(e) => setSelectedDraftToSchedule(e.target.value)}
                >
                  <option value="">-- Choose an approved draft --</option>
                  {drafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.platform}] {d.title || d.content.slice(0, 36) + "..."}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </Field>
                <Field label="Time (UTC)">
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  icon="check"
                  disabled={!selectedDraftToSchedule}
                  onClick={handleSchedulePost}
                >
                  Confirm schedule
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* CALENDAR ITEM DETAILS MODAL */}
      {viewCalendarItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-md border border-border bg-[#0d1117] text-foreground p-6 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Badge tone="brand">{viewCalendarItem.platform}</Badge>
                <h3 className="text-base font-semibold">{viewCalendarItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewCalendarItem(null)}
                className="text-muted hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-muted">
                Scheduled for: March {viewCalendarItem.day}, 2026 at 14:00 UTC
              </div>
              <p className="text-sm bg-surface-2 p-3 rounded-lg border border-border leading-relaxed whitespace-pre-wrap">
                {viewCalendarItem.content}
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="copy"
                  onClick={() => handleCopy(viewCalendarItem.content || "", "Post")}
                >
                  Copy post
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setViewCalendarItem(null)
                    setFeedback({ message: "Post marked as published!", type: "success" })
                  }}
                >
                  Mark as published
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function GeneratedVisual({
  variant,
  compact = false,
}: {
  variant: GeneratedImage["variant"]
  compact?: boolean
}) {
  return (
    <div
      className={`nano-visual nano-${variant} ${compact ? "compact" : ""}`}
      role="img"
      aria-label="AI-generated Nova Protocol cross-chain network artwork"
    >
      <span className="visual-grid" />
      <span className="visual-orbit orbit-one" />
      <span className="visual-orbit orbit-two" />
      <span className="visual-core">
        <i>N</i>
      </span>
      <span className="visual-node node-one" />
      <span className="visual-node node-two" />
      <span className="visual-node node-three" />
      <span className="visual-caption">
        <small>NOVA PROTOCOL</small>
        <strong>
          ONE INTENT.
          <br />
          ANY CHAIN.
        </strong>
      </span>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
