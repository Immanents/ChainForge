// src/components/auth/AuthModal.tsx
// Sign in, registration with invitation code, and password recovery modal

import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { AuthService } from "../../services/supabaseClient"
import { Icon } from "../Icons"
import { Button, Card, Input } from "../ui"
import { BRAND_LOGO_DATA_URI } from "../../assets/brandLogoData"

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (!isAuthModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      if (authModalMode === "signin") {
        await AuthService.signIn(email, password)
        closeAuthModal()
      } else if (authModalMode === "signup") {
        if (!email.trim() || !password.trim()) {
          throw new Error("Please fill in all required fields.")
        }
        await AuthService.signUp(email, password, fullName, inviteCode)
        setSuccessMessage(
          inviteCode.trim()
            ? "Account created and activated! You can now sign in."
            : "Registration submitted! Your account is pending administrator approval before access is granted."
        )
      } else if (authModalMode === "forgot") {
        await AuthService.resetPassword(email)
        setSuccessMessage("Password reset email sent! Please check your inbox.")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <Card className="w-full max-w-md border border-border bg-[#0d1117] text-foreground p-5 sm:p-6 shadow-2xl rounded-2xl relative max-h-[92dvh] overflow-y-auto">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors p-1"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-6">
          <img src={BRAND_LOGO_DATA_URI} alt="ChainForge Logo" className="w-8 h-8 rounded-lg" />
          <div>
            <h3 className="text-lg font-bold">
              {authModalMode === "signin" && "Sign In to ChainForge"}
              {authModalMode === "signup" && "Create SaaS Account"}
              {authModalMode === "forgot" && "Reset Password"}
            </h3>
            <p className="text-xs text-muted">
              {authModalMode === "signin" && "Enter your credentials to access the Web3 Build Engine"}
              {authModalMode === "signup" && "Controlled access: invitation or administrator approved onboarding"}
              {authModalMode === "forgot" && "We'll send you a secure link to reset your password"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <Icon name="shield" className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Icon name="check" className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {authModalMode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Full Name</label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Maya Chen"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@example.com"
              required
            />
          </div>

          {authModalMode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-muted">Password</label>
                {authModalMode === "signin" && (
                  <button
                    type="button"
                    onClick={() => openAuthModal("forgot")}
                    className="text-xs text-brand hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </div>
          )}

          {authModalMode === "signup" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-muted">
                  Invitation Code <span className="text-muted/60">(Optional)</span>
                </label>
                <span className="text-[10px] text-cyan-400">Instantly activates account</span>
              </div>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. CF-ALPHA-2026"
              />
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5 justify-center"
            disabled={loading}
          >
            {loading ? "Processing..." : authModalMode === "signin" ? "Sign In" : authModalMode === "signup" ? "Register Account" : "Send Reset Email"}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-border/60 text-center text-xs text-muted">
          {authModalMode === "signin" && (
            <p>
              Need an account?{" "}
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="text-brand font-semibold hover:underline"
              >
                Register here
              </button>
            </p>
          )}

          {authModalMode === "signup" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="text-brand font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          )}

          {authModalMode === "forgot" && (
            <p>
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="text-brand font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
