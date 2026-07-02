// Pure seat-availability helpers — no server-only dependency, so both API
// routes and client components can compute the same "is this seat taken"
// answer from a list of existing bookings.

export interface BookingSlot {
  time: string
  duration: number
  seats: string
}

/** Parses a comma-separated seat list (e.g. "1, 3, 7") into 1-based numbers. */
export function parseSeats(seats: string): number[] {
  return seats
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
}

/** Time slots are always on the hour ("HH:00") — extract the hour as a number. */
export function timeToHour(time: string): number {
  return Number(time.split(':')[0]) || 0
}

/** Whether two [start, start+duration) hour ranges overlap. */
export function rangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  return startA < startB + durationB && startB < startA + durationA
}

/**
 * Given a center's existing bookings (same date) and a candidate
 * time/duration, returns the set of 1-based seat numbers that are occupied
 * for any time-overlapping booking.
 */
export function computeOccupiedSeats(
  bookings: BookingSlot[],
  time: string,
  duration: number,
): Set<number> {
  const startA = timeToHour(time)
  const occupied = new Set<number>()
  for (const b of bookings) {
    if (rangesOverlap(startA, duration, timeToHour(b.time), b.duration)) {
      for (const seat of parseSeats(b.seats)) occupied.add(seat)
    }
  }
  return occupied
}
