import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  pgEnum,
  decimal,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { bookings } from "./bookings";

export const orderStatusEnum = pgEnum("order_status", [
  "CREATED",
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "REFUND_INITIATED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "UPI",
  "CARD",
  "NETBANKING",
  "WALLET",
  "COD",
  "OTHER",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "INITIATED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: varchar("order_id", { length: 100 }).unique().notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: orderStatusEnum("status").default("CREATED").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  
  juspayOrderId: varchar("juspay_order_id", { length: 100 }),
  juspayClientAuthToken: text("juspay_client_auth_token"),
  juspayClientAuthTokenExpiry: timestamp("juspay_client_auth_token_expiry"),
  
  paymentMethodId: varchar("payment_method_id", { length: 100 }),
  paymentMethod: paymentMethodEnum("payment_method"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: varchar("payment_id", { length: 100 }).unique().notNull(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("INR").notNull(),
  
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentMethodDetails: jsonb("payment_method_details"),
  
  juspayTxnId: varchar("juspay_txn_id", { length: 100 }),
  bankReferenceNumber: varchar("bank_reference_number", { length: 100 }),
  authorizationCode: varchar("authorization_code", { length: 50 }),
  
  gatewayResponse: jsonb("gateway_response"),
  errorCode: varchar("error_code", { length: 50 }),
  errorMessage: text("error_message"),
  
  capturedAt: timestamp("captured_at"),
  failedAt: timestamp("failed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  refundId: varchar("refund_id", { length: 100 }).unique().notNull(),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: refundStatusEnum("status").default("INITIATED").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason"),
  
  juspayRefundId: varchar("juspay_refund_id", { length: 100 }),
  gatewayResponse: jsonb("gateway_response"),
  
  initiatedBy: uuid("initiated_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const savedPaymentMethods = pgTable("saved_payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: paymentMethodEnum("type").notNull(),
  displayName: varchar("display_name", { length: 100 }),
  token: text("token"),
  
  cardLastFour: varchar("card_last_four", { length: 4 }),
  cardBrand: varchar("card_brand", { length: 20 }),
  cardExpiryMonth: varchar("card_expiry_month", { length: 2 }),
  cardExpiryYear: varchar("card_expiry_year", { length: 4 }),
  
  upiId: varchar("upi_id", { length: 100 }),
  upiProvider: varchar("upi_provider", { length: 50 }),
  
  walletType: varchar("wallet_type", { length: 50 }),
  
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

import { boolean } from "drizzle-orm/pg-core";

export const ordersRelations = relations(orders, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [orders.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  payments: many(payments),
  refunds: many(refunds),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  refunds: many(refunds),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  booking: one(bookings, {
    fields: [refunds.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [refunds.userId],
    references: [users.id],
  }),
  initiator: one(users, {
    fields: [refunds.initiatedBy],
    references: [users.id],
  }),
}));

export const savedPaymentMethodsRelations = relations(
  savedPaymentMethods,
  ({ one }) => ({
    user: one(users, {
      fields: [savedPaymentMethods.userId],
      references: [users.id],
    }),
  })
);
