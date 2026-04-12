import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  pgEnum,
  doublePrecision,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const addressTypeEnum = pgEnum("address_type", [
  "HOME",
  "OFFICE",
  "OTHER",
]);

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  landmark: varchar("landmark", { length: 255 }),
  area: varchar("area", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  type: addressTypeEnum("type").default("HOME").notNull(),
  bhk: integer("bhk"),
  bathroom: integer("bathroom"),
  balcony: integer("balcony"),
  floor: integer("floor"),
  buildingName: varchar("building_name", { length: 255 }),
  houseNo: varchar("house_no", { length: 50 }),
  otherName: varchar("other_name", { length: 100 }),
  otherPhone: varchar("other_phone", { length: 20 }),
  isDefault: boolean("is_default").default(false),
  canDelete: boolean("can_delete").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));
