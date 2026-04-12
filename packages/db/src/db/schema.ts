import { integer, pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 20 }).notNull().unique(),
  email: varchar({ length: 255 }),
  firebaseUid: varchar("firebase_uid", { length: 255 }).unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
