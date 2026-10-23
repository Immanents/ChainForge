// src/components/auth/AccountStatusBanner.tsx
// Status bar indicating account state (pending, suspended, revoked, active plan & credits)

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../services/supabaseClient"
import { Icon } from "../Icons"
import { Badge, Button, Input } from "../ui"

export function AccountStatusBanner() {
  const { user, profile, refreshProfile, openAuthModal } = useAuth()
  const [inviteInput, setInviteInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!user) {
    return (
      <div className="bg-brand/10 border-b border-brand/20 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-brand-bright">
          <Icon name="shield" className="size-4 shrink-0" />
          <span>
            <strong>Private SaaS Mode:</strong> You are currently in preview mode. Sign in or register to generate blueprints, export codebases, and deploy smart contracts.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openAuthModal("signin")}>
            Sign In
          </Button>
          <Button variant="primary" size="sm" onClick={() => openAuthModal("signup")}>
            Register / Invite
          </Button>
        </div>
      </div>
    )
  }

  if (profile?.status === "suspended") {
    return (
      <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="shield" className="size-4 shrink-0" />
          <span>
            <strong>Account Suspended:</strong> Your access to ChainForge AI features is currently suspended. Please contact an administrator.
          </span>
        </div>
        <Badge tone="danger">Suspended</Badge>
      </div>
    )
  }

  if (profile?.status === "revoked") {
    return (
      <div className="bg-red-900/20 border-b border-red-500/30 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="close" className="size-4 shrink-0" />
          <span>
            <strong>Access Revoked:</strong> Your account access has been revoked.
          </span>
        </div>
        <Badge tone="danger">Revoked</Badge>
      </div>
    )
  }

  if (profile?.status === "pending") {
    const handleRedeem = async () => {
      if (!inviteInput.trim()) return
      setSubmitting(true)
      setMsg(null)
      try {
        const { data, error } = await supabase.rpc("redeem_invitation_code", {
          p_user_id: user.id,
          p_code: inviteInput.trim(),
        })
        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "Failed to redeem code")
        }
        setMsg(`Activated! Plan: ${data.plan}, Credits: +${data.credits_granted}`)
        await refreshProfile()
      } catch (err: unknown) {
        setMsg(err instanceof Error ? err.message : "Invalid code")
      } finally {
        setSubmitting(false)
      }
    }

    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="clock" className="size-4 shrink-0" />
          <span>
            <strong>Account Pending Approval:</strong> Your registration is awaiting administrator review. Have an invite code?
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            placeholder="Enter Invite Code"
            className="h-7 text-xs w-44"
          />
          <Button variant="secondary" size="sm" onClick={handleRedeem} disabled={submitting}>
            {submitting ? "..." : "Activate"}
          </Button>
          {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        </div>
      </div>
    )
  }

  // Active status
  return null
}
