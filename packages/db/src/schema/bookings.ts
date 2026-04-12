import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  pgEnum,
  decimal,
  integer,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { partners } from "./partners";
import { addresses } from "./addresses";
import { catalogs, bundles } from "./listings";
import { coupons } from "./coupons";
import { hubs, microHubs } from "./hubs";
import { bookingTypeEnum, recurringTypeEnum } from "./carts";

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "PENDING_MATCH",
  "MATCHED",
  "ARRIVING",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

export const cancellationReasonEnum = pgEnum("cancellation_reason", [
  "USER_REQUESTED",
  "PARTNER_UNAVAILABLE",
  "NO_PARTNERS_FOUND",
  "PAYMENT_FAILED",
  "SYSTEM_ERROR",
  "WEATHER",
  "OTHER",
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingNumber: varchar("booking_number", { length: 50 }).unique().notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  addressId: uuid("address_id")
    .notNull()
    .references(() => addresses.id),
  hubId: uuid("hub_id").references(() => hubs.id),
  microHubId: uuid("micro_hub_id").references(() => microHubs.id),
  bundleId: uuid("bundle_id").references(() => bundles.id),
  couponId: uuid("coupon_id").references(() => coupons.id),
  parentBookingId: uuid("parent_booking_id"),
  orderId: uuid("order_id"),
  
  status: bookingStatusEnum("status").default("PENDING_PAYMENT").notNull(),
  bookingType: bookingTypeEnum("booking_type").default("SCHEDULED").notNull(),
  recurringType: recurringTypeEnum("recurring_type"),
  
  scheduledDate: timestamp("scheduled_date"),
  scheduledStartTime: varchar("scheduled_start_time", { length: 20 }),
  scheduledEndTime: varchar("scheduled_end_time", { length: 20 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: cancellationReasonEnum("cancellation_reason"),
  cancellationNote: text("cancellation_note"),
  
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0"),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 }).default("0"),
  surgeAmount: decimal("surge_amount", { precision: 12, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0"),
  
  estimatedDuration: integer("estimated_duration"),
  actualDuration: integer("actual_duration"),
  
  customerNotes: text("customer_notes"),
  partnerNotes: text("partner_notes"),
  adminNotes: text("admin_notes"),

  /** Customer requested cancel while partner assigned; partner must ack release. */
  cancellationAwaitingPartnerAck: boolean("cancellation_awaiting_partner_ack")
    .default(false)
    .notNull(),
  partnerReleaseAcknowledgedAt: timestamp("partner_release_acknowledged_at"),
  cancellationRequestedAt: timestamp("cancellation_requested_at"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// DB-level idempotency tracking (Layer 2 safety net)
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // booking, payment, order
  resourceId: uuid("resource_id"),
  requestHash: varchar("request_hash", { length: 64 }).notNull(),
  responseCode: integer("response_code"),
  responseBody: jsonb("response_body"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingItems = pgTable("booking_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  catalogId: uuid("catalog_id")
    .notNull()
    .references(() => catalogs.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  propertyConfig: jsonb("property_config"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recurringBookings = pgTable("recurring_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  recurringType: recurringTypeEnum("recurring_type").notNull(),
  recurringDays: integer("recurring_days").array(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  totalInstances: integer("total_instances"),
  completedInstances: integer("completed_instances").default(0),
  cancelledInstances: integer("cancelled_instances").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingInstanceStatusEnum = pgEnum("booking_instance_status", [
  "SCHEDULED",
  "PENDING_MATCH",
  "MATCHED",
  "ARRIVING",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "SKIPPED",
]);

export const bookingInstances = pgTable("booking_instances", {
  id: uuid("id").primaryKey().defaultRandom(),
  recurringBookingId: uuid("recurring_booking_id")
    .notNull()
    .references(() => recurringBookings.id, { onDelete: "cascade" }),
  parentBookingId: uuid("parent_booking_id")
    .notNull()
    .references(() => bookings.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  instanceNumber: integer("instance_number").notNull(),
  status: bookingInstanceStatusEnum("status").default("SCHEDULED").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 20 }),
  rescheduledFrom: timestamp("rescheduled_from"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingSlots = pgTable("booking_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id").references(() => hubs.id),
  microHubId: uuid("micro_hub_id").references(() => microHubs.id),
  date: timestamp("date").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  maxCapacity: integer("max_capacity").default(10).notNull(),
  currentBookings: integer("current_bookings").default(0),
  isAvailable: boolean("is_available").default(true).notNull(),
  surgeMultiplier: doublePrecision("surge_multiplier").default(1.0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookingStatusHistory = pgTable("booking_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  bookingInstanceId: uuid("booking_instance_id").references(
    () => bookingInstances.id,
    { onDelete: "cascade" }
  ),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [bookings.partnerId],
    references: [partners.id],
  }),
  address: one(addresses, {
    fields: [bookings.addressId],
    references: [addresses.id],
  }),
  hub: one(hubs, {
    fields: [bookings.hubId],
    references: [hubs.id],
  }),
  microHub: one(microHubs, {
    fields: [bookings.microHubId],
    references: [microHubs.id],
  }),
  bundle: one(bundles, {
    fields: [bookings.bundleId],
    references: [bundles.id],
  }),
  coupon: one(coupons, {
    fields: [bookings.couponId],
    references: [coupons.id],
  }),
  parentBooking: one(bookings, {
    fields: [bookings.parentBookingId],
    references: [bookings.id],
  }),
  items: many(bookingItems),
  recurringConfig: one(recurringBookings),
  statusHistory: many(bookingStatusHistory),
}));

export const bookingItemsRelations = relations(bookingItems, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingItems.bookingId],
    references: [bookings.id],
  }),
  catalog: one(catalogs, {
    fields: [bookingItems.catalogId],
    references: [catalogs.id],
  }),
}));

export const recurringBookingsRelations = relations(
  recurringBookings,
  ({ one, many }) => ({
    booking: one(bookings, {
      fields: [recurringBookings.bookingId],
      references: [bookings.id],
    }),
    instances: many(bookingInstances),
  })
);

export const bookingInstancesRelations = relations(
  bookingInstances,
  ({ one }) => ({
    recurringBooking: one(recurringBookings, {
      fields: [bookingInstances.recurringBookingId],
      references: [recurringBookings.id],
    }),
    parentBooking: one(bookings, {
      fields: [bookingInstances.parentBookingId],
      references: [bookings.id],
    }),
    partner: one(partners, {
      fields: [bookingInstances.partnerId],
      references: [partners.id],
    }),
  })
);

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  user: one(users, {
    fields: [idempotencyKeys.userId],
    references: [users.id],
  }),
}));
