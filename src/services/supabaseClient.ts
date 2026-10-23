// src/services/supabaseClient.ts
// Supabase Authentication & Client Service for ChainForge Commercial SaaS

import { createClient, type User, type Session } from "@supabase/supabase-js"

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://zrxgkyhzqdyyqtsmwixy.supabase.co"

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyeGdreWh6cWR5eXF0c213aXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2MDExMDgsImV4cCI6MjEwODE3NzEwOH0.mYwn0fDz24yFOjAuhDy1JCjifwht4-FzkTHw-OKPNrs"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type UserProfile = {
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

export class AuthService {
  public static async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession()
    return data.session
  }

  public static async getUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser()
    return data.user
  }

  public static async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (error || !data) return null
    return data as UserProfile
  }

  public static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  public static async signUp(
    email: string,
    password: string,
    fullName: string,
    inviteCode?: string,
  ) {
    // 1. If an invitation code is provided, validate it first
    if (inviteCode && inviteCode.trim()) {
      const { data: invRes, error: invErr } = await supabase.rpc("validate_invitation_code", {
        p_code: inviteCode.trim(),
      })
      if (invErr || !invRes?.valid) {
        throw new Error(invRes?.reason || "Invalid, expired, or redeemed invitation code.")
      }
    }

    // 2. Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error

    // 3. If invitation code provided and user created, redeem it
    if (data.user && inviteCode && inviteCode.trim()) {
      await supabase.rpc("redeem_invitation_code", {
        p_user_id: data.user.id,
        p_code: inviteCode.trim(),
      })
    }

    return data
  }

  public static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  public static async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    })
    if (error) throw error
    return data
  }

  public static async validateInviteCode(code: string): Promise<{
    valid: boolean
    plan?: string
    initial_credits?: number
    reason?: string
  }> {
    const { data, error } = await supabase.rpc("validate_invitation_code", {
      p_code: code.trim(),
    })
    if (error) {
      return { valid: false, reason: error.message }
    }
    return data
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

