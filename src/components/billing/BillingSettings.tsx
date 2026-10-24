// src/components/billing/BillingSettings.tsx
// Complete Subscription & Commercial Billing Portal for ChainForge AI
// Paystack checkout, monthly allowances, credit top-ups, invoice history, and subscription cancellation

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { getAuthHeaders } from "../../services/supabaseClient"
import { Icon } from "../Icons"
import { Badge, Button, Card, SectionHeading } from "../ui"

type SubscriptionData = {
  id: string
  plan_id: string
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "expired"
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  plan?: {
    name: string
    tier: string
    interval: string
    price_minor_units: number
    currency: string
    monthly_credit_allowance: number
  }
}

type PaymentTx = {
  id: string
  reference: string
  type: "subscription" | "credit_topup"
  amount_minor_units: number
  currency: string
  status: "pending" | "success" | "failed" | "refunded"
  created_at: string
  paid_at: string | null
}

export function BillingSettings() {
  const { user, profile, creditsBalance, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [transactions, setTransactions] = useState<PaymentTx[]>([])
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly")
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [processingPackage, setProcessingPackage] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Simulated sandbox checkout handling
  const [sandboxRef, setSandboxRef] = useState<string | null>(null)
  const [verifyingSandbox, setVerifyingSandbox] = useState(false)

  useEffect(() => {
    // Check if redirected back from checkout
    const url = new URL(window.location.href)
    const ref = url.searchParams.get("reference")
    const isSandbox = url.searchParams.get("simulated_checkout") === "true"

    if (ref && isSandbox) {
      setSandboxRef(ref)
    } else if (ref) {
      verifyPayment(ref)
    }

    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/billing/subscription", { headers })
      if (res.ok) {
        const rawText = await res.text()
        try {
          const data = rawText ? JSON.parse(rawText) : null
          if (data) {
            setSubscription(data.subscription)
            setTransactions(data.transactions || [])
          }
        } catch {
          // ignore non-json response
        }
      }
    } catch (err) {
      console.warn("Failed to load billing subscription data:", err)
    } finally {
      setLoading(false)
    }
  }

  const verifyPayment = async (reference: string) => {
    setVerifyingSandbox(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/billing/verify?reference=${encodeURIComponent(reference)}`)
      const rawText = await res.text()
      let data: any = null
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(
          res.status >= 500
            ? "Verification service is busy. Please refresh in a moment."
            : rawText || `Verification failed (HTTP ${res.status})`,
        )
      }

      if (res.ok && data?.success) {
        setMessage({ type: "success", text: "Payment verified successfully! Your plan and credits have been updated." })
        setSandboxRef(null)
        try {
          const cleanUrl = window.location.href.replace(/([?&])(reference|trxref|simulated_checkout)=[^&#]*/gi, "").replace(/&&+/g, "&").replace(/[?&]#/, "#")
          window.history.replaceState({}, document.title, cleanUrl)
        } catch {}
        await refreshProfile()
        await loadBillingData()
      } else {
        setMessage({ type: "error", text: data?.error || "Payment verification failed." })
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Verification failed" })
    } finally {
      setVerifyingSandbox(false)
    }
  }

  const handleCheckoutPlan = async (tier: "pro" | "team") => {
    const planId = `${tier}_${interval}`
    setProcessingPlan(planId)
    setMessage(null)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          type: "subscription",
          planId,
          callbackUrl: `${window.location.origin}/#app/settings?tab=Billing`,
        }),
      })

      const rawText = await res.text()
      let data: any = null
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(
          res.status >= 500
            ? "Payment service is currently initializing or updating. Please try again in a few moments."
            : rawText || `Payment request failed (HTTP ${res.status})`,
        )
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to initialize payment")
      }

      // 1. If Paystack Inline SDK is loaded AND a valid public key is present, open popup directly on screen
      if (data.access_code && !data.authorization_url?.includes("simulated_checkout=true")) {
        const paystackKey = (
          data.public_key ||
          import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
          ""
        ).trim()

        const hasValidPublicKey =
          paystackKey.startsWith("pk_test_") || paystackKey.startsWith("pk_live_")

        if (typeof (window as any).PaystackPop !== "undefined" && hasValidPublicKey) {
          try {
            const popup = (window as any).PaystackPop.setup({
              key: paystackKey,
              email: user?.email,
              amount: data.amount_minor_units,
              access_code: data.access_code,
              callback: (response: any) => {
                verifyPayment(response.reference || data.reference)
              },
              onClose: () => {
                setMessage({ type: "error", text: "Paystack payment window was closed." })
              },
            })
            popup.openIframe()
            return
          } catch (popupErr) {
            console.warn("Paystack Inline failed to open iframe, falling back to hosted page:", popupErr)
          }
        }

        // If public key is not configured, seamlessly open the official Paystack checkout page!
        if (data.authorization_url) {
          window.location.href = data.authorization_url
          return
        }
      }

      // 2. Simulated developer sandbox fallback
      if (data.authorization_url?.includes("simulated_checkout=true")) {
        setSandboxRef(data.reference)
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Checkout error" })
    } finally {
      setProcessingPlan(null)
    }
  }

  const handleCheckoutPackage = async (packageId: "credits_100" | "credits_500" | "credits_2500") => {
    setProcessingPackage(packageId)
    setMessage(null)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          type: "credit_topup",
          packageId,
          callbackUrl: `${window.location.origin}/#app/settings?tab=Billing`,
        }),
      })

      const rawText = await res.text()
      let data: any = null
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(
          res.status >= 500
            ? "Payment service is currently initializing or updating. Please try again in a few moments."
            : rawText || `Top-up request failed (HTTP ${res.status})`,
        )
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to initialize credit purchase")
      }

      // 1. If Paystack Inline SDK is loaded AND a valid public key is present, open popup directly on screen
      if (data.access_code && !data.authorization_url?.includes("simulated_checkout=true")) {
        const paystackKey = (
          data.public_key ||
          import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ||
          ""
        ).trim()

        const hasValidPublicKey =
          paystackKey.startsWith("pk_test_") || paystackKey.startsWith("pk_live_")

        if (typeof (window as any).PaystackPop !== "undefined" && hasValidPublicKey) {
          try {
            const popup = (window as any).PaystackPop.setup({
              key: paystackKey,
              email: user?.email,
              amount: data.amount_minor_units,
              access_code: data.access_code,
              callback: (response: any) => {
                verifyPayment(response.reference || data.reference)
              },
              onClose: () => {
                setMessage({ type: "error", text: "Paystack payment window was closed." })
              },
            })
            popup.openIframe()
            return
          } catch (popupErr) {
            console.warn("Paystack Inline failed to open iframe, falling back to hosted page:", popupErr)
          }
        }

        // If public key is not configured, seamlessly open the official Paystack checkout page!
        if (data.authorization_url) {
          window.location.href = data.authorization_url
          return
        }
      }

      // 2. Simulated developer sandbox fallback
      if (data.authorization_url?.includes("simulated_checkout=true")) {
        setSandboxRef(data.reference)
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Top-up error" })
    } finally {
      setProcessingPackage(null)
    }
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription at the end of the current billing cycle?")) {
      return
    }

    setCanceling(true)
    setMessage(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers,
      })

      const rawText = await res.text()
      let data: any = null
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(
          res.status >= 500
            ? "Billing service temporarily unavailable. Please try again."
            : rawText || `Cancellation failed (HTTP ${res.status})`,
        )
      }

      if (res.ok && data?.success) {
        setMessage({ type: "success", text: "Subscription updated: will cancel at period end." })
        await loadBillingData()
      } else {
        setMessage({ type: "error", text: data?.error || "Failed to cancel subscription." })
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Cancellation failed" })
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status & Feedback Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-950/40 border-green-500/40 text-green-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <Button variant="ghost" size="sm" onClick={() => setMessage(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Simulated Sandbox Checkout Banner */}
      {sandboxRef && (
        <Card className="settings-card bg-brand/10 border-brand/30">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-brand-bright">Paystack Sandbox Checkout Ready</h4>
              <p className="text-xs text-muted mt-0.5">
                Transaction Reference: <code className="font-mono text-cyan-300">{sandboxRef}</code>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => verifyPayment(sandboxRef)}
                disabled={verifyingSandbox}
              >
                {verifyingSandbox ? "Verifying..." : "Complete Test Payment"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSandboxRef(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 1. Current Plan & Quota Card */}
      <Card className="settings-card">
        <SectionHeading
          title="Current Subscription & Entitlements"
          description="Your active SaaS tier, monthly allowance renewal, and available credit balance."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-white/5 border border-border">
            <span className="text-xs text-muted block mb-1">Active Plan</span>
            <div className="flex items-center gap-2">
              <strong className="text-base font-bold capitalize">
                {profile?.plan?.replace("_", " ") || "Free Trial"}
              </strong>
              <Badge tone={profile?.status === "active" ? "success" : "warning"}>
                {profile?.status?.toUpperCase() || "PENDING"}
              </Badge>
            </div>
            <small className="text-[11px] text-muted mt-1 block">
              {subscription?.cancel_at_period_end
                ? "Cancels at end of cycle"
                : subscription?.current_period_end
                ? `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                : "Evaluation access"}
            </small>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-border">
            <span className="text-xs text-muted block mb-1">Available AI Credits</span>
            <div className="flex items-center gap-2">
              <strong className="text-2xl font-mono font-bold text-cyan-400">
                ⚡ {creditsBalance}
              </strong>
            </div>
            <small className="text-[11px] text-muted mt-1 block">
              Blueprint: 10c · Codebase: 25c · Test: 5c
            </small>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-border flex flex-col justify-between">
            <span className="text-xs text-muted block mb-1">Account Identity</span>
            <strong className="text-xs font-mono truncate">{user?.email || "Guest"}</strong>
            <div className="mt-2">
              {subscription?.status === "active" && !subscription?.cancel_at_period_end && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-400 hover:text-red-300 p-0 h-auto"
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                >
                  {canceling ? "Processing..." : "Cancel Subscription"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Subscription Plans */}
      <Card className="settings-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <SectionHeading
            title="Commercial Subscription Plans"
            description="Scale from solo Web3 builder to multi-seat agency with dedicated RPCs and higher allowances."
          />

          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-border">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                interval === "monthly" ? "bg-brand text-black" : "text-muted hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                interval === "yearly" ? "bg-brand text-black" : "text-muted hover:text-foreground"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1 rounded font-bold">17% OFF</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trial Card */}
          <div className="p-5 rounded-2xl border border-border/80 bg-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">Trial</h4>
                <Badge tone="neutral">14 Days</Badge>
              </div>
              <div className="mt-3 mb-4">
                <span className="text-2xl font-bold">$0</span>
                <span className="text-xs text-muted"> / evaluation</span>
              </div>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>50 Starter AI Credits</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>AI Blueprint Synthesizer</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>EVM & Solana Code Generator</span>
                </li>
                <li className="flex items-center gap-2 text-muted/60">
                  <Icon name="close" className="size-3.5 text-muted/40" />
                  <span>No Community Growth Suite</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button variant="secondary" className="w-full" disabled>
                {profile?.plan === "trial" || profile?.plan === "free_trial" ? "Current Tier" : "Trial"}
              </Button>
            </div>
          </div>

          {/* Pro Card */}
          <div className="p-5 rounded-2xl border border-brand/50 bg-brand/5 flex flex-col justify-between relative shadow-lg shadow-brand/5">
            <div className="absolute -top-3 right-4">
              <span className="bg-brand text-black text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-brand-bright">Pro Builder</h4>
                <Badge tone="brand">Individual</Badge>
              </div>
              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-foreground">
                  {interval === "monthly" ? "$49" : "$490"}
                </span>
                <span className="text-xs text-muted"> / {interval === "monthly" ? "month" : "year"}</span>
              </div>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2 text-foreground">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <strong>500 Included Credits / month</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>Full Build Engine & Token Studio</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>Community Intelligence & Channels</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>Campaigns, Content Studio & KOLs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-brand" />
                  <span>Multi-Chain On-Chain Verification</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleCheckoutPlan("pro")}
                disabled={processingPlan !== null || profile?.plan === "pro"}
              >
                {profile?.plan === "pro"
                  ? "Current Plan"
                  : processingPlan === `pro_${interval}`
                  ? "Initializing Paystack..."
                  : "Upgrade to Pro"}
              </Button>
            </div>
          </div>

          {/* Team / Agency Card */}
          <div className="p-5 rounded-2xl border border-border/80 bg-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-foreground">Team / Agency</h4>
                <Badge tone="cyan">5 Seats</Badge>
              </div>
              <div className="mt-3 mb-4">
                <span className="text-3xl font-bold text-foreground">
                  {interval === "monthly" ? "$199" : "$1,990"}
                </span>
                <span className="text-xs text-muted"> / {interval === "monthly" ? "month" : "year"}</span>
              </div>
              <ul className="space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2 text-cyan-300">
                  <Icon name="check" className="size-3.5 text-cyan-400" />
                  <strong>2,500 Included Credits / month</strong>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-cyan-400" />
                  <span>5 Team Seats with RBAC</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-cyan-400" />
                  <span>Priority Codebase Synthesis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-cyan-400" />
                  <span>Dedicated RPC Pipeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check" className="size-3.5 text-cyan-400" />
                  <span>Shared Projects & Team Governance</span>
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleCheckoutPlan("team")}
                disabled={processingPlan !== null || profile?.plan === "team"}
              >
                {profile?.plan === "team"
                  ? "Current Plan"
                  : processingPlan === `team_${interval}`
                  ? "Initializing Paystack..."
                  : "Upgrade to Team"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Additional Prepaid Credit Packages */}
      <Card className="settings-card">
        <SectionHeading
          title="Prepaid AI Credit Packages"
          description="Purchase additional non-expiring AI credits without modifying your subscription interval."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-white/5 border border-border flex flex-col justify-between">
            <div>
              <strong className="text-sm font-bold block">100 AI Credits</strong>
              <span className="text-xs text-muted block mb-3">Starter package</span>
              <div className="text-xl font-bold font-mono">$10.00</div>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCheckoutPackage("credits_100")}
                disabled={processingPackage !== null}
              >
                {processingPackage === "credits_100" ? "Processing..." : "Buy 100 Credits"}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand/5 border border-brand/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <strong className="text-sm font-bold text-brand-bright">500 AI Credits</strong>
                <span className="text-[10px] font-bold text-brand bg-brand/20 px-1.5 py-0.5 rounded">10% OFF</span>
              </div>
              <span className="text-xs text-muted block mb-3">Growth package</span>
              <div className="text-xl font-bold font-mono">$45.00</div>
            </div>
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => handleCheckoutPackage("credits_500")}
                disabled={processingPackage !== null}
              >
                {processingPackage === "credits_500" ? "Processing..." : "Buy 500 Credits"}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-border flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <strong className="text-sm font-bold text-cyan-300">2,500 AI Credits</strong>
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-400/20 px-1.5 py-0.5 rounded">20% OFF</span>
              </div>
              <span className="text-xs text-muted block mb-3">Scale & Agency package</span>
              <div className="text-xl font-bold font-mono">$199.00</div>
            </div>
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleCheckoutPackage("credits_2500")}
                disabled={processingPackage !== null}
              >
                {processingPackage === "credits_2500" ? "Processing..." : "Buy 2,500 Credits"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Billing Transactions & Invoices */}
      <Card className="settings-card">
        <SectionHeading
          title="Payment Transactions & Invoices"
          description="Auditable log of completed checkouts, credit top-ups, and subscription renewals."
        />

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Reference</th>
                <th className="py-2.5">Type</th>
                <th className="py-2.5">Amount</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-[11px]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted font-sans">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10">
                    <td className="py-2.5 text-muted">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 font-bold text-foreground truncate max-w-[140px]">
                      {tx.reference}
                    </td>
                    <td className="py-2.5 capitalize text-brand-bright">
                      {tx.type.replace("_", " ")}
                    </td>
                    <td className="py-2.5 font-bold">
                      ${(tx.amount_minor_units / 100).toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-2.5">
                      <Badge tone={tx.status === "success" ? "success" : tx.status === "pending" ? "warning" : "danger"}>
                        {tx.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
