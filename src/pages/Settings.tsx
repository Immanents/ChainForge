import { useState } from "react"

import { Icon } from "../components/Icons"

import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  PageHeading,
  SectionHeading,
  Select,
  Tabs,
  Toggle,
} from "../components/ui"

export default function Settings() {
  const [tab, setTab] = useState("Workspace")

  return (
    <div className="page">
      <PageHeading
        title="Settings"
        description="Manage your workspace, team, integrations and AI preferences."
      />
      <Tabs
        items={[
          "Workspace",

          "Project",

          "Team",

          "Notifications",

          "Integrations",

          "AI Configuration",

          "Security",
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "Workspace" && <Workspace />}
      {tab === "Project" && <Workspace project />}
      {tab === "Team" && <Team />}
      {tab === "Notifications" && <Notifications />}
      {tab === "Integrations" && <Integrations />}
      {tab === "AI Configuration" && <AIConfig />}
      {tab === "Security" && <Security />}
    </div>
  )
}

function Workspace({ project = false }: { project?: boolean }) {
  return (
    <Card className="settings-card">
      <SectionHeading
        title={project ? "Project defaults" : "Workspace details"}
        description={
          project
            ? "Configure project-wide defaults"
            : "Update your workspace name and branding"
        }
      />
      <label className="field">
        <span>{project ? "Default project" : "Workspace name"}</span>
        <Input defaultValue={project ? "Nova Protocol" : "Nova Labs"} />
      </label>
      <label className="field">
        <span>{project ? "Reporting timezone" : "Workspace URL"}</span>
        {project ? (
          <Select>
            <option>UTC (Coordinated Universal Time)</option>
          </Select>
        ) : (
          <Input defaultValue="app.chainforge.io/nova-labs" />
        )}
      </label>
      <label className="field">
        <span>{project ? "Default reporting period" : "Description"}</span>
        {project ? (
          <Select>
            <option>Last 30 days</option>
          </Select>
        ) : (
          <textarea
            className="textarea"
            rows={3}
            defaultValue="Growth and community workspace for Nova Protocol."
          />
        )}
      </label>
      <Button>Save changes</Button>
    </Card>
  )
}

function Team() {
  return (
    <Card>
      <SectionHeading
        title="Team members"
        description="Manage who can access this workspace"
        action={<Button icon="plus">Invite member</Button>}
      />
      <div className="team-list">
        {[
          ["Maya Chen", "maya@novaprotocol.xyz", "Owner"],

          ["Alex Morgan", "alex@novaprotocol.xyz", "Admin"],

          ["Sam Rivera", "sam@novaprotocol.xyz", "Editor"],

          ["Priya Shah", "priya@novaprotocol.xyz", "Analyst"],
        ].map((x) => (
          <div key={x[1]}>
            <Avatar name={x[0]} />
            <div>
              <strong>{x[0]}</strong>
              <small>{x[1]}</small>
            </div>
            <Badge>{x[2]}</Badge>
            <Button variant="ghost" size="icon" icon="more" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function Notifications() {
  return (
    <Card className="settings-card">
      <SectionHeading
        title="Notification preferences"
        description="Choose what deserves your attention"
      />
      {[
        [
          "Critical community alerts",

          "Immediate alerts for fast-moving risks",

          true,
        ],

        ["KOL mentions", "When a high-relevance KOL mentions Nova", true],

        ["Content approvals", "When a draft is ready for your review", true],

        ["Campaign milestones", "Campaign progress and KPI thresholds", false],

        [
          "Weekly intelligence digest",

          "Monday summary of community and growth",

          true,
        ],
      ].map((x) => (
        <div className="setting-row" key={x[0] as string}>
          <div>
            <strong>{x[0]}</strong>
            <span>{x[1]}</span>
          </div>
          <Toggle active={x[2] as boolean} />
        </div>
      ))}
    </Card>
  )
}

function Integrations() {
  return (
    <div className="integration-list">
      {[
        [
          "X",

          "Community mentions, content performance and publishing",

          "Connected",
        ],

        ["Telegram", "Group activity, topics and sentiment", "Connected"],

        ["Discord", "Channel activity, questions and feedback", "Connected"],
      ].map((x) => (
        <Card key={x[0]}>
          <span className="integration-icon">
            <Icon
              name={
                x[0] === "X"
                  ? "x"
                  : x[0].toLowerCase() as "telegram" | "discord"
              }
            />
          </span>
          <div>
            <h3>{x[0]}</h3>
            <p>{x[1]}</p>
            <Badge tone="success">{x[2]}</Badge>
          </div>
          <Button variant="secondary">Manage</Button>
        </Card>
      ))}
    </div>
  )
}

function AIConfig() {
  return (
    <div className="settings-stack">
      <Card className="settings-card">
        <SectionHeading
          title="AI generation preferences"
          description="Set the defaults Nova AI uses when creating drafts"
        />
        <label className="field">
          <span>Default tone</span>
          <Select>
            <option>Confident and clear</option>
            <option>Technical</option>
            <option>Conversational</option>
          </Select>
        </label>
        <label className="field">
          <span>Content preferences</span>
          <textarea
            className="textarea"
            rows={4}
            defaultValue="Prioritize technical credibility. Avoid hype, price language and unsubstantiated claims. Keep posts direct and useful."
          />
        </label>
        <div className="setting-row">
          <div>
            <strong>Use community intelligence</strong>
            <span>Ground drafts in current community topics and questions</span>
          </div>
          <Toggle active />
        </div>
      </Card>
      <Card className="settings-card">
        <SectionHeading
          title="Approval requirements"
          description="Keep your team in control of what gets published"
        />
        {[
          [
            "Require approval before publishing",

            "All AI-generated content must be approved by a team member",

            true,
          ],

          [
            "Require admin approval for campaigns",

            "Campaign content needs an admin review",

            true,
          ],

          [
            "Allow direct scheduling after approval",

            "Approved drafts can be added to the content calendar",

            true,
          ],
        ].map((x) => (
          <div className="setting-row" key={x[0] as string}>
            <div>
              <strong>{x[0]}</strong>
              <span>{x[1]}</span>
            </div>
            <Toggle active={x[2] as boolean} />
          </div>
        ))}
      </Card>
    </div>
  )
}

function Security() {
  return (
    <div className="settings-stack">
      <Card className="settings-card">
        <SectionHeading
          title="Active sessions"
          description="Devices currently signed in to your account"
        />
        {[
          ["Chrome on macOS", "San Francisco, US · Current session"],

          ["Safari on iPhone", "San Francisco, US · 2 hours ago"],
        ].map((x, i) => (
          <div className="session-row" key={x[0]}>
            <span>
              <Icon name="shield" />
            </span>
            <div>
              <strong>{x[0]}</strong>
              <small>{x[1]}</small>
            </div>
            {i === 0 ? (
              <Badge tone="success">Current</Badge>
            ) : (
              <Button variant="ghost" size="sm">
                Revoke
              </Button>
            )}
          </div>
        ))}
      </Card>
      <Card className="settings-card">
        <SectionHeading
          title="Team permissions"
          description="Default access level for new workspace members"
        />
        <label className="field">
          <span>New member role</span>
          <Select>
            <option>Analyst — view and export</option>
            <option>Editor — create and edit</option>
          </Select>
        </label>
        <div className="setting-row">
          <div>
            <strong>Require two-factor authentication</strong>
            <span>Enforce 2FA for all workspace members</span>
          </div>
          <Toggle />
        </div>
        <Button>Save security settings</Button>
      </Card>
    </div>
  )
}
