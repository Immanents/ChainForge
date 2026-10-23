import { useEffect, useState } from "react"
import { AppShell } from "./components/AppShell"
import Analytics from "./pages/Analytics"
import BuildEngine from "./pages/BuildEngine"
import Campaigns from "./pages/Campaigns"
import Community from "./pages/Community"
import ContentStudio from "./pages/ContentStudio"
import Kols from "./pages/Kols"
import LandingPage from "./pages/LandingPage"
import Overview from "./pages/Overview"
import Project from "./pages/Project"
import Settings from "./pages/Settings"
import TokenWizard from "./pages/TokenWizard"
import AdminDashboard from "./pages/AdminDashboard"
import { defaultProject, type ProjectRecord } from "./data/projects"
import { AuthProvider } from "./context/AuthContext"

export default function App() {
  const [view, setView] = useState<"landing" | "app">(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase()
      if (hash.startsWith("#app")) return "app"
    }
    return "landing"
  })

  const [page, setPage] = useState("Overview")
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("growth-os-theme") as "dark" | "light") || "dark"
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

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash.startsWith("#app")) {
        setView("app")
        if (hash.includes("build-engine")) {
          setPage("Build Engine")
        } else if (hash.includes("analytics")) {
          setPage("Analytics")
        } else if (hash.includes("community")) {
          setPage("Community")
        }
      } else if (hash === "" || hash === "#") {
        setView("landing")
      }
    }
    window.addEventListener("hashchange", handleHash)
    return () => window.removeEventListener("hashchange", handleHash)
  }, [])

  const createProject = (project: ProjectRecord) => {
    setProjects((current) => [...current, project])
    setActiveProjectId(project.id)
  }

  const updateProject = (updated: ProjectRecord) => {
    setProjects((current) =>
      current.map((p) => (p.id === updated.id ? updated : p))
    )
  }

  const pages: Record<string, React.ReactNode> = {
    Overview: <Overview navigate={setPage} />,
    Project: (
      <Project
        projects={projects}
        activeProject={activeProject}
        setActiveProjectId={setActiveProjectId}
        createProject={createProject}
        updateProject={updateProject}
      />
    ),
    Community: <Community />,
    "Content Studio": <ContentStudio />,
    KOLs: <Kols />,
    Campaigns: <Campaigns />,
    Analytics: <Analytics />,
    "Build Engine": <BuildEngine />,
    "Token Studio": <TokenWizard />,
    "Waitlist Admin": <AdminDashboard />,
    Settings: <Settings />,
  }

  return (
    <AuthProvider>
      {view === "landing" ? (
        <LandingPage
          theme={theme}
          setTheme={setTheme}
          onLaunchApp={(targetPage?: string) => {
            if (targetPage) setPage(targetPage)
            window.location.hash = "app"
            setView("app")
          }}
        />
      ) : (
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
          onGoToLanding={() => {
            window.location.hash = ""
            setView("landing")
          }}
        >
          {pages[page]}
        </AppShell>
      )}
    </AuthProvider>
  )
}
