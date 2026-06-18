import { db } from "@subito/db"
import { bookings } from "@subito/db/schema"
import { eq } from "@subito/db"
import { partnerMatchingQueue } from "../queues"
import { log } from "./logger"
/**
 * Enqueue partner matching for a booking in PENDING_MATCH.
 * Worker skips matching if status !== PENDING_MATCH.
 */
export async function enqueuePartnerMatchingJob(
  bookingId: string
): Promise<void> {
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      address: true,
      items: { with: { catalog: true } },
    },
  })

  if (!booking || booking.status !== "PENDING_MATCH") {
    return
  }

  if (!booking.address) {
    log.warn(`[partner-matching] booking ${bookingId} has no address`)
    return
  }
  const serviceIds = [
    ...new Set(
      (booking.items || [])
        .map((i) => i.catalog?.listingId)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  await partnerMatchingQueue.add("match-booking", {
    bookingId,
    latitude: booking.address.latitude,
    longitude: booking.address.longitude,
    serviceIds: serviceIds.length ? serviceIds : undefined,
  })
}
