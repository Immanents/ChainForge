import { alerts, campaigns, contentDrafts, kols, kpis } from "../data/mockData"

import { AreaChart, DonutChart, Sparkline } from "../components/Charts"

import { Icon, type IconName } from "../components/Icons"

import {
  Avatar,
  Badge,
  Button,
  Card,
  PageHeading,
  Progress,
  SectionHeading,
  Select,
} from "../components/ui"

export default function Overview({
  navigate,
}: {
  navigate: (page: string) => void
}) {
  return (
    <div className="page">
      <PageHeading
        title="Overview"
        description="Your live growth intelligence for Nova Protocol."
        actions={
          <>
            <Select defaultValue="30">
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button variant="secondary" icon="refresh">
              Refresh
            </Button>
          </>
        }
      />
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <Card className="kpi-card" key={kpi.label}>
            <div className="kpi-top">
              <span className="kpi-icon">
                <Icon name={kpi.icon as IconName} />
              </span>
              <Badge tone="success">{kpi.change}</Badge>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-bottom">
              <span>{kpi.note}</span>
              <Sparkline data={kpi.data} />
            </div>
          </Card>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card className="span-2 chart-card">
          <SectionHeading
            title="Community growth"
            description="Total members across all connected platforms"
            action={
              <button
                className="text-action"
                onClick={() => navigate("Analytics")}
              >
                View analytics <Icon name="arrow" />
              </button>
            }
          />
          <div className="chart-summary">
            <strong>128,420</strong>
            <Badge tone="success">+8.4%</Badge>
            <span>+9,842 this period</span>
          </div>
          <AreaChart />
        </Card>
        <Card>
          <SectionHeading
            title="Sentiment"
            description="Across 6,284 mentions"
          />
          <DonutChart />
          <div className="insight-line">
            <Icon name="sparkles" />
            <p>
              <strong>Sentiment is improving.</strong> Product launch
              conversations are driving positive mentions.
            </p>
          </div>
        </Card>
        <Card className="span-2">
          <SectionHeading
            title="Community intelligence"
            description="What needs your attention right now"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("Community")}
              >
                View all
              </Button>
            }
          />
          <div className="alert-list">
            {alerts.slice(0, 3).map((a, i) => (
              <div className="alert-row" key={a.title}>
                <span
                  className={`alert-icon alert-${
                    i === 1 ? "danger" : i === 0 ? "success" : "brand"
                  }`}
                >
                  <Icon
                    name={i === 1 ? "activity" : i === 0 ? "trend" : "kols"}
                  />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.description}</p>
                </div>
                <span className="alert-meta">
                  <Badge
                    tone={i === 1 ? "danger" : i === 0 ? "success" : "brand"}
                  >
                    {a.severity}
                  </Badge>
                  <small>{a.time}</small>
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading
            title="Activity by platform"
            description="Share of active conversations"
          />
          <div className="platform-list">
            {[
              ["X", "52%", 52],

              ["Discord", "28%", 28],

              ["Telegram", "15%", 15],

              ["Website", "5%", 5],
            ].map(([name, val, width]) => (
              <div key={name as string}>
                <div>
                  <span
                    className={`platform-icon platform-${String(name).toLowerCase()}`}
                  >
                    <Icon
                      name={
                        name === "X"
                          ? "x"
                          : name === "Discord"
                            ? "discord"
                            : name === "Telegram"
                              ? "telegram"
                              : "globe"
                      }
                    />
                  </span>
                  <strong>{name}</strong>
                  <span>{val}</span>
                </div>
                <Progress value={width as number} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading
            title="Content pipeline"
            description="Drafts, approvals and publishing"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("Content Studio")}
              >
                Open studio
              </Button>
            }
          />
          <div className="metric-strip">
            <div>
              <strong>8</strong>
              <span>Drafts</span>
            </div>
            <div>
              <strong>3</strong>
              <span>In review</span>
            </div>
            <div>
              <strong>12</strong>
              <span>Scheduled</span>
            </div>
          </div>
          <div className="compact-list">
            {contentDrafts.slice(0, 2).map((d) => (
              <div key={d.content}>
                <span className="platform-icon platform-x">
                  <Icon name={d.platform === "Telegram" ? "telegram" : "x"} />
                </span>
                <div>
                  <p>{d.content}</p>
                  <small>
                    {d.approval} · {d.date}
                  </small>
                </div>
                <Icon name="chevron" />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading
            title="KOL discoveries"
            description="High-relevance voices this week"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("KOLs")}
              >
                Explore
              </Button>
            }
          />
          <div className="kol-mini-list">
            {kols.slice(0, 3).map((k) => (
              <div key={k.handle}>
                <Avatar name={k.name} src={k.avatar} />
                <div>
                  <strong>{k.name}</strong>
                  <small>
                    {k.handle} · {k.followers}
                  </small>
                </div>
                <div className="score">
                  <strong>{k.relevance}</strong>
                  <span>match</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading
            title="Active campaigns"
            description="Performance against current goals"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("Campaigns")}
              >
                Manage
              </Button>
            }
          />
          <div className="campaign-mini-list">
            {campaigns.slice(0, 2).map((c) => (
              <div key={c.name}>
                <div>
                  <strong>{c.name}</strong>
                  <Badge tone="success">{c.status}</Badge>
                </div>
                <Progress value={c.progress} />
                <p>
                  <span>{c.progress}% complete</span>
                  <span>{c.reach} reach</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
