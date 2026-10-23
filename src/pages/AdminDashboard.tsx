// src/pages/AdminDashboard.tsx
// Comprehensive Commercial SaaS Administration Console:
// User Approvals, Entitlements, Invitation Code Management, Waitlist Leads, and Audit Trails

import { useState, useEffect } from "react"
import { Icon } from "../components/Icons"
import { Badge, Button, Card, Input, PageHeading, SectionHeading, Tabs } from "../components/ui"
import { useAuth } from "../context/AuthContext"
import { getAuthHeaders } from "../services/supabaseClient"

type SignupRecord = {
  id: string
  email: string
  role: string
  stage: string
  blockchain: string
  created_at: string
}

type UserRecord = {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
  status: "pending" | "active" | "suspended" | "revoked"
  plan: "free_trial" | "builder" | "pro" | "enterprise"
  credits_balance: number
  plan_expires_at: string | null
  created_at: string
}

type InvitationRecord = {
  id: string
  code: string
  plan: "free_trial" | "builder" | "pro" | "enterprise"
  initial_credits: number
  expires_at: string
  used_by: string | null
  used_at: string | null
  is_revoked: boolean
  created_at: string
}

type AuditLogRecord = {
  id: string
  admin_id: string | null
  target_user_id: string | null
  action: string
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export default function AdminDashboard() {
  const { user, profile } = useAuth()
  const [adminKey, setAdminKey] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<"users" | "invitations" | "waitlist" | "audit">("users")

  // Data states
  const [users, setUsers] = useState<UserRecord[]>([])
  const [invitations, setInvitations] = useState<InvitationRecord[]>([])
  const [signups, setSignups] = useState<SignupRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([])

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // New Invite form
  const [newInvitePlan, setNewInvitePlan] = useState<"builder" | "pro" | "enterprise">("builder")
  const [newInviteCredits, setNewInviteCredits] = useState(50)
  const [newInviteDays, setNewInviteDays] = useState(14)
  const [creatingInvite, setCreatingInvite] = useState(false)

  // Owner bootstrap
  const [bootstrapEmail, setBootstrapEmail] = useState("")
  const [bootstrapping, setBootstrapping] = useState(false)

  const getHeaders = async (keyOverride?: string) => {
    const key = (keyOverride || adminKey).trim()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (key) {
      headers["x-admin-key"] = key
    } else {
      const auth = await getAuthHeaders()
      Object.assign(headers, auth)
    }
    return headers
  }

  // Auto-authenticate if user is already logged in as admin
  useEffect(() => {
    if (profile?.role === "admin") {
      setIsAuthenticated(true)
      loadAllAdminData("")
    }
  }, [profile])

  const loadAllAdminData = async (keyOverride?: string) => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getHeaders(keyOverride)

      // 1. Fetch Users
      const usersRes = await fetch("/api/admin/users", { headers })
      if (!usersRes.ok) {
        if (usersRes.status === 401) {
          throw new Error("Invalid administrative authorization key or session.")
        }
      } else {
        const uData = await usersRes.json()
        setUsers(uData.users || [])
      }

      // 2. Fetch Invitations
      const invRes = await fetch("/api/admin/invitations", { headers })
      if (invRes.ok) {
        const iData = await invRes.json()
        setInvitations(iData.invitations || [])
      }

      // 3. Fetch Waitlist
      const waitRes = await fetch("/api/admin/early-access", { headers })
      if (waitRes.ok) {
        const wData = await waitRes.json()
        setSignups(wData.signups || [])
      }

      // 4. Fetch Audit Logs
      const auditRes = await fetch("/api/admin/audit-logs", { headers })
      if (auditRes.ok) {
        const aData = await auditRes.json()
        setAuditLogs(aData.auditLogs || [])
      }

      setIsAuthenticated(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load administrative data")
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleManualAuth = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminKey.trim()) {
      setError("Please enter your admin credentials key.")
      return
    }
    loadAllAdminData(adminKey)
  }

  const handleUserAction = async (
    targetUserId: string,
    action: "approve" | "suspend" | "revoke" | "change_plan" | "grant_credits",
    extra: { plan?: "free_trial" | "builder" | "pro" | "enterprise"; credits?: number } = {},
  ) => {
    setError(null)
    setSuccessMsg(null)
    try {
      const headers = await getHeaders()
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          targetUserId,
          action,
          plan: extra.plan,
          credits: extra.credits,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Action failed")
      }

      setSuccessMsg(`User action '${action}' applied successfully!`)
      await loadAllAdminData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user")
    }
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingInvite(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const headers = await getHeaders()
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create",
          plan: newInvitePlan,
          initialCredits: newInviteCredits,
          expiresInDays: newInviteDays,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || "Failed to create invitation")
      }

      const data = await res.json()
      setSuccessMsg(`Generated invitation code: ${data.invitation.code}`)
      await loadAllAdminData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create invitation")
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const headers = await getHeaders()
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "revoke", inviteId }),
      })
      if (!res.ok) {
        throw new Error("Failed to revoke invitation")
      }
      setSuccessMsg("Invitation code revoked.")
      await loadAllAdminData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Revoke failed")
    }
  }

  const handleBootstrapOwner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bootstrapEmail.trim()) return
    setBootstrapping(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const headers = await getHeaders()
      const res = await fetch("/api/admin/bootstrap-owner", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: bootstrapEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Bootstrap promotion failed")
      }
      setSuccessMsg(data.message)
      setBootstrapEmail("")
      await loadAllAdminData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to promote owner")
    } finally {
      setBootstrapping(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      const headers = await getHeaders()
      const res = await fetch("/api/admin/early-access?format=csv", { headers })
      if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chainforge-early-access-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "CSV download failed")
    }
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === "all" || u.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="page pb-12">
      <PageHeading
        title="Commercial SaaS Admin Console"
        description="Controlled user approvals, subscription plans, atomic credit grants, invitation codes, and security audit logs."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="cyan">{users.length} SaaS Users</Badge>
            <Badge tone="brand">{invitations.length} Invites</Badge>
            <Badge tone="neutral">{signups.length} Leads</Badge>
          </div>
        }
      />

      {/* Auth Gate Header Card */}
      <Card className="settings-card mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2.5 rounded-lg bg-brand/10 text-brand">
              <Icon name="shield" className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold">Administrative Access Gate</h4>
              <p className="text-xs text-muted">
                {isAuthenticated
                  ? "Authenticated with Administrative Privileges."
                  : "Enter server administrative key or sign in with an Admin account."}
              </p>
            </div>
          </div>

          {!isAuthenticated ? (
            <form onSubmit={handleManualAuth} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter Admin Key"
                className="text-xs font-mono"
              />
              <Button type="submit" variant="primary" size="sm" disabled={loading}>
                {loading ? "Verifying..." : "Authenticate"}
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <Badge tone="success">Access Granted</Badge>
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={() => loadAllAdminData()}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/40 rounded text-red-400 text-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-500/40 rounded text-green-300 text-xs">
            {successMsg}
          </div>
        )}
      </Card>

      {isAuthenticated && (
        <>
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-border/60 pb-3 overflow-x-auto whitespace-nowrap -webkit-overflow-scrolling-touch scrollbar-none">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 ${
                activeTab === "users"
                  ? "bg-brand text-black"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon name="users" className="size-4" />
              <span>Users & Approvals ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("invitations")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 ${
                activeTab === "invitations"
                  ? "bg-brand text-black"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon name="code" className="size-4" />
              <span>Invitation Codes ({invitations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("waitlist")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 ${
                activeTab === "waitlist"
                  ? "bg-brand text-black"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon name="target" className="size-4" />
              <span>Waitlist Leads ({signups.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition flex-shrink-0 ${
                activeTab === "audit"
                  ? "bg-brand text-black"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon name="activity" className="size-4" />
              <span>Audit Logs ({auditLogs.length})</span>
            </button>
          </div>

          {/* TAB 1: USERS & APPROVALS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Owner Bootstrap Box */}
              <Card className="settings-card bg-brand/5 border-brand/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-brand-bright uppercase tracking-wider">
                      Emergency Owner Bootstrap
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Promote any registered account to Admin with Enterprise plan & 1,000 initial credits.
                    </p>
                  </div>
                  <form onSubmit={handleBootstrapOwner} className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="email"
                      value={bootstrapEmail}
                      onChange={(e) => setBootstrapEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="text-xs"
                      required
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={bootstrapping}>
                      {bootstrapping ? "Promoting..." : "Promote Admin"}
                    </Button>
                  </form>
                </div>
              </Card>

              {/* Users Table */}
              <Card className="settings-card">
                <SectionHeading
                  title="User Accounts & Entitlements"
                  description="Approve pending registrations, manage commercial plans, and adjust user credit balances."
                />

                {/* Filter Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4 mb-4">
                  <div className="sm:col-span-8">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search users by email or name..."
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-[#161b22] border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Approval</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="py-2.5">User</th>
                        <th className="py-2.5">Role</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">Plan</th>
                        <th className="py-2.5">Credits</th>
                        <th className="py-2.5">Registered</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted">
                            No user accounts match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-muted/10">
                            <td className="py-3">
                              <div className="font-semibold text-foreground">{u.email}</div>
                              {u.full_name && <div className="text-[11px] text-muted">{u.full_name}</div>}
                            </td>
                            <td className="py-3">
                              <Badge tone={u.role === "admin" ? "brand" : "neutral"}>
                                {u.role.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge
                                tone={
                                  u.status === "active"
                                    ? "success"
                                    : u.status === "pending"
                                    ? "warning"
                                    : "danger"
                                }
                              >
                                {u.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <span className="font-mono uppercase font-bold text-[10px] text-brand-bright">
                                {u.plan.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="font-bold font-mono text-cyan-400">
                                ⚡ {u.credits_balance}
                              </span>
                            </td>
                            <td className="py-3 text-muted">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {u.status === "pending" && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleUserAction(u.id, "approve")}
                                  >
                                    Approve (+50c)
                                  </Button>
                                )}
                                {u.status === "active" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleUserAction(u.id, "suspend")}
                                  >
                                    Suspend
                                  </Button>
                                )}
                                {u.status === "suspended" && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleUserAction(u.id, "approve")}
                                  >
                                    Reactivate
                                  </Button>
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleUserAction(u.id, "grant_credits", { credits: 100 })}
                                  title="Grant 100 credits"
                                >
                                  +100c
                                </Button>
                                <select
                                  value={u.plan}
                                  onChange={(e) =>
                                    handleUserAction(u.id, "change_plan", {
                                      plan: e.target.value as any,
                                    })
                                  }
                                  className="bg-[#161b22] border border-border text-[11px] rounded px-1.5 py-1 text-foreground"
                                >
                                  <option value="free_trial">Free Trial</option>
                                  <option value="builder">Builder</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: INVITATIONS */}
          {activeTab === "invitations" && (
            <div className="space-y-6">
              {/* Generate Invite Code Form */}
              <Card className="settings-card">
                <SectionHeading
                  title="Generate Invitation Code"
                  description="Create single-use access invitation codes with pre-configured tier plans and credit balances."
                />

                <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="text-xs text-muted block mb-1">Tier Plan</label>
                    <select
                      value={newInvitePlan}
                      onChange={(e) => {
                        const plan = e.target.value as any
                        setNewInvitePlan(plan)
                        setNewInviteCredits(plan === "pro" ? 250 : plan === "enterprise" ? 1000 : 50)
                      }}
                      className="w-full bg-[#161b22] border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-brand"
                    >
                      <option value="builder">Builder Plan</option>
                      <option value="pro">Pro Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted block mb-1">Initial Credits</label>
                    <Input
                      type="number"
                      value={newInviteCredits}
                      onChange={(e) => setNewInviteCredits(parseInt(e.target.value) || 0)}
                      min={10}
                      max={10000}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted block mb-1">Expires In (Days)</label>
                    <Input
                      type="number"
                      value={newInviteDays}
                      onChange={(e) => setNewInviteDays(parseInt(e.target.value) || 1)}
                      min={1}
                      max={365}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button type="submit" variant="primary" className="w-full" disabled={creatingInvite}>
                      {creatingInvite ? "Generating..." : "Generate Invite Code"}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Invitations Table */}
              <Card className="settings-card">
                <SectionHeading
                  title="All Issued Invitation Codes"
                  description="Track invitation redemption status and revoke active codes."
                />

                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="py-2.5">Code</th>
                        <th className="py-2.5">Plan</th>
                        <th className="py-2.5">Credits</th>
                        <th className="py-2.5">Expires</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {invitations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted">
                            No invitation codes issued yet. Generate your first code above.
                          </td>
                        </tr>
                      ) : (
                        invitations.map((inv) => {
                          const isExpired = new Date(inv.expires_at).getTime() < Date.now()
                          const isRedeemed = Boolean(inv.used_by)
                          return (
                            <tr key={inv.id} className="hover:bg-muted/10">
                              <td className="py-3 font-mono font-bold text-foreground flex items-center gap-2">
                                <span>{inv.code}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(inv.code)
                                    setSuccessMsg(`Copied ${inv.code} to clipboard!`)
                                  }}
                                  className="text-muted hover:text-brand"
                                  title="Copy code"
                                >
                                  <Icon name="copy" className="size-3.5" />
                                </button>
                              </td>
                              <td className="py-3 uppercase font-mono text-[11px] text-brand-bright">
                                {inv.plan}
                              </td>
                              <td className="py-3 font-mono font-bold text-cyan-400">
                                ⚡ {inv.initial_credits}
                              </td>
                              <td className="py-3 text-muted">
                                {new Date(inv.expires_at).toLocaleDateString()}
                              </td>
                              <td className="py-3">
                                {inv.is_revoked ? (
                                  <Badge tone="danger">Revoked</Badge>
                                ) : isRedeemed ? (
                                  <Badge tone="success">Redeemed</Badge>
                                ) : isExpired ? (
                                  <Badge tone="neutral">Expired</Badge>
                                ) : (
                                  <Badge tone="cyan">Available</Badge>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                {!inv.is_revoked && !isRedeemed && !isExpired && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => handleRevokeInvite(inv.id)}
                                  >
                                    Revoke
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: WAITLIST LEADS */}
          {activeTab === "waitlist" && (
            <Card className="settings-card">
              <div className="flex items-center justify-between mb-4">
                <SectionHeading
                  title="Early Access Submissions"
                  description="Public waitlist signups captured from the marketing landing page."
                />
                <Button
                  variant="secondary"
                  icon="download"
                  onClick={handleExportCsv}
                  disabled={signups.length === 0}
                >
                  Export CSV
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Role</th>
                      <th className="py-2.5">Project Stage</th>
                      <th className="py-2.5">Blockchain</th>
                      <th className="py-2.5">Signed Up</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {signups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted">
                          No waitlist signups found.
                        </td>
                      </tr>
                    ) : (
                      signups.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/10">
                          <td className="py-3 font-semibold text-foreground">{s.email}</td>
                          <td className="py-3 capitalize">{s.role}</td>
                          <td className="py-3">{s.stage}</td>
                          <td className="py-3">
                            <Badge tone="cyan">{s.blockchain}</Badge>
                          </td>
                          <td className="py-3 text-muted">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <Badge tone="success">Verified</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "audit" && (
            <Card className="settings-card">
              <SectionHeading
                title="Administrative Audit Trail"
                description="Tamper-evident record of administrative approvals, plan changes, credit grants, and revocations."
              />

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-2.5">Timestamp</th>
                      <th className="py-2.5">Action</th>
                      <th className="py-2.5">Admin ID</th>
                      <th className="py-2.5">Target User</th>
                      <th className="py-2.5">Details</th>
                      <th className="py-2.5">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 font-mono text-[11px]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted font-sans">
                          No administrative actions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="py-2.5 text-muted">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-bold text-brand-bright">
                            {log.action}
                          </td>
                          <td className="py-2.5 text-muted truncate max-w-[120px]">
                            {log.admin_id || "System"}
                          </td>
                          <td className="py-2.5 text-foreground truncate max-w-[120px]">
                            {log.target_user_id || "N/A"}
                          </td>
                          <td className="py-2.5 text-muted truncate max-w-[240px]">
                            {JSON.stringify(log.details)}
                          </td>
                          <td className="py-2.5 text-muted">
                            {log.ip_address || "local"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
