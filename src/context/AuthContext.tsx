// src/context/AuthContext.tsx
// Global authentication context providing user, profile, status, credits, and modal triggers

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import {
  supabase,
  AuthService,
  type UserProfile,
} from "../services/supabaseClient"
import type { User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  profile: UserProfile | null
  creditsBalance: number
  loading: boolean
  isAuthModalOpen: boolean
  authModalMode: "signin" | "signup" | "forgot"
  openAuthModal: (mode?: "signin" | "signup" | "forgot") => void
  closeAuthModal: () => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup" | "forgot">("signin")

  const fetchProfile = async (userId: string) => {
    try {
      const p = await AuthService.getProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  useEffect(() => {
    // Initial session lookup
    AuthService.getSession().then((session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Listen to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const openAuthModal = (mode: "signin" | "signup" | "forgot" = "signin") => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const signOut = async () => {
    await AuthService.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        creditsBalance: profile?.credits_balance ?? 0,
        loading,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
