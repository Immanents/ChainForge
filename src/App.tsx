import { useEffect, useState } from "react"
import { AppShell } from "./components/AppShell"
import Analytics from "./pages/Analytics"
import Campaigns from "./pages/Campaigns"
import Community from "./pages/Community"
import ContentStudio from "./pages/ContentStudio"
import Kols from "./pages/Kols"
import Overview from "./pages/Overview"
import Project from "./pages/Project"
import Settings from "./pages/Settings"
import { defaultProject, type ProjectRecord } from "./data/projects"

export default function App() {
  const [page, setPage] = useState("Overview")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return localStorage.getItem("growth-os-theme") as "dark" | "light" || "dark"
  })
  const [projects, setProjects] = useState<ProjectRecord[]>(() => {
    const saved = localStorage.getItem("growth-os-projects")
    return saved ? JSON.parse(saved) : [defaultProject]
  })
  const [activeProjectId, setActiveProjectId] = useState(() => {
    return localStorage.getItem("growth-os-active-project") || defaultProject.id
  })
  const activeProject =
    projects.find((project) => project.id === activeProjectId) || projects[0]

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem("growth-os-theme", theme)
  }, [theme])
  useEffect(() => {
    localStorage.setItem("growth-os-projects", JSON.stringify(projects))
    localStorage.setItem("growth-os-active-project", activeProjectId)
  }, [projects, activeProjectId])

  const createProject = (project: ProjectRecord) => {
    setProjects((current) => [...current, project])
    setActiveProjectId(project.id)
  }
  const pages: Record<string, React.ReactNode> = {
    Overview: <Overview navigate={setPage} />,
    Project: (
      <Project
        projects={projects}
        activeProject={activeProject}
        setActiveProjectId={setActiveProjectId}
        createProject={createProject}
      />
    ),
    Community: <Community />,
    "Content Studio": <ContentStudio />,
    KOLs: <Kols />,
    Campaigns: <Campaigns />,
    Analytics: <Analytics />,
    Settings: <Settings />,
  }
  return (
    <AppShell
      page={page}
      setPage={setPage}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      mobileOpen={mobileOpen}
      setMobileOpen={setMobileOpen}
      theme={theme}
      setTheme={setTheme}
      activeProject={activeProject}
    >
      {pages[page]}
    </AppShell>
  )
}
