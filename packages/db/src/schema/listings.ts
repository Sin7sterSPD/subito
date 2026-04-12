import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  decimal,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  icon: text("icon"),
  image: text("image"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  image: text("image"),
  images: text("images").array(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const catalogs = pgTable("catalogs", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  minQuantity: integer("min_quantity").default(1),
  maxQuantity: integer("max_quantity").default(10),
  stepQuantity: integer("step_quantity").default(1),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const catalogPricing = pgTable("catalog_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  catalogId: uuid("catalog_id")
    .notNull()
    .references(() => catalogs.id, { onDelete: "cascade" }),
  dependentOn: varchar("dependent_on", { length: 50 }),
  dependentValue: varchar("dependent_value", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bundles = pgTable("bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  image: text("image"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  bundlePrice: decimal("bundle_price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", {
    precision: 5,
    scale: 2,
  }),
  validFrom: timestamp("valid_from"),
  validTill: timestamp("valid_till"),
  maxUsage: integer("max_usage"),
  currentUsage: integer("current_usage").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bundleItems = pgTable("bundle_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bundleId: uuid("bundle_id")
    .notNull()
    .references(() => bundles.id, { onDelete: "cascade" }),
  catalogId: uuid("catalog_id")
    .notNull()
    .references(() => catalogs.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const addOns = pgTable("add_ons", {
  id: uuid("id").primaryKey().defaultRandom(),
  listingId: uuid("listing_id").references(() => listings.id, {
    onDelete: "cascade",
  }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "cascade",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  listings: many(listings),
  addOns: many(addOns),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  catalogs: many(catalogs),
  addOns: many(addOns),
}));

export const catalogsRelations = relations(catalogs, ({ one, many }) => ({
  listing: one(listings, {
    fields: [catalogs.listingId],
    references: [listings.id],
  }),
  pricing: many(catalogPricing),
  bundleItems: many(bundleItems),
}));

export const catalogPricingRelations = relations(catalogPricing, ({ one }) => ({
  catalog: one(catalogs, {
    fields: [catalogPricing.catalogId],
    references: [catalogs.id],
  }),
}));

export const bundlesRelations = relations(bundles, ({ many }) => ({
  items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleItems.bundleId],
    references: [bundles.id],
  }),
  catalog: one(catalogs, {
    fields: [bundleItems.catalogId],
    references: [catalogs.id],
  }),
}));

export const addOnsRelations = relations(addOns, ({ one }) => ({
  listing: one(listings, {
    fields: [addOns.listingId],
    references: [listings.id],
  }),
  category: one(categories, {
    fields: [addOns.categoryId],
    references: [categories.id],
  }),
}));
