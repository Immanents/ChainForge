import type { ReactNode } from "react"
import { navItems } from "../data/mockData"
import { Icon, type IconName } from "./Icons"
import { Avatar, Badge, Button } from "./ui"
import type { ProjectRecord } from "../data/projects"
import { useAuth } from "../context/AuthContext"
import { AccountStatusBanner } from "./auth/AccountStatusBanner"
import { AuthModal } from "./auth/AuthModal"
import { BRAND_LOGO_DATA_URI } from "../assets/brandLogoData"

export function AppShell({
  page,

  setPage,

  collapsed,

  setCollapsed,

  mobileOpen,

  setMobileOpen,

  theme,

  setTheme,

  activeProject,

  onGoToLanding,

  children,
}: {
  page: string

  setPage: (page: string) => void

  collapsed: boolean

  setCollapsed: (v: boolean) => void

  mobileOpen: boolean

  setMobileOpen: (v: boolean) => void

  theme: "dark" | "light"

  setTheme: (theme: "dark" | "light") => void

  activeProject: ProjectRecord

  onGoToLanding?: () => void

  children: ReactNode
}) {
  const { user, profile, creditsBalance, signOut, openAuthModal } = useAuth()

  const navigate = (item: string) => {
    setPage(item)

    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        <div className="brand">
          <img
            src={BRAND_LOGO_DATA_URI}
            alt="ChainForge Logo"
            className="brand-logo-img"
          />
          {!collapsed && (
            <>
              <strong>ChainForge</strong>
              <span className="brand-badge">AI</span>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            icon="close"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
        </div>
        <nav className="nav-list">
          <span className="nav-label">{!collapsed && "Workspace"}</span>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${page === item.label ? "active" : ""}`}
              onClick={() => navigate(item.label)}
            >
              <Icon name={item.icon as IconName} />
              {!collapsed && <span>{item.label}</span>}
              {page === item.label && !collapsed && <i />}
            </button>
          ))}
          <div className="nav-divider" />
          {profile?.role === "admin" && (
            <button
              className={`nav-item ${page === "Waitlist Admin" ? "active" : ""}`}
              onClick={() => navigate("Waitlist Admin")}
            >
              <Icon name="shield" />
              {!collapsed && <span>Admin Console</span>}
              {page === "Waitlist Admin" && !collapsed && <i />}
            </button>
          )}
          <button
            className={`nav-item ${page === "Settings" ? "active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <Icon name="settings" />
            {!collapsed && <span>Settings</span>}
          </button>
          {onGoToLanding && (
            <button
              className="nav-item"
              onClick={() => {
                setMobileOpen(false)
                onGoToLanding()
              }}
              title="Return to Landing Page"
            >
              <Icon name="globe" />
              {!collapsed && <span>Landing Page</span>}
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="workspace-card"
            onClick={() => {
              setPage("Project")
              setMobileOpen(false)
            }}
          >
            {activeProject.logoUrl ? (
              <img
                src={activeProject.logoUrl}
                alt={activeProject.name}
                className="nova-logo object-cover"
              />
            ) : (
              <span className="nova-logo">{activeProject.name[0]}</span>
            )}
            {!collapsed && (
              <>
                <span>
                  <strong>{activeProject.name}</strong>
                  <small>{activeProject.status}</small>
                </span>
                <Icon name="more" />
              </>
            )}
          </button>
          <button
            className="profile-card"
            onClick={() => {
              if (user) {
                setPage("Settings")
              } else {
                openAuthModal("signin")
              }
              setMobileOpen(false)
            }}
          >
            <Avatar name={profile?.full_name || user?.email || "Guest User"} size="sm" />
            {!collapsed && (
              <span>
                <strong className="truncate max-w-[130px] block">{profile?.full_name || (user?.email ? user.email.split("@")[0] : "Guest User")}</strong>
                <small className="capitalize">{user ? `${profile?.plan || "free"} (${profile?.status || "pending"})` : "Sign In to Access"}</small>
              </span>
            )}
          </button>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon
              name="chevron"
              className={`size-4 ${collapsed ? "" : "rotate-180"}`}
            />
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              icon={mobileOpen ? "close" : "menu"}
              className="mobile-menu"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            />
            <strong>{page}</strong>
            <span className="header-divider" />
            <button className="project-pill" onClick={() => setPage("Project")}>
              {activeProject.logoUrl ? (
                <img
                  src={activeProject.logoUrl}
                  alt={activeProject.name}
                  className="nova-logo small object-cover"
                />
              ) : (
                <span className="nova-logo small">{activeProject.name[0]}</span>
              )}
              <span>{activeProject.name}</span>
              <Icon name="chevron" className="size-3 rotate-90" />
            </button>
          </div>
          <div className="top-actions">
            {onGoToLanding && (
              <Button
                variant="ghost"
                size="sm"
                icon="globe"
                onClick={onGoToLanding}
                className="text-xs"
                title="Return to public landing page"
              >
                Public Site
              </Button>
            )}
            <button className="search-trigger">
              <Icon name="search" />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              icon={theme === "dark" ? "sun" : "moon"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${
                theme === "dark" ? "light" : "dark"
              } mode`}
            />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/15 text-brand-bright border border-brand/30">
                  <Icon name="sparkles" className="size-3.5 text-brand-bright" />
                  <span>{creditsBalance} Credits</span>
                </span>
                <span className="hidden sm:inline-flex uppercase text-[10px] tracking-wider px-2 py-0.5 rounded font-mono font-bold bg-white/10 text-text-secondary border border-border">
                  {profile?.plan?.replace("_", " ") || "Free"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-xs text-text-muted hover:text-red-400"
                  title="Sign out of your account"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openAuthModal("signin")}
                  className="text-xs font-medium"
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openAuthModal("signup")}
                  className="text-xs font-medium"
                >
                  Get Access
                </Button>
              </div>
            )}
          </div>
        </header>
        <AccountStatusBanner />
        <main className="main-content">{children}</main>
      </div>
      <AuthModal />
    </div>
  )
}
