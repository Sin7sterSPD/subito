import { z } from "zod";

export const bookingTypeSchema = z.enum(["INSTANT", "SCHEDULED", "RECURRING"]);
export const recurringTypeSchema = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
export const bookingStatusSchema = z.enum([
  "PENDING_PAYMENT",
  "PENDING_MATCH",
  "MATCHED",
  "ARRIVING",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string(),
});

export const rescheduleInstanceSchema = z.object({
  rescheduleTo: z.string(),
});

export type BookingType = z.infer<typeof bookingTypeSchema>;
export type RecurringType = z.infer<typeof recurringTypeSchema>;
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleInstanceInput = z.infer<typeof rescheduleInstanceSchema>;
