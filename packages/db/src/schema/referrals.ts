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

export const referralRewardTypeEnum = pgEnum("referral_reward_type", [
  "DISCOUNT",
  "CREDIT",
  "CASHBACK",
]);

export const referralRewardStatusEnum = pgEnum("referral_reward_status", [
  "PENDING",
  "CREDITED",
  "EXPIRED",
  "CANCELLED",
]);

export const referralCodes = pgTable("referral_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 20 }).unique().notNull(),
  maxUsage: integer("max_usage"),
  currentUsage: integer("current_usage").default(0),
  rewardType: referralRewardTypeEnum("reward_type").default("CREDIT"),
  referrerReward: decimal("referrer_reward", { precision: 10, scale: 2 }),
  refereeReward: decimal("referee_reward", { precision: 10, scale: 2 }),
  validFrom: timestamp("valid_from").defaultNow(),
  validTill: timestamp("valid_till"),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referralRewards = pgTable("referral_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralCodeId: uuid("referral_code_id")
    .notNull()
    .references(() => referralCodes.id, { onDelete: "cascade" }),
  referrerId: uuid("referrer_id")
    .notNull()
    .references(() => users.id),
  refereeId: uuid("referee_id")
    .notNull()
    .references(() => users.id),
  referrerRewardStatus: referralRewardStatusEnum("referrer_reward_status")
    .default("PENDING")
    .notNull(),
  refereeRewardStatus: referralRewardStatusEnum("referee_reward_status")
    .default("PENDING")
    .notNull(),
  referrerRewardAmount: decimal("referrer_reward_amount", {
    precision: 10,
    scale: 2,
  }),
  refereeRewardAmount: decimal("referee_reward_amount", {
    precision: 10,
    scale: 2,
  }),
  referrerCreditedAt: timestamp("referrer_credited_at"),
  refereeCreditedAt: timestamp("referee_credited_at"),
  triggerBookingId: uuid("trigger_booking_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userCredits = pgTable("user_credits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  lifetimeEarned: decimal("lifetime_earned", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  lifetimeUsed: decimal("lifetime_used", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "EARNED",
  "USED",
  "EXPIRED",
  "REFUNDED",
  "ADJUSTED",
]);

export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, {
    fields: [referralCodes.userId],
    references: [users.id],
  }),
  rewards: many(referralRewards),
}));

export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralRewards.referralCodeId],
    references: [referralCodes.id],
  }),
  referrer: one(users, {
    fields: [referralRewards.referrerId],
    references: [users.id],
  }),
  referee: one(users, {
    fields: [referralRewards.refereeId],
    references: [users.id],
  }),
}));

export const userCreditsRelations = relations(userCredits, ({ one }) => ({
  user: one(users, {
    fields: [userCredits.userId],
    references: [users.id],
  }),
}));

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
  })
);
