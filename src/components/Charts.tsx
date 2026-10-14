import { useId } from "react"

export function Sparkline({
  data,

  positive = true,
}: {
  data: number[]

  positive?: boolean
}) {
  const max = Math.max(...data),
    min = Math.min(...data)

  const points = data

    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * 100},${38 - ((v - min) / (max - min || 1)) * 30}`,
    )

    .join(" ")

  return (
    <svg
      className={`sparkline ${positive ? "positive" : "negative"}`}
      viewBox="0 0 100 42"
      preserveAspectRatio="none"
    >
      <polyline points={points} />
    </svg>
  )
}

export function AreaChart({
  variant = "brand",
}: {
  variant?: "brand" | "green"
}) {
  const id = useId().replace(/:/g, "")

  return (
    <div className="chart-wrap">
      <div className="chart-y">
        <span>150K</span>
        <span>125K</span>
        <span>100K</span>
        <span>75K</span>
        <span>50K</span>
      </div>
      <svg
        className={`area-chart ${variant}`}
        viewBox="0 0 700 240"
        preserveAspectRatio="none"
        role="img"
        aria-label="Community growth over time"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid">
          <path d="M0 20H700M0 70H700M0 120H700M0 170H700M0 220H700" />
        </g>
        <path
          className="area"
          fill={`url(#${id})`}
          d="M0 205 C45 198 62 183 103 187 S167 159 208 163 S274 139 314 147 S375 108 417 121 S485 83 523 95 S580 62 626 68 S670 36 700 28 L700 240 L0 240Z"
        />
        <path
          className="line"
          d="M0 205 C45 198 62 183 103 187 S167 159 208 163 S274 139 314 147 S375 108 417 121 S485 83 523 95 S580 62 626 68 S670 36 700 28"
        />
        <circle cx="700" cy="28" r="5" />
      </svg>
      <div className="chart-x">
        <span>Feb 24</span>
        <span>Mar 2</span>
        <span>Mar 8</span>
        <span>Mar 14</span>
        <span>Mar 20</span>
        <span>Mar 25</span>
      </div>
    </div>
  )
}

export function MultiLineChart() {
  return (
    <div className="chart-wrap">
      <div className="chart-y">
        <span>40K</span>
        <span>30K</span>
        <span>20K</span>
        <span>10K</span>
        <span>0</span>
      </div>
      <svg
        className="area-chart multiline"
        viewBox="0 0 700 240"
        preserveAspectRatio="none"
      >
        <g className="grid">
          <path d="M0 20H700M0 70H700M0 120H700M0 170H700M0 220H700" />
        </g>
        <path
          className="line line-a"
          d="M0 190 C70 180 80 155 140 164 S225 125 280 142 S365 90 420 108 S510 76 560 84 S640 40 700 48"
        />
        <path
          className="line line-b"
          d="M0 207 C70 200 100 185 145 189 S225 163 282 172 S360 135 420 151 S515 112 565 122 S635 88 700 96"
        />
        <path
          className="line line-c"
          d="M0 217 C70 211 105 205 150 208 S230 192 288 197 S370 174 425 184 S520 157 570 169 S650 146 700 151"
        />
      </svg>
      <div className="chart-x">
        <span>Feb 24</span>
        <span>Mar 2</span>
        <span>Mar 8</span>
        <span>Mar 14</span>
        <span>Mar 20</span>
        <span>Mar 25</span>
      </div>
    </div>
  )
}

export function DonutChart({
  values = [78, 16, 6],

  labels = ["Positive", "Neutral", "Negative"],
}: {
  values?: number[]

  labels?: string[]
}) {
  const colors = ["var(--success)", "var(--brand)", "var(--danger)"]

  let offset = 0

  return (
    <div className="donut-layout">
      <div className="donut">
        <svg viewBox="0 0 42 42">
          <circle className="donut-bg" cx="21" cy="21" r="15.9" />
          {values.map((v, i) => {
            const el = (
              <circle
                key={labels[i]}
                cx="21"
                cy="21"
                r="15.9"
                fill="none"
                stroke={colors[i]}
                strokeWidth="4"
                strokeDasharray={`${v} ${100 - v}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )

            offset += v

            return el
          })}
        </svg>
        <div>
          <strong>{values[0]}%</strong>
          <span>Positive</span>
        </div>
      </div>
      <div className="donut-legend">
        {labels.map((l, i) => (
          <div key={l}>
            <span style={{ background: colors[i] }} />
            <p>{l}</p>
            <strong>{values[i]}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Bars({
  data = [42, 65, 48, 78, 60, 92, 72, 98, 80, 112, 91, 128],
}: {
  data?: number[]
}) {
  return (
    <div className="bars">
      {data.map((v, i) => (
        <div key={i}>
          <span style={{ height: `${(v / Math.max(...data)) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}
