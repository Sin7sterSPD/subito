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

export const partnerStatusEnum = pgEnum("partner_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

export const partnerAvailabilityStatusEnum = pgEnum(
  "partner_availability_status",
  ["online", "offline", "busy"]
);

export const partnerBookingStatusEnum = pgEnum("partner_booking_status", [
  "EN_ROUTE",
  "ARRIVED",
  "WORKING",
  "COMPLETED",
]);

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: partnerStatusEnum("status").default("pending").notNull(),
  availabilityStatus: partnerAvailabilityStatusEnum("availability_status")
    .default("offline")
    .notNull(),
  aadharNumber: varchar("aadhar_number", { length: 20 }),
  panNumber: varchar("pan_number", { length: 20 }),
  bankAccountNumber: varchar("bank_account_number", { length: 30 }),
  bankIfscCode: varchar("bank_ifsc_code", { length: 20 }),
  bankName: varchar("bank_name", { length: 100 }),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default(
    "0"
  ),
  totalRatings: integer("total_ratings").default(0),
  totalBookings: integer("total_bookings").default(0),
  completedBookings: integer("completed_bookings").default(0),
  totalEarnings: decimal("total_earnings", { precision: 12, scale: 2 }).default(
    "0"
  ),
  serviceRadius: integer("service_radius").default(10),
  documents: jsonb("documents"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partnerServices = pgTable("partner_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnerLocations = pgTable("partner_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy"),
  heading: doublePrecision("heading"),
  speed: doublePrecision("speed"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export const partnerAvailability = pgTable("partner_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnerPayouts = pgTable("partner_payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  transactionId: varchar("transaction_id", { length: 100 }),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnersRelations = relations(partners, ({ one, many }) => ({
  user: one(users, {
    fields: [partners.userId],
    references: [users.id],
  }),
  services: many(partnerServices),
  locations: many(partnerLocations),
  availability: many(partnerAvailability),
  payouts: many(partnerPayouts),
}));

export const partnerServicesRelations = relations(
  partnerServices,
  ({ one }) => ({
    partner: one(partners, {
      fields: [partnerServices.partnerId],
      references: [partners.id],
    }),
  })
);

export const partnerLocationsRelations = relations(
  partnerLocations,
  ({ one }) => ({
    partner: one(partners, {
      fields: [partnerLocations.partnerId],
      references: [partners.id],
    }),
  })
);
