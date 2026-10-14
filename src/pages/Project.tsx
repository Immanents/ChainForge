import { useState } from "react"

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
}

export default function Project({
  projects,

  activeProject,

  setActiveProjectId,

  createProject,
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
          <span className="nova-logo">{activeProject.name[0]}</span>
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
        <ConnectedState project={activeProject} />
      )}
    </div>
  )
}

function ConnectedState({ project }: { project: ProjectRecord }) {
  return (
    <>
      <div className="project-layout">
        <Card className="project-profile">
          <SectionHeading
            title="Project profile"
            description="Core context used throughout ChainForge"
          />
          <div className="logo-upload">
            <span className="nova-logo large">{project.name[0]}</span>
            <div>
              <strong>Project logo</strong>
              <small>PNG, JPG or SVG · Max 2MB</small>
              <Button variant="secondary" size="sm">
                Change logo
              </Button>
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Project name</span>
              <Input defaultValue={project.name} key={project.id + "name"} />
            </label>
            <label className="field">
              <span>Category</span>
              <Select defaultValue={project.category} key={project.id + "cat"}>
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
              defaultValue={project.description}
              key={project.id + "desc"}
            />
          </label>
          <label className="field">
            <span>Website</span>
            <Input
              defaultValue={project.website}
              icon="globe"
              key={project.id + "web"}
            />
          </label>
          <label className="field">
            <span>Target audience</span>
            <Input
              defaultValue={project.audience}
              key={project.id + "audience"}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Status</span>
              <Select defaultValue={project.status}>
                <option>Production</option>
                <option>Testnet</option>
                <option>Pre-launch</option>
              </Select>
            </label>
            <label className="field">
              <span>Token symbol</span>
              <Input
                defaultValue={project.tokenSymbol}
                key={project.id + "token"}
              />
            </label>
          </div>
          <Button icon="check">Save changes</Button>
        </Card>
        <Card className="project-context">
          <SectionHeading
            title="Token information"
            description="Optional market and ecosystem context"
          />
          <div className="token-summary">
            <span className="nova-logo">{project.name[0]}</span>
            <div>
              <strong>{project.name} Token</strong>
              <small>{project.tokenSymbol || "No token"} · Ethereum</small>
            </div>
            <Badge tone={project.tokenSymbol ? "success" : "neutral"}>
              {project.tokenSymbol ? "Live" : "Not configured"}
            </Badge>
          </div>
          {[
            ["Contract", project.tokenSymbol ? "0x7b4...29Ac" : "—"],

            ["Token type", project.tokenSymbol ? "Utility & governance" : "—"],

            ["Project status", project.status],

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
      <Connections />
    </>
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

  const [error, setError] = useState("")

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
