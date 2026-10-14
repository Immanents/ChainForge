import { useState } from "react"
import { kols } from "../data/mockData"
import { Bars } from "../components/Charts"
import { Icon } from "../components/Icons"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  PageHeading,
  Progress,
  SectionHeading,
  Select,
} from "../components/ui"

type Kol = typeof kols[number]
export default function Kols() {
  const [selected, setSelected] = useState<Kol | null>(null)
  return (
    <div className="page">
      <PageHeading
        title="KOL discovery"
        description="Find credible voices already relevant to Nova Protocol and your ecosystem."
        actions={
          <Button variant="secondary" icon="refresh">
            Refresh discoveries
          </Button>
        }
      />
      <Card className="kol-filters">
        <Input icon="search" placeholder="Search name, handle or keyword..." />
        <Select>
          <option>All platforms</option>
          <option>X</option>
          <option>Discord</option>
        </Select>
        <Select>
          <option>Audience size</option>
          <option>10K–50K</option>
          <option>50K–100K</option>
          <option>100K+</option>
        </Select>
        <Select>
          <option>Engagement</option>
          <option>5%+</option>
          <option>8%+</option>
        </Select>
        <Select>
          <option>All categories</option>
          <option>DeFi</option>
          <option>Infrastructure</option>
          <option>Developers</option>
        </Select>
        <Button variant="secondary" icon="filter">
          Filters
        </Button>
      </Card>
      <div className="results-title">
        <div>
          <strong>128 relevant profiles</strong>
          <span>Ranked by relevance to Nova Protocol</span>
        </div>
        <Select>
          <option>Highest relevance</option>
          <option>Most engaged</option>
          <option>Largest audience</option>
        </Select>
      </div>
      <div className="kol-grid">
        {kols.map((k) => (
          <Card className="kol-card" key={k.handle}>
            <div className="kol-card-top">
              <Avatar name={k.name} src={k.avatar} size="lg" />
              <div>
                <h3>{k.name}</h3>
                <p>{k.handle}</p>
              </div>
              <Button variant="ghost" size="icon" icon="more" />
            </div>
            <div className="kol-tags">
              <Badge tone="neutral">{k.platform}</Badge>
              <Badge tone="neutral">{k.category}</Badge>
              <span>{k.region}</span>
            </div>
            <div className="kol-stats">
              <div>
                <strong>{k.followers}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{k.engagement}</strong>
                <span>Engagement</span>
              </div>
              <div>
                <strong>{k.mentions}</strong>
                <span>Mentions</span>
              </div>
            </div>
            <div className="relevance">
              <div>
                <span>Relevance score</span>
                <strong>{k.relevance}%</strong>
              </div>
              <Progress value={k.relevance} />
            </div>
            <div className="kol-signal">
              <Icon name="trend" />
              <span>
                <strong>{k.sentiment} sentiment</strong> in recent Nova mentions
              </span>
            </div>
            <Button
              variant="secondary"
              className="full-btn"
              onClick={() => setSelected(k)}
            >
              View profile <Icon name="arrow" />
            </Button>
          </Card>
        ))}
      </div>
      {selected && <KolDrawer kol={selected} close={() => setSelected(null)} />}
    </div>
  )
}

function KolDrawer({ kol, close }: { kol: Kol close: () => void }) {
  return (
    <>
      <button
        className="drawer-backdrop"
        onClick={close}
        aria-label="Close profile"
      />
      <aside className="drawer">
        <div className="drawer-header">
          <span>KOL profile</span>
          <Button variant="ghost" size="icon" icon="close" onClick={close} />
        </div>
        <div className="profile-hero">
          <Avatar name={kol.name} src={kol.avatar} size="lg" />
          <div>
            <h2>{kol.name}</h2>
            <p>
              {kol.handle} · {kol.platform}
            </p>
            <div>
              <Badge tone="success">{kol.sentiment}</Badge>
              <Badge>{kol.category}</Badge>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <Button icon="plus">Add to campaign</Button>
          <Button variant="secondary" icon="link">
            Track profile
          </Button>
        </div>
        <div className="profile-score">
          <div>
            <span>Nova relevance</span>
            <strong>{kol.relevance}</strong>
            <small>/100</small>
          </div>
          <Progress value={kol.relevance} />
          <p>
            Strong topical overlap with cross-chain infrastructure and developer
            tooling.
          </p>
        </div>
        <div className="profile-metrics">
          <div>
            <strong>{kol.followers}</strong>
            <span>Audience</span>
          </div>
          <div>
            <strong>{kol.engagement}</strong>
            <span>Engagement</span>
          </div>
          <div>
            <strong>{kol.mentions}</strong>
            <span>Nova mentions</span>
          </div>
        </div>
        <Card>
          <SectionHeading
            title="Content performance"
            description="Average interactions, last 30 days"
          />
          <Bars data={[30, 48, 42, 65, 56, 82, 61, 92, 76, 102, 88, 116]} />
        </Card>
        <section className="drawer-section">
          <SectionHeading title="Recent Nova mentions" />
          {[
            "Nova's intent architecture is worth studying if you're building cross-chain UX.",
            "Good technical breakdown from the Nova team today. More of this.",
          ].map((p, i) => (
            <div className="mention-post" key={p}>
              <div>
                <Icon name="x" />
                <span>{i === 0 ? "2 days ago" : "8 days ago"}</span>
              </div>
              <p>{p}</p>
              <small>
                {i === 0
                  ? "1.8K views · 142 interactions"
                  : "940 views · 86 interactions"}
              </small>
            </div>
          ))}
        </section>
        <section className="drawer-section">
          <SectionHeading title="Relationship" />
          <Select className="full-btn">
            <option>Watching</option>
            <option>Engaged</option>
            <option>Partner</option>
            <option>Not relevant</option>
          </Select>
          <p className="helper-text">
            Statuses are managed manually. No automated outreach is sent.
          </p>
        </section>
      </aside>
    </>
  )
}
