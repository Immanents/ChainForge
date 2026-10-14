import { useState } from "react"
import { campaigns } from "../data/mockData"
import { AreaChart } from "../components/Charts"
import { Icon } from "../components/Icons"
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeading,
  Progress,
  SectionHeading,
  Select,
  Tabs,
} from "../components/ui"

type Campaign = typeof campaigns[number]
export default function Campaigns() {
  const [view, setView] = useState<"list" | "create" | "detail">("list")
  const [selected, setSelected] = useState<Campaign>(campaigns[0])
  if (view === "create") return <CreateCampaign back={() => setView("list")} />
  if (view === "detail")
    return <CampaignDetail campaign={selected} back={() => setView("list")} />
  return (
    <div className="page">
      <PageHeading
        title="Campaigns"
        description="Plan, coordinate and measure every growth initiative."
        actions={
          <Button icon="plus" onClick={() => setView("create")}>
            Create campaign
          </Button>
        }
      />
      <div className="campaign-overview">
        <Card>
          <span>Active campaigns</span>
          <strong>2</strong>
          <small>Across 3 platforms</small>
        </Card>
        <Card>
          <span>Total reach</span>
          <strong>1.68M</strong>
          <small className="text-success">+24.8% this month</small>
        </Card>
        <Card>
          <span>Avg. engagement</span>
          <strong>10.6%</strong>
          <small className="text-success">+2.1% vs target</small>
        </Card>
        <Card>
          <span>Budget utilization</span>
          <strong>64%</strong>
          <small>$52.4K of $82K</small>
        </Card>
      </div>
      <Card>
        <SectionHeading
          title="All campaigns"
          description="5 campaigns · 2 currently active"
          action={
            <div className="inline-filters">
              <Input icon="search" placeholder="Search campaigns" />
              <Select>
                <option>All statuses</option>
                <option>Active</option>
                <option>Draft</option>
              </Select>
            </div>
          }
        />
        <div className="campaign-table table-scroll">
          <div className="table-head">
            <span>Campaign</span>
            <span>Status</span>
            <span>Timeline</span>
            <span>Goal</span>
            <span>Budget</span>
            <span>Reach</span>
            <span>Engagement</span>
            <span>Progress</span>
          </div>
          {campaigns.map((c) => (
            <button
              className="table-row"
              key={c.name}
              onClick={() => {
                setSelected(c)
                setView("detail")
              }}
            >
              <div>
                <span className="campaign-symbol">
                  <Icon name="campaigns" />
                </span>
                <strong>{c.name}</strong>
              </div>
              <Badge
                tone={
                  c.status === "Active"
                    ? "success"
                    : c.status === "Paused"
                      ? "warning"
                      : c.status === "Completed"
                        ? "info"
                        : "neutral"
                }
              >
                {c.status}
              </Badge>
              <small>{c.dates}</small>
              <span>{c.goal}</span>
              <strong>{c.budget}</strong>
              <span>{c.reach}</span>
              <span>{c.engagement}</span>
              <div>
                <Progress value={c.progress} />
                <small>{c.progress}%</small>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function CreateCampaign({ back }: { back: () => void }) {
  return (
    <div className="page narrow-page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" className="rotate-180" /> Back to campaigns
      </button>
      <PageHeading
        title="Create campaign"
        description="Define the strategy, audience and measurement plan for your initiative."
      />
      <Card className="form-card">
        <SectionHeading
          title="Campaign basics"
          description="Give your campaign a clear identity and objective"
        />
        <label className="field">
          <span>Campaign name</span>
          <Input placeholder="e.g. Nova Ecosystem Week" />
        </label>
        <label className="field">
          <span>Objective</span>
          <Select>
            <option>Select an objective</option>
            <option>Product awareness</option>
            <option>Developer adoption</option>
            <option>Community growth</option>
          </Select>
        </label>
        <label className="field">
          <span>Target audience</span>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Describe the people this campaign should reach..."
          />
        </label>
      </Card>
      <Card className="form-card">
        <SectionHeading title="Channels & timeline" />
        <div className="field">
          <span>Platforms</span>
          <div className="platform-choices">
            {["X", "Telegram", "Discord"].map((x) => (
              <button className="choice active" key={x}>
                <Icon
                  name={
                    x === "X" ? "x" : x.toLowerCase() as "telegram" | "discord"
                  }
                />
                {x}
                <Icon name="check" />
              </button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Start date</span>
            <Input type="date" />
          </label>
          <label className="field">
            <span>End date</span>
            <Input type="date" />
          </label>
        </div>
      </Card>
      <Card className="form-card">
        <SectionHeading title="Strategy & measurement" />
        <label className="field">
          <span>Content strategy</span>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Outline key messages, formats and publishing cadence..."
          />
        </label>
        <label className="field">
          <span>KOLs</span>
          <Select>
            <option>Select tracked KOLs</option>
            <option>Aisha Chen</option>
            <option>Marcus Vale</option>
          </Select>
        </label>
        <div className="field">
          <span>Primary KPIs</span>
          <div className="choice-grid three">
            <button className="choice active">Reach</button>
            <button className="choice active">Engagement</button>
            <button className="choice">Members</button>
          </div>
        </div>
      </Card>
      <div className="form-actions">
        <Button variant="ghost" onClick={back}>
          Cancel
        </Button>
        <Button variant="secondary">Save draft</Button>
        <Button onClick={back}>Create campaign</Button>
      </div>
    </div>
  )
}

function CampaignDetail({
  campaign,
  back,
}: {
  campaign: Campaign
  back: () => void
}) {
  const [tab, setTab] = useState("Performance")
  return (
    <div className="page">
      <button className="back-link" onClick={back}>
        <Icon name="arrow" className="rotate-180" /> All campaigns
      </button>
      <PageHeading
        title={campaign.name}
        description={`${campaign.dates} · ${campaign.goal}`}
        actions={
          <>
            <Badge tone="success">{campaign.status}</Badge>
            <Button variant="secondary" icon="edit">
              Edit
            </Button>
            <Button variant="secondary" icon="pause">
              Pause
            </Button>
          </>
        }
      />
      <Tabs
        items={[
          "Performance",
          "Content",
          "KOL activity",
          "Community response",
          "Timeline",
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="campaign-detail-kpis">
        {[
          ["Reach", campaign.reach, "+18.4%"],
          ["Engagement", campaign.engagement, "+2.8%"],
          ["Mentions", "4,820", "+32.1%"],
          ["Conversions", "18,420", "+14.6%"],
        ].map((x) => (
          <Card key={x[0]}>
            <span>{x[0]}</span>
            <strong>{x[1]}</strong>
            <Badge tone="success">{x[2]}</Badge>
          </Card>
        ))}
      </div>
      <div className="two-col wide-left">
        <Card>
          <SectionHeading
            title="Campaign performance"
            description="Reach and engagement over time"
          />
          <AreaChart />
        </Card>
        <Card>
          <SectionHeading title="Progress to goals" />
          <div className="goal-list">
            {[
              ["Reach", "1.2M", "1.5M", 80],
              ["Engagements", "104K", "120K", 87],
              ["New members", "8.4K", "12K", 70],
            ].map((g) => (
              <div key={g[0]}>
                <div>
                  <span>{g[0]}</span>
                  <strong>
                    {g[1]} <small>/ {g[2]}</small>
                  </strong>
                </div>
                <Progress value={g[3] as number} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
