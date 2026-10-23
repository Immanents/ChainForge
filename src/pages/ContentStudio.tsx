import { useState } from "react"

import { contentDrafts } from "../data/mockData"

import { Icon } from "../components/Icons"

import {
  Badge,
  Button,
  Card,
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

export default function ContentStudio() {
  const [tab, setTab] = useState("Generate")

  const [generating, setGenerating] = useState(false)

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

  const [approved, setApproved] = useState(false)

  const generate = async () => {
    setGenerating(true)

    if (includeImage) {
      const generated = await mockNanoBananaService.generate({
        prompt: imagePrompt,

        aspectRatio: "16:9",

        brandContext: "Nova Protocol",
      })

      setImages(generated)

      setSelectedImage(0)
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 900))
    }

    setGenerating(false)
  }

  return (
    <div className="page">
      <PageHeading
        title="Content Studio"
        description="Turn live community intelligence into content your team can review and publish."
        actions={
          <Button variant="secondary" icon="calendar">
            Content calendar
          </Button>
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
      {tab === "Generate" && (
        <div className="generate-layout">
          <Card className="generation-controls">
            <SectionHeading
              title="Create content"
              description="Set the context for Nova AI"
            />
            <Field label="Platform">
              <Select>
                <option>X</option>
                <option>LinkedIn</option>
                <option>Telegram</option>
                <option>Discord</option>
              </Select>
            </Field>
            <Field label="Content type">
              <div className="choice-grid">
                <button className="choice active">Launch post</button>
                <button className="choice">Thread</button>
                <button className="choice">Update</button>
                <button className="choice">Educational</button>
              </div>
            </Field>
            <Field label="Topic">
              <Input defaultValue="Nova Intent Layer launch" />
            </Field>
            <div className="field-row">
              <Field label="Tone">
                <Select>
                  <option>Confident</option>
                  <option>Technical</option>
                  <option>Conversational</option>
                </Select>
              </Field>
              <Field label="Goal">
                <Select>
                  <option>Drive awareness</option>
                  <option>Educate</option>
                  <option>Engage</option>
                </Select>
              </Field>
            </div>
            <Field label="Audience">
              <Select>
                <option>Web3 builders</option>
                <option>Token holders</option>
                <option>DeFi users</option>
              </Select>
            </Field>
            <Field label="Post visual">
              <div className="choice-grid">
                <button
                  className={`choice ${!includeImage ? "active" : ""}`}
                  onClick={() => setIncludeImage(false)}
                >
                  Text only
                </button>
                <button
                  className={`choice ${includeImage ? "active" : ""}`}
                  onClick={() => setIncludeImage(true)}
                >
                  <Icon name="sparkles" />
                  Generate image
                </button>
              </div>
            </Field>
            {includeImage && (
              <div className="image-generator-settings">
                <div className="model-label">
                  <span className="nano-mark">
                    <Icon name="sparkles" />
                  </span>
                  <div>
                    <strong>Nano Banana</strong>
                    <small>Gemini image generation</small>
                  </div>
                  <Badge tone="brand">Image</Badge>
                </div>
                <Field label="Image prompt">
                  <textarea
                    className="textarea"
                    value={imagePrompt}
                    onChange={(event) => setImagePrompt(event.target.value)}
                    rows={4}
                  />
                </Field>
                <div className="field-row">
                  <Field label="Aspect ratio">
                    <Select defaultValue="16:9">
                      <option>16:9</option>
                      <option>1:1</option>
                      <option>4:5</option>
                    </Select>
                  </Field>
                  <Field label="Style">
                    <Select>
                      <option>Brand editorial</option>
                      <option>3D abstract</option>
                      <option>Technical diagram</option>
                    </Select>
                  </Field>
                </div>
              </div>
            )}
            <Field label="Additional instructions">
              <textarea
                className="textarea"
                placeholder="Include the developer waitlist and avoid price-related language."
                rows={4}
              />
            </Field>
            <Button
              icon="sparkles"
              className="full-btn"
              onClick={generate}
              disabled={generating}
            >
              {generating
                ? includeImage
                  ? "Generating post & image..."
                  : "Generating drafts..."
                : includeImage
                  ? "Generate post & image"
                  : "Generate content"}
            </Button>
          </Card>
          <div className="preview-column">
            <div className="preview-header">
              <div>
                <h2>Generated variations</h2>
                <p>Review, edit and approve your preferred direction.</p>
              </div>
              <Badge tone="brand">3 variations</Badge>
            </div>
            {generating ? (
              <Card className="loading-card">
                <span />
                <span />
                <span />
                <span />
              </Card>
            ) : (
              <>
                {includeImage && images.length > 1 && (
                  <Card className="image-variations">
                    <div className="image-variations-head">
                      <div>
                        <strong>Nano Banana visuals</strong>
                        <small>
                          Select an image to pair with the approved post.
                        </small>
                      </div>
                      <Badge tone="brand">{images.length} generated</Badge>
                    </div>
                    <div className="image-variation-grid">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
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
                {[
                  "Cross-chain shouldn't mean cross-your-fingers. Nova's new Intent Layer turns complex routes into one simple outcome — tell the network what you want, and Nova handles the path. Built for users. Designed for builders. Explore the launch ↓",

                  "The next phase of Nova is live. Our Intent Layer abstracts the complexity of moving across chains, giving developers a cleaner primitive and users a simpler experience. One intent. The best available route. No manual bridging.",

                  "What if using 5 chains felt like using one? Nova Intent Layer is now live — coordinating liquidity, routes and execution behind a single user action. Read the technical overview and join the builder waitlist.",
                ].map((text, i) => (
                  <Card
                    className={`content-preview ${i === 0 ? "selected" : ""}`}
                    key={text}
                  >
                    <div className="preview-top">
                      <div>
                        <span className="platform-icon platform-x">
                          <Icon name="x" />
                        </span>
                        <div>
                          <strong>Nova Protocol</strong>
                          <small>@NovaProtocol · Draft</small>
                        </div>
                      </div>
                      <Badge tone={i === 0 ? "brand" : "neutral"}>
                        Variation {i + 1}
                      </Badge>
                    </div>
                    <p>{text}</p>
                    {includeImage && i === 0 && images[selectedImage] && (
                      <div className="generated-media">
                        <GeneratedVisual
                          variant={images[selectedImage].variant}
                        />
                        <div className="generated-media-label">
                          <span>
                            <Icon name="sparkles" /> Generated with Nano Banana
                          </span>
                          <div>
                            <Button variant="ghost" size="sm" icon="refresh">
                              Regenerate
                            </Button>
                            <Button variant="ghost" size="sm" icon="edit">
                              Edit prompt
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="post-meta">
                      <span>{text.length}/280</span>
                      <span>AI-generated draft</span>
                    </div>
                    <div className="preview-actions">
                      <Button variant="ghost" size="sm" icon="edit">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" icon="refresh">
                        Regenerate
                      </Button>
                      <Button variant="secondary" size="sm">
                        Save draft
                      </Button>
                      {i === 0 && (
                        <Button
                          size="sm"
                          icon="check"
                          onClick={() => setApproved(true)}
                        >
                          {approved ? "Approved" : "Approve"}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      )}
      {tab === "Drafts" && <DraftTable />}
      {tab === "Calendar" && <Calendar />}
      {tab === "Published" && <DraftTable published />}
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

function DraftTable({ published = false }: { published?: boolean }) {
  const rows = published
    ? contentDrafts.filter((x) => x.status === "Published")
    : contentDrafts

  return (
    <Card>
      <SectionHeading
        title={published ? "Published content" : "Content drafts"}
        description={
          published
            ? "Approved content published by your team"
            : "Review, edit and approve content before publishing"
        }
        action={<Input icon="search" placeholder="Search content" />}
      />
      <div className="table-scroll">
        <div className="draft-table">
        <div className="table-head">
          <span>Content</span>
          <span>Platform</span>
          <span>Status</span>
          <span>Created</span>
          <span>Author</span>
          <span>Approval</span>
          <span />
        </div>
        {rows.map((d) => (
          <div className="table-row" key={d.content}>
            <p>{d.content}</p>
            <Badge>{d.platform}</Badge>
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
            <small>{d.date}</small>
            <span>{d.author}</span>
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
            <Button variant="ghost" size="icon" icon="more" />
          </div>
        ))}
        </div>
      </div>
    </Card>
  )
}

function Calendar() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2)

  return (
    <Card>
      <SectionHeading
        title="March 2026"
        description="12 posts scheduled across three platforms"
        action={
          <div className="heading-actions">
            <Button variant="secondary" size="icon" icon="chevron" />
            <Button
              variant="secondary"
              size="icon"
              icon="chevron"
              className="rotate-180"
            />
            <Button icon="plus">Schedule post</Button>
          </div>
        }
      />
      <div className="table-scroll">
        <div className="calendar-grid">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {days.map((d, i) => (
          <div key={i} className={d < 1 || d > 31 ? "outside" : ""}>
            <span>{d < 1 ? d + 28 : d > 31 ? d - 31 : d}</span>
            {[4, 8, 12, 18, 24, 27].includes(d) && (
              <button className="calendar-event">
                <Icon name={d % 2 ? "telegram" : "x"} />
                <span>{d === 18 ? "Builder spotlight" : "Nova update"}</span>
              </button>
            )}
          </div>
        ))}
        </div>
      </div>
    </Card>
  )
}
