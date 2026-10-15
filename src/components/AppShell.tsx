import type { ReactNode } from "react"

import { navItems } from "../data/mockData"

import { Icon, type IconName } from "./Icons"

import { Avatar, Button } from "./ui"

import type { ProjectRecord } from "../data/projects"

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

  children: ReactNode
}) {
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
          <span className="brand-mark">
            <span />
          </span>
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
          <button
            className={`nav-item ${page === "Settings" ? "active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <Icon name="settings" />
            {!collapsed && <span>Settings</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="workspace-card" onClick={() => setPage("Project")}>
            <span className="nova-logo">{activeProject.name[0]}</span>
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
          <button className="profile-card">
            <Avatar name="Maya Chen" size="sm" />
            {!collapsed && (
              <span>
                <strong>Maya Chen</strong>
                <small>Growth Lead</small>
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
              icon="menu"
              className="mobile-menu"
              onClick={() => setMobileOpen(true)}
            />
            <strong>{page}</strong>
            <span className="header-divider" />
            <button className="project-pill" onClick={() => setPage("Project")}>
              <span className="nova-logo small">{activeProject.name[0]}</span>
              <span>{activeProject.name}</span>
              <Icon name="chevron" className="size-3 rotate-90" />
            </button>
          </div>
          <div className="top-actions">
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
            <Button
              variant="ghost"
              size="icon"
              icon="bell"
              className="notification-btn"
            />
            <Avatar name="Maya Chen" size="sm" />
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  )
}
