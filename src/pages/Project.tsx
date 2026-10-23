import { useState, useEffect, useRef } from "react"

import { Icon } from "../components/Icons"

import {
  Badge,
  Button,
  Card,
  Input,
  PageHeading,
  SectionHeading,
  Select,
} from "../components/ui"

import { exportProject, type ProjectRecord } from "../data/projects"

type Props = {
  projects: ProjectRecord[]

  activeProject: ProjectRecord

  setActiveProjectId: (id: string) => void

  createProject: (project: ProjectRecord) => void

  updateProject?: (project: ProjectRecord) => void
}

export default function Project({
  projects,

  activeProject,

  setActiveProjectId,

  createProject,

  updateProject,
}: Props) {
  const [view, setView] = useState<"connected" | "setup" | "create">(
    "connected",
  )

  if (view === "create") {
    return (
      <CreateProject
        cancel={() => setView("connected")}
        create={(project) => {
          createProject(project)

          setView("connected")
        }}
      />
    )
  }

  return (
    <div className="page">
      <PageHeading
        title="Project"
        description={`Manage ${activeProject.name}'s identity, context and connected data sources.`}
        actions={
          <>
            <Select
              value={activeProject.id}
              onChange={(event) => setActiveProjectId(event.target.value)}
              aria-label="Switch project"
            >
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => exportProject(activeProject)}
            >
              Export
            </Button>
            <Button icon="plus" onClick={() => setView("create")}>
              Create project
            </Button>
          </>
        }
      />
      <div className="project-toolbar">
        <div>
          {activeProject.logoUrl ? (
            <img
              src={activeProject.logoUrl}
              alt={activeProject.name}
              className="nova-logo object-cover"
            />
          ) : (
            <span className="nova-logo">{activeProject.name[0]}</span>
          )}
          <div>
            <strong>{activeProject.name}</strong>
            <small>
              {activeProject.status} · {activeProject.category}
            </small>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => setView(view === "setup" ? "connected" : "setup")}
        >
          {view === "setup" ? "View project profile" : "View onboarding"}
        </Button>
      </div>
      {view === "setup" ? (
        <SetupState project={activeProject} done={() => setView("connected")} />
      ) : (
        <ConnectedState project={activeProject} updateProject={updateProject} />
      )}
    </div>
  )
}

