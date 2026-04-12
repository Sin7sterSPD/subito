import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { partners } from "./partners";
import { bookings } from "./bookings";

export const ratingStatusEnum = pgEnum("rating_status", [
  "PENDING",
  "SUBMITTED",
  "DISCARDED",
]);

export const ratings = pgTable("ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  partnerId: uuid("partner_id").references(() => partners.id),
  status: ratingStatusEnum("status").default("PENDING").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  tags: text("tags").array(),
  serviceQuality: integer("service_quality"),
  punctuality: integer("punctuality"),
  professionalism: integer("professionalism"),
  cleanliness: integer("cleanliness"),
  isAnonymous: boolean("is_anonymous").default(false),
  partnerResponse: text("partner_response"),
  partnerRespondedAt: timestamp("partner_responded_at"),
  discardedAt: timestamp("discarded_at"),
  discardReason: text("discard_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ratingsRelations = relations(ratings, ({ one }) => ({
  booking: one(bookings, {
    fields: [ratings.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
  partner: one(partners, {
    fields: [ratings.partnerId],
    references: [partners.id],
  }),
}));
