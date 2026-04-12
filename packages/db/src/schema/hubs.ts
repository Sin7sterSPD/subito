import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  doublePrecision,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const hubs = pgTable("hubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radius: integer("radius").default(10),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const microHubs = pgTable("micro_hubs", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radius: integer("radius").default(5),
  pincodes: text("pincodes").array(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hubConfigs = pgTable("hub_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  hubId: uuid("hub_id")
    .notNull()
    .references(() => hubs.id, { onDelete: "cascade" }),
  microHubId: uuid("micro_hub_id").references(() => microHubs.id, {
    onDelete: "cascade",
  }),
  dayStartTime: varchar("day_start_time", { length: 10 }).default("06:00"),
  dayClosingTime: varchar("day_closing_time", { length: 10 }).default("21:00"),
  serviceableEndHour: integer("serviceable_end_hour").default(21),
  slotDuration: integer("slot_duration").default(60),
  bufferTime: integer("buffer_time").default(30),
  maxBookingsPerSlot: integer("max_bookings_per_slot").default(5),
  surgeMultiplier: doublePrecision("surge_multiplier").default(1.0),
  surgeThreshold: integer("surge_threshold").default(80),
  areaFeatureConfig: jsonb("area_feature_config"),
  kitConfig: jsonb("kit_config"),
  isInstantEnabled: boolean("is_instant_enabled").default(true),
  isScheduledEnabled: boolean("is_scheduled_enabled").default(true),
  isRecurringEnabled: boolean("is_recurring_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hubsRelations = relations(hubs, ({ many }) => ({
  microHubs: many(microHubs),
  configs: many(hubConfigs),
}));

export const microHubsRelations = relations(microHubs, ({ one, many }) => ({
  hub: one(hubs, {
    fields: [microHubs.hubId],
    references: [hubs.id],
  }),
  configs: many(hubConfigs),
}));

export const hubConfigsRelations = relations(hubConfigs, ({ one }) => ({
  hub: one(hubs, {
    fields: [hubConfigs.hubId],
    references: [hubs.id],
  }),
  microHub: one(microHubs, {
    fields: [hubConfigs.microHubId],
    references: [microHubs.id],
  }),
}));