function ConnectedState({
  project,
  updateProject,
}: {
  project: ProjectRecord
  updateProject?: (project: ProjectRecord) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(project.name)
  const [category, setCategory] = useState(project.category)
  const [description, setDescription] = useState(project.description)
  const [website, setWebsite] = useState(project.website)
  const [audience, setAudience] = useState(project.audience)
  const [status, setStatus] = useState<ProjectRecord["status"]>(project.status)
  const [tokenSymbol, setTokenSymbol] = useState(project.tokenSymbol)
  const [logoUrl, setLogoUrl] = useState(project.logoUrl || "")
  const [uploadError, setUploadError] = useState("")
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState("")

  useEffect(() => {
    setName(project.name)
    setCategory(project.category)
    setDescription(project.description)
    setWebsite(project.website)
    setAudience(project.audience)
    setStatus(project.status)
    setTokenSymbol(project.tokenSymbol)
    setLogoUrl(project.logoUrl || "")
    setUploadError("")
    setSavedSuccess(false)
  }, [project.id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image must be smaller than 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image (PNG, JPG, SVG, WebP)")
      return
    }

    setUploadError("")
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        setLogoUrl(dataUrl)
        if (updateProject) {
          updateProject({
            ...project,
            name,
            category,
            description,
            website,
            audience,
            status,
            tokenSymbol,
            logoUrl: dataUrl,
          })
          setSavedSuccess(true)
          setTimeout(() => setSavedSuccess(false), 3000)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoUrl("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (updateProject) {
      updateProject({
        ...project,
        name,
        category,
        description,
        website,
        audience,
        status,
        tokenSymbol,
        logoUrl: undefined,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  const handleApplyUrl = () => {
    if (!customUrl.trim()) return
    setLogoUrl(customUrl.trim())
    setShowUrlInput(false)
    if (updateProject) {
      updateProject({
        ...project,
        name,
        category,
        description,
        website,
        audience,
        status,
        tokenSymbol,
        logoUrl: customUrl.trim(),
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  const handleSaveChanges = () => {
    if (updateProject) {
      updateProject({
        ...project,
        name: name.trim() || project.name,
        category,
        description: description.trim(),
        website: website.trim(),
        audience: audience.trim(),
        status,
        tokenSymbol: tokenSymbol.trim().toUpperCase(),
        logoUrl: logoUrl || undefined,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  return (
    <>
      <div className="project-layout">
        <Card className="project-profile">
          <SectionHeading
            title="Project profile"
            description="Core context used throughout ChainForge"
          />
          <div className="logo-upload">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="nova-logo large object-cover"
              />
            ) : (
              <span className="nova-logo large">{name ? name[0] : project.name[0]}</span>
            )}
            <div>
              <strong>Project logo</strong>
              <small>PNG, JPG, SVG or WebP · Max 2MB</small>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload logo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                >
                  {showUrlInput ? "Cancel URL" : "Image URL"}
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </Button>
                )}
              </div>
              {uploadError && (
                <p className="text-[10px] text-red-400 mt-1">{uploadError}</p>
              )}
              {showUrlInput && (
                <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
                  <Input
                    placeholder="https://... or ipfs://..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="text-xs py-1"
                  />
                  <Button size="sm" onClick={handleApplyUrl}>
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Project name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Category</span>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Infrastructure</option>
                <option>DeFi</option>
                <option>L2</option>
                <option>Gaming</option>
                <option>NFT</option>
              </Select>
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea
              className="textarea"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Website</span>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              icon="globe"
            />
          </label>
          <label className="field">
            <span>Target audience</span>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Status</span>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectRecord["status"])}
              >
                <option>Production</option>
                <option>Testnet</option>
                <option>Pre-launch</option>
              </Select>
            </label>
            <label className="field">
              <span>Token symbol</span>
              <Input
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
              />
            </label>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button icon="check" onClick={handleSaveChanges}>
              Save changes
            </Button>
            {savedSuccess && (
              <Badge tone="success">
                ✓ Changes saved successfully!
              </Badge>
            )}
          </div>
        </Card>
        <Card className="project-context">
          <SectionHeading
            title="Token information"
            description="Optional market and ecosystem context"
          />
          <div className="token-summary">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="nova-logo object-cover"
              />
            ) : (
              <span className="nova-logo">{name ? name[0] : project.name[0]}</span>
            )}
            <div>
              <strong>{name} Token</strong>
              <small>{tokenSymbol || "No token"} · Ethereum</small>
            </div>
            <Badge tone={tokenSymbol ? "success" : "neutral"}>
              {tokenSymbol ? "Live" : "Not configured"}
            </Badge>
          </div>
          {[
            ["Contract", tokenSymbol ? "0x7b4...29Ac" : "—"],

            ["Token type", tokenSymbol ? "Utility & governance" : "—"],

            ["Project status", status],

            ["Created", new Date(project.createdAt).toLocaleDateString()],
          ].map((item) => (
            <div className="detail-row" key={item[0]}>
              <span>{item[0]}</span>
              <strong>{item[1]}</strong>
            </div>
          ))}
          <SectionHeading title="Social links" />
          {[
            ["X", "Connect account"],

            ["Discord", "Connect server"],

            ["Telegram", "Connect group"],
          ].map((item) => (
            <div className="social-link" key={item[0]}>
              <Icon
                name={
                  item[0] === "X"
                    ? "x"
                    : item[0].toLowerCase() as "discord" | "telegram"
                }
              />
              <span>{item[1]}</span>
              <Button variant="ghost" size="sm">
                Configure
              </Button>
            </div>
          ))}
        </Card>
      </div>

      <DeploymentsRegistry projectId={project.id} />

      <Connections />
    </>
  )
}

function DeploymentsRegistry({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/deployments")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDeployments(data)
      })
      .catch((err) => console.warn("Failed to load deployments:", err))
      .finally(() => setLoading(false))
  }, [projectId])

  return (
    <Card className="settings-card mt-6">
      <SectionHeading
        title="On-chain Contract Deployments"
        description="Verified deployments across EVM networks and Solana clusters"
      />
      {loading ? (
        <p className="text-xs text-muted py-4">Loading deployment records...</p>
      ) : deployments.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted">
          No on-chain contracts or tokens deployed for this project yet. Use the Build Engine or Token Studio to deploy.
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2.5">Contract Name</th>
                <th className="py-2.5">Network</th>
                <th className="py-2.5">Environment</th>
                <th className="py-2.5">Deployed Address</th>
                <th className="py-2.5">Transaction</th>
                <th className="py-2.5">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {deployments.map((d, i) => (
                <tr key={i} className="hover:bg-muted/10">
                  <td className="py-2.5 font-semibold text-foreground">
                    {d.contract_name || "Contract"}
                  </td>
                  <td className="py-2.5">{d.network_name}</td>
                  <td className="py-2.5">
                    <Badge tone={d.environment === "mainnet" ? "danger" : "success"}>
                      {d.environment}
                    </Badge>
                  </td>
                  <td className="py-2.5 font-mono text-brand">
                    {d.contract_address.slice(0, 8)}...{d.contract_address.slice(-6)}
                  </td>
                  <td className="py-2.5 font-mono text-muted">
                    {d.explorer_url ? (
                      <a href={d.explorer_url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                        {d.tx_hash.slice(0, 10)}...
                      </a>
                    ) : (
                      `${d.tx_hash.slice(0, 10)}...`
                    )}
                  </td>
                  <td className="py-2.5">
                    <Badge tone="success">
                      {d.verification_status || "Verified"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function CreateProject({
  cancel,

  create,
}: {
  cancel: () => void

  create: (project: ProjectRecord) => void
}) {
  const [name, setName] = useState("")

  const [description, setDescription] = useState("")

  const [website, setWebsite] = useState("")

  const [category, setCategory] = useState("Infrastructure")

  const [audience, setAudience] = useState("")

  const [status, setStatus] = useState<ProjectRecord["status"]>("Pre-launch")

  const [tokenSymbol, setTokenSymbol] = useState("")

  const [logoUrl, setLogoUrl] = useState("")

  const [logoError, setLogoError] = useState("")

  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false)

  const [logoUrlValue, setLogoUrlValue] = useState("")

  const [error, setError] = useState("")

  const newProjectFileInputRef = useRef<HTMLInputElement>(null)

  const handleNewProjectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image must be smaller than 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setLogoError("Please select a valid image")
      return
    }

    setLogoError("")
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) setLogoUrl(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const submit = () => {
    if (!name.trim()) {
      setError("Add a project name to continue.")

      return
    }

    create({
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,

      name: name.trim(),

      description: description.trim(),

      website: website.trim(),

      category,

      audience: audience.trim(),

      status,

      tokenSymbol: tokenSymbol.trim().toUpperCase(),

      createdAt: new Date().toISOString(),

      logoUrl: logoUrl || undefined,
    })
  }

  return (
    <div className="page narrow-page">
      <button className="back-link" onClick={cancel}>
        <Icon name="arrow" className="rotate-180" /> Back to project
      </button>
      <PageHeading
        title="Create a project"
        description="Set up a new Web3 workspace. You can connect platforms after creation."
      />
      <Card className="form-card">
        <SectionHeading
          title="Project identity"
          description="This information can be edited and exported later."
        />
        <div className="logo-upload mb-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Project logo"
              className="nova-logo large object-cover"
            />
          ) : (
            <span className="nova-logo large">{name ? name[0] : "P"}</span>
          )}
          <div>
            <strong>Project logo (optional)</strong>
            <small>PNG, JPG, SVG or WebP · Max 2MB</small>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="file"
                ref={newProjectFileInputRef}
                onChange={handleNewProjectLogo}
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => newProjectFileInputRef.current?.click()}
              >
                Upload logo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
              >
                {showLogoUrlInput ? "Cancel URL" : "Image URL"}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoUrl("")}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </Button>
              )}
            </div>
            {logoError && <p className="text-[10px] text-red-400 mt-1">{logoError}</p>}
            {showLogoUrlInput && (
              <div className="flex items-center gap-2 mt-2 w-full max-w-sm">
                <Input
                  placeholder="https://... or ipfs://..."
                  value={logoUrlValue}
                  onChange={(e) => setLogoUrlValue(e.target.value)}
                  className="text-xs py-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (logoUrlValue.trim()) {
                      setLogoUrl(logoUrlValue.trim())
                      setShowLogoUrlInput(false)
                    }
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Project name</span>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)

                setError("")
              }}
              placeholder="e.g. Atlas Network"
              aria-invalid={Boolean(error)}
            />
            {error && <small className="field-error">{error}</small>}
          </label>
          <label className="field">
            <span>Category</span>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>Infrastructure</option>
              <option>DeFi</option>
              <option>L2</option>
              <option>Gaming</option>
              <option>NFT</option>
            </Select>
          </label>
        </div>
        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does this project do and why does it matter?"
          />
        </label>
        <label className="field">
          <span>Website</span>
          <Input
            icon="globe"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://"
          />
        </label>
        <label className="field">
          <span>Target audience</span>
          <Input
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="Developers, DeFi users, protocol teams..."
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Project status</span>
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProjectRecord["status"])
              }
            >
              <option>Pre-launch</option>
              <option>Testnet</option>
              <option>Production</option>
            </Select>
          </label>
          <label className="field">
            <span>Token symbol (optional)</span>
            <Input
              value={tokenSymbol}
              onChange={(event) => setTokenSymbol(event.target.value)}
              placeholder="TOKEN"
            />
          </label>
        </div>
      </Card>
      <div className="form-actions">
        <Button variant="ghost" onClick={cancel}>
          Cancel
        </Button>
        <Button icon="plus" onClick={submit}>
          Create project
        </Button>
      </div>
    </div>
  )
}

function Connections() {
  return (
    <Card>
      <SectionHeading
        title="Platform connections"
        description="Connected sources power community intelligence and analytics"
        action={
          <Button variant="secondary" icon="plus">
            Add connection
          </Button>
        }
      />
      <div className="connection-grid">
        {[
          ["X", "Connected", "Last synced 2 min ago"],

          ["Telegram", "Connected", "3 groups monitored"],

          ["Discord", "Connected", "12 channels monitored"],

          ["Website", "Connected", "Analytics active"],
        ].map((item, index) => (
          <div className="connection-card" key={item[0]}>
            <span className={`connection-icon c${index}`}>
              <Icon
                name={
                  item[0] === "X"
                    ? "x"
                    : item[0] === "Website"
                      ? "globe"
                      : item[0].toLowerCase() as "telegram" | "discord"
                }
              />
            </span>
            <div>
              <strong>{item[0]}</strong>
              <small>{item[2]}</small>
            </div>
            <Badge tone="success">
              <span className="status-dot" /> {item[1]}
            </Badge>
            <Button variant="ghost" size="icon" icon="more" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function SetupState({
  project,

  done,
}: {
  project: ProjectRecord

  done: () => void
}) {
  return (
    <Card className="setup-card">
      <span className="setup-graphic">
        <Icon name="project" />
      </span>
      <Badge tone="brand">Step 1 of 3</Badge>
      <h2>Set up {project.name}</h2>
      <p>
        Add your project context and connect the communities you want ChainForge
        to understand. You can change this at any time.
      </p>
      <div className="setup-steps">
        <div className="active">
          <span>1</span>
          <div>
            <strong>Project details</strong>
            <small>Name, description and category</small>
          </div>
          <Icon name="check" />
        </div>
        <div>
          <span>2</span>
          <div>
            <strong>Connect platforms</strong>
            <small>X, Telegram and Discord</small>
          </div>
        </div>
        <div>
          <span>3</span>
          <div>
            <strong>Configure intelligence</strong>
            <small>Topics, alerts and reporting</small>
          </div>
        </div>
      </div>
      <Button onClick={done}>
        Continue setup <Icon name="arrow" />
      </Button>
    </Card>
  )
}
