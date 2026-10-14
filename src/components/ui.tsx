import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react"

import { Icon, type IconName } from "./Icons"

export function Button({
  children,

  variant = "primary",

  size = "md",

  icon,

  className = "",

  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"

  size?: "sm" | "md" | "icon"

  icon?: IconName
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

export function Input({
  icon,

  className = "",

  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName }) {
  return (
    <label className={`input-wrap ${className}`}>
      {icon && <Icon name={icon} className="size-4 text-muted" />}
      <input className="input" {...props} />
    </label>
  )
}

export function Select({
  children,

  className = "",

  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`select-wrap ${className}`}>
      <select className="select" {...props}>
        {children}
      </select>
      <Icon name="chevron" className="size-3 rotate-90 text-muted" />
    </label>
  )
}

export function Card({
  children,

  className = "",
}: {
  children: ReactNode

  className?: string
}) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Badge({
  children,

  tone = "neutral",
}: {
  children: ReactNode

  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "info"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Avatar({
  name,

  src,

  size = "md",
}: {
  name: string

  src?: string

  size?: "sm" | "md" | "lg"
}) {
  return src ? (
    <img className={`avatar avatar-${size}`} src={src} alt={name} />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`}>
      {name

        .split(" ")

        .map((x) => x[0])

        .slice(0, 2)

        .join("")}
    </span>
  )
}

export function Progress({
  value,

  tone = "brand",
}: {
  value: number

  tone?: "brand" | "success" | "warning"
}) {
  return (
    <div className="progress">
      <span
        className={`progress-fill progress-${tone}`}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function PageHeading({
  title,

  description,

  actions,
}: {
  title: string

  description?: string

  actions?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  )
}

export function SectionHeading({
  title,

  description,

  action,
}: {
  title: string

  description?: string

  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Tabs({
  items,

  active,

  onChange,
}: {
  items: string[]

  active: string

  onChange: (tab: string) => void
}) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={active === item ? "tab active" : "tab"}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon = "sparkles",

  title,

  description,

  action,
}: {
  icon?: IconName

  title: string

  description: string

  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function Toggle({
  active = false,

  label,
}: {
  active?: boolean

  label?: string
}) {
  return (
    <label className="toggle-label">
      {label && <span>{label}</span>}
      <button
        className={`toggle ${active ? "on" : ""}`}
        aria-label={label || "Toggle"}
      >
        <span />
      </button>
    </label>
  )
}
