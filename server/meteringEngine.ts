// server/meteringEngine.ts
// Two-Phase Atomic Credit Metering & Reservation Engine
// Guarantees zero double-charging and automatic refund if generation or compilation aborts

import { createClient } from "@supabase/supabase-js"

export class MeteringError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 402,
    public readonly balance?: number,
  ) {
    super(message)
    this.name = "MeteringError"
  }
}

export type MeteredReservation = {
  reservationId: string
  userId: string
  cost: number
  remainingBalance: number
}

export async function reserveCredits(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  cost: number,
  operationType: string,
  idempotentKey: string,
  metadata: Record<string, unknown> = {},
): Promise<MeteredReservation> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.rpc("reserve_user_credits", {
    p_user_id: userId,
    p_cost: cost,
    p_op_type: operationType,
    p_idempotent_key: idempotentKey,
    p_metadata: metadata,
  })

  if (error || !data?.success) {
    const errorMsg = data?.error || error?.message || "Failed to reserve operation credits"
    const available = data?.available_credits
    throw new MeteringError(errorMsg, 402, available)
  }

  return {
    reservationId: data.reservation_id,
    userId,
    cost,
    remainingBalance: data.remaining_balance,
  }
}

export async function commitCredits(
  supabaseUrl: string,
  supabaseKey: string,
  reservationId: string,
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.rpc("commit_user_credits", {
    p_reservation_id: reservationId,
  })

  if (error || !data?.success) {
    console.error("[Metering] Failed to commit reservation:", reservationId, error || data?.error)
  }
}

export async function releaseCredits(
  supabaseUrl: string,
  supabaseKey: string,
  reservationId: string,
  reason: string,
): Promise<void> {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.rpc("release_user_credits", {
    p_reservation_id: reservationId,
    p_reason: reason,
  })

  if (error || !data?.success) {
    console.error("[Metering] Failed to release/refund reservation:", reservationId, error || data?.error)
  }
}

/**
 * Higher-order execution wrapper that reserves credits, executes the operation,
 * commits on success, and releases/refunds credits if the operation throws.
 */
export async function withCreditMetering<T>(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string,
  cost: number,
  operationType: string,
  idempotentKey: string,
  operation: (reservation: MeteredReservation) => Promise<T>,
): Promise<T> {
  const reservation = await reserveCredits(
    supabaseUrl,
    supabaseKey,
    userId,
    cost,
    operationType,
    idempotentKey,
  )

  try {
    const result = await operation(reservation)
    await commitCredits(supabaseUrl, supabaseKey, reservation.reservationId)
    return result
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err)
    await releaseCredits(supabaseUrl, supabaseKey, reservation.reservationId, reason)
    throw err
  }
}
