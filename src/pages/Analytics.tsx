import { useState } from "react"
import {
  AreaChart,
  Bars,
  DonutChart,
  MultiLineChart,
} from "../components/Charts"
import {
  Badge,
  Button,
  Card,
  PageHeading,
  SectionHeading,
} from "../components/ui"

export default function Analytics() {
  const [range, setRange] = useState("30 days")
  return (
    <div className="page">
      <PageHeading
        title="Analytics"
        description="Measure traction across community, content, KOLs and campaigns."
        actions={
          <>
            <div className="segmented">
              {["7 days", "30 days", "90 days", "Custom"].map((r) => (
                <button
                  className={range === r ? "active" : ""}
                  key={r}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button variant="secondary" icon="calendar">
              Mar 01 – Mar 30
            </Button>
            <Button variant="secondary" icon="external">
              Export
            </Button>
          </>
        }
      />
      <div className="analytics-kpis">
        {[
          ["Total reach", "2.84M", "+24.8%"],
          ["Engagements", "186.2K", "+18.4%"],
          ["Mentions", "6,284", "+12.6%"],
          ["Positive sentiment", "78%", "+4.2%"],
        ].map((x) => (
          <Card key={x[0]}>
            <span>{x[0]}</span>
            <div>
              <strong>{x[1]}</strong>
              <Badge tone="success">{x[2]}</Badge>
            </div>
            <small>vs. previous period</small>
          </Card>
        ))}
      </div>
      <div className="two-col wide-left">
        <Card>
          <SectionHeading
            title="Community growth"
            description="Cumulative members by platform"
            action={
              <div className="legend">
                <span className="dot brand" />X<span className="dot green" />
                Discord
                <span className="dot amber" />
                Telegram
              </div>
            }
          />
          <MultiLineChart />
        </Card>
        <Card>
          <SectionHeading title="Sentiment" />
          <DonutChart />
          <div className="analytics-insight">
            <strong>+11%</strong>
            <span>positive sentiment lift after launch</span>
          </div>
        </Card>
      </div>
      <div className="two-col">
        <Card>
          <SectionHeading
            title="Content performance"
            description="Engagements by content format"
          />
          <div className="bar-chart-labeled">
            <Bars data={[62, 92, 48, 75, 40, 68, 36]} />
            <div>
              <span>Threads</span>
              <span>Launch</span>
              <span>Updates</span>
              <span>Education</span>
              <span>Video</span>
              <span>AMAs</span>
              <span>Other</span>
            </div>
          </div>
        </Card>
        <Card>
          <SectionHeading
            title="Top acquisition sources"
            description="New community members"
          />
          <div className="source-list">
            {[
              ["Organic X", "4,820", 42],
              ["Campaigns", "2,940", 26],
              ["KOL mentions", "1,680", 15],
              ["Referrals", "1,240", 11],
              ["Direct", "684", 6],
            ].map((s) => (
              <div key={s[0]}>
                <span>{s[0]}</span>
                <strong>{s[1]}</strong>
                <div className="source-bar">
                  <span style={{ width: `${s[2]}%` }} />
                </div>
                <small>{s[2]}%</small>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <SectionHeading
          title="Campaign performance"
          description="Compare active and completed growth initiatives"
        />
        <div className="analytics-table table-scroll">
          <div className="table-head">
            <span>Campaign</span>
            <span>Reach</span>
            <span>Engagement</span>
            <span>New members</span>
            <span>Sentiment lift</span>
            <span>Efficiency</span>
          </div>
          {[
            [
              "Intent Layer Launch",
              "1.2M",
              "8.7%",
              "6,420",
              "+11%",
              "$3.84 CPM",
            ],
            [
              "Nova Builders Season 2",
              "482K",
              "12.4%",
              "2,180",
              "+8%",
              "$4.12 CPM",
            ],
            [
              "Testnet Momentum",
              "1.8M",
              "10.8%",
              "12,480",
              "+14%",
              "$2.96 CPM",
            ],
            [
              "Community AMA Series",
              "218K",
              "16.1%",
              "1,240",
              "+6%",
              "$5.20 CPM",
            ],
          ].map((r) => (
            <div className="table-row" key={r[0]}>
              {r.map((x, i) =>
                i === 0 ? (
                  <strong key={x}>{x}</strong>
                ) : i === 4 ? (
                  <Badge tone="success" key={x}>
                    {x}
                  </Badge>
                ) : (
                  <span key={x}>{x}</span>
                ),
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
