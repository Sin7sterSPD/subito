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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const discountTypeEnum = pgEnum("discount_type", [
  "PERCENTAGE",
  "FLAT",
]);

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  discountType: discountTypeEnum("discount_type").notNull(),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  minCartValue: decimal("min_cart_value", { precision: 10, scale: 2 }),
  maxUsageTotal: integer("max_usage_total"),
  maxUsagePerUser: integer("max_usage_per_user").default(1),
  currentUsageTotal: integer("current_usage_total").default(0),
  applicableCategories: uuid("applicable_categories").array(),
  applicableListings: uuid("applicable_listings").array(),
  excludedCategories: uuid("excluded_categories").array(),
  excludedListings: uuid("excluded_listings").array(),
  isFirstTimeOnly: boolean("is_first_time_only").default(false),
  validFrom: timestamp("valid_from").notNull(),
  validTill: timestamp("valid_till").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const couponUsage = pgTable("coupon_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id"),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  usage: many(couponUsage),
}));

export const couponUsageRelations = relations(couponUsage, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUsage.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponUsage.userId],
    references: [users.id],
  }),
}));
