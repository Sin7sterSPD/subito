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
import { addresses } from "./addresses";
import { catalogs, bundles } from "./listings";
import { coupons } from "./coupons";

export const bookingTypeEnum = pgEnum("booking_type", [
  "INSTANT",
  "SCHEDULED",
  "RECURRING",
]);

export const recurringTypeEnum = pgEnum("recurring_type", [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").references(() => addresses.id, {
    onDelete: "set null",
  }),
  bundleId: uuid("bundle_id").references(() => bundles.id, {
    onDelete: "set null",
  }),
  couponId: uuid("coupon_id").references(() => coupons.id, {
    onDelete: "set null",
  }),
  bookingType: bookingTypeEnum("booking_type").default("SCHEDULED").notNull(),
  recurringType: recurringTypeEnum("recurring_type"),
  timeSlot: jsonb("time_slot"),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  totalAfterDiscount: decimal("total_after_discount", {
    precision: 12,
    scale: 2,
  })
    .default("0")
    .notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  gstAmount: decimal("gst_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  surgePrice: decimal("surge_price", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  finalAmount: decimal("final_amount", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  surgeApplicable: boolean("surge_applicable").default(false),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  catalogId: uuid("catalog_id")
    .notNull()
    .references(() => catalogs.id, { onDelete: "cascade" }),
  listingItemId: varchar("listing_item_id", { length: 255 }),
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  isQuickAdd: boolean("is_quick_add").default(false),
  propertyConfig: jsonb("property_config"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  address: one(addresses, {
    fields: [carts.addressId],
    references: [addresses.id],
  }),
  bundle: one(bundles, {
    fields: [carts.bundleId],
    references: [bundles.id],
  }),
  coupon: one(coupons, {
    fields: [carts.couponId],
    references: [coupons.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  catalog: one(catalogs, {
    fields: [cartItems.catalogId],
    references: [catalogs.id],
  }),
}));
