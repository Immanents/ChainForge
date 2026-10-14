import { useState } from "react"
import { activity, alerts } from "../data/mockData"
import { AreaChart, DonutChart } from "../components/Charts"
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

const communityKpis = [
  ["Total members", "128,420", "+8.4%"],
  ["Growth rate", "7.8%", "+1.2%"],
  ["Engagement", "14.8%", "+2.3%"],
  ["Active users", "32,840", "+12.6%"],
  ["Positive sentiment", "78%", "+4.2%"],
]

export default function Community() {
  const [tab, setTab] = useState("Overview")
  return (
    <div className="page">
      <PageHeading
        title="Community intelligence"
        description="Understand the conversations, people and signals shaping Nova Protocol."
        actions={
          <>
            <Select>
              <option>All platforms</option>
              <option>X</option>
              <option>Discord</option>
              <option>Telegram</option>
            </Select>
            <Button variant="secondary" icon="refresh">
              Sync
            </Button>
          </>
        }
      />
      <Tabs
        items={["Overview", "Activity", "Conversations", "Sentiment", "Alerts"]}
        active={tab}
        onChange={setTab}
      />
      {tab === "Overview" && (
        <>
          <div className="community-kpis">
            {communityKpis.map((x) => (
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
                title="Community growth"
                description="Member growth across connected communities"
              />
              <div className="chart-summary">
                <strong>128.4K</strong>
                <Badge tone="success">+8.4%</Badge>
              </div>
              <AreaChart />
            </Card>
            <Card>
              <SectionHeading title="Platform distribution" />
              <div className="distribution-ring">
                <DonutChart
                  values={[52, 28, 20]}
                  labels={["X", "Discord", "Telegram"]}
                />
              </div>
            </Card>
          </div>
          <ActivityFeed limit={4} />
        </>
      )}
      {tab === "Activity" && <ActivityFeed />}
      {tab === "Conversations" && <Conversations />}
      {tab === "Sentiment" && <Sentiment />}
      {tab === "Alerts" && <Alerts />}
    </div>
  )
}

function ActivityFeed({ limit }: { limit?: number }) {
  return (
    <Card>
      <SectionHeading
        title="Live activity"
        description="Important events from all connected communities"
        action={
          <div className="inline-filters">
            <Input icon="search" placeholder="Search activity" />
            <Button variant="secondary" size="sm" icon="filter">
              Filter
            </Button>
          </div>
        }
      />
      <div className="activity-table table-scroll">
        <div className="table-head">
          <span>Event</span>
          <span>Platform</span>
          <span>Sentiment</span>
          <span>Importance</span>
          <span>Time</span>
        </div>
        {activity.slice(0, limit).map((a) => (
          <div className="table-row" key={a.user + a.time}>
            <div className="event-cell">
              <span className="event-mark">
                <Icon
                  name={
                    a.sentiment === "Positive"
                      ? "trend"
                      : a.sentiment === "Negative"
                        ? "activity"
                        : "message"
                  }
                />
              </span>
              <div>
                <strong>{a.event}</strong>
                <p>{a.text}</p>
                <small>{a.user}</small>
              </div>
            </div>
            <span>
              <Badge tone="neutral">{a.platform}</Badge>
            </span>
            <span>
              <Badge
                tone={
                  a.sentiment === "Positive"
                    ? "success"
                    : a.sentiment === "Negative"
                      ? "danger"
                      : "neutral"
                }
              >
                {a.sentiment}
              </Badge>
            </span>
            <span>
              <Badge tone={a.importance === "High" ? "warning" : "neutral"}>
                {a.importance}
              </Badge>
            </span>
            <small>{a.time}</small>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Conversations() {
  return (
    <>
      <Card className="filter-bar">
        <Input
          icon="search"
          placeholder="Search conversations, topics or people..."
        />
        <Select>
          <option>All platforms</option>
          <option>X</option>
          <option>Discord</option>
        </Select>
        <Select>
          <option>Any sentiment</option>
          <option>Positive</option>
          <option>Negative</option>
        </Select>
        <Button variant="secondary" icon="filter">
          More filters
        </Button>
      </Card>
      <div className="conversation-list">
        {activity.map((a) => (
          <Card key={a.user + a.time} className="conversation-card">
            <div className="conversation-meta">
              <span className="platform-icon">
                <Icon
                  name={
                    a.platform === "X"
                      ? "x"
                      : a.platform === "Discord"
                        ? "discord"
                        : "telegram"
                  }
                />
              </span>
              <strong>{a.user}</strong>
              <span>{a.time}</span>
              <Badge
                tone={
                  a.sentiment === "Positive"
                    ? "success"
                    : a.sentiment === "Negative"
                      ? "danger"
                      : "neutral"
                }
              >
                {a.sentiment}
              </Badge>
            </div>
            <p>{a.text}</p>
            <div className="conversation-footer">
              <span>
                <Icon name="message" /> {Math.floor(Math.random() * 30) + 4}{" "}
                replies
              </span>
              <span>
                <Icon name="heart" /> {Math.floor(Math.random() * 120) + 20}
              </span>
              <Button variant="ghost" size="sm">
                View context <Icon name="external" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}

function Sentiment() {
  return (
    <>
      <div className="sentiment-summary">
        <Card>
          <span>Positive</span>
          <strong className="text-success">78%</strong>
          <small>+4.2% from last period</small>
        </Card>
        <Card>
          <span>Neutral</span>
          <strong>16%</strong>
          <small>-1.1% from last period</small>
        </Card>
        <Card>
          <span>Negative</span>
          <strong className="text-danger">6%</strong>
          <small>-3.1% from last period</small>
        </Card>
      </div>
      <div className="two-col wide-left">
        <Card>
          <SectionHeading
            title="Sentiment over time"
            description="Daily conversation sentiment"
          />
          <AreaChart variant="green" />
        </Card>
        <Card>
          <SectionHeading title="Sentiment distribution" />
          <DonutChart />
        </Card>
      </div>
      <Card>
        <SectionHeading
          title="What is driving sentiment?"
          description="Topics with the greatest sentiment impact"
        />
        <div className="topic-list">
          {[
            ["Intent layer launch", "Positive", 842, "+18%"],
            ["Validator rewards", "Positive", 610, "+11%"],
            ["Claim delays", "Negative", 184, "+26%"],
            ["Token utility", "Neutral", 524, "+34%"],
          ].map((t) => (
            <div key={t[0]}>
              <span className="topic-rank">#</span>
              <strong>{t[0]}</strong>
              <Badge
                tone={
                  t[1] === "Positive"
                    ? "success"
                    : t[1] === "Negative"
                      ? "danger"
                      : "neutral"
                }
              >
                {t[1]}
              </Badge>
              <span>{t[2]} mentions</span>
              <span>{t[3]}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function Alerts() {
  return (
    <>
      <div className="alert-controls">
        <div>
          <strong>4 active alerts</strong>
          <span>Intelligence requiring review or action</span>
        </div>
        <Button icon="plus">Create alert rule</Button>
      </div>
      <div className="alert-card-grid">
        {alerts.map((a, i) => (
          <Card key={a.title} className="action-alert">
            <div className="action-alert-top">
              <span
                className={`alert-icon ${
                  i === 1
                    ? "alert-danger"
                    : i === 0
                      ? "alert-success"
                      : "alert-brand"
                }`}
              >
                <Icon name={i === 1 ? "activity" : "bell"} />
              </span>
              <Badge tone={i === 1 ? "danger" : i === 0 ? "success" : "brand"}>
                {a.severity}
              </Badge>
              <span>{a.time}</span>
            </div>
            <h3>{a.title}</h3>
            <p>{a.description}</p>
            <div>
              <Button variant="secondary" size="sm">
                View intelligence
              </Button>
              <Button variant="ghost" size="sm">
                Dismiss
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
