import { db } from "@subito/db";
import {
  users,
  userPreferences,
  referralCodes,
  referralRewards,
} from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../../lib/errors";

export async function getCurrentUser(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  return {
    id: user.id,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profileImage: user.profileImage,
    role: user.role,
    referralCode: user.referralCode,
    isOnboarded: user.isOnboarded,
    createdAt: user.createdAt,
  };
}

export async function updateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: string;
  }
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new NotFoundError("User");
  }

  return {
    id: updatedUser.id,
    phone: updatedUser.phone,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    email: updatedUser.email,
    profileImage: updatedUser.profileImage,
    role: updatedUser.role,
    referralCode: updatedUser.referralCode,
    isOnboarded: updatedUser.isOnboarded,
  };
}

export async function completeOnboarding(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
    email?: string;
  }
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      isOnboarded: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updatedUser) {
    throw new NotFoundError("User");
  }

  await db
    .insert(userPreferences)
    .values({
      userId: updatedUser.id,
    })
    .onConflictDoNothing();

  return {
    id: updatedUser.id,
    phone: updatedUser.phone,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    email: updatedUser.email,
    profileImage: updatedUser.profileImage,
    role: updatedUser.role,
    referralCode: updatedUser.referralCode,
    isOnboarded: updatedUser.isOnboarded,
  };
}

export async function checkUserExists(phone: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.phone, phone),
    columns: { id: true },
  });

  return !!user;
}

export async function getUserPreferences(userId: string) {
  let prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  if (!prefs) {
    const [newPrefs] = await db
      .insert(userPreferences)
      .values({ userId })
      .returning();
    prefs = newPrefs;
  }

  return {
    notificationsEnabled: prefs.notificationsEnabled,
    smsEnabled: prefs.smsEnabled,
    emailEnabled: prefs.emailEnabled,
    language: prefs.language,
  };
}

export async function processReferralCode(
  userId: string,
  referralCode?: string
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new NotFoundError("User");
  }

  if (user.referredBy) {
    throw new BadRequestError("User already has a referrer");
  }

  if (!referralCode) {
    return { applied: false };
  }

  const codeRecord = await db.query.referralCodes.findFirst({
    where: and(
      eq(referralCodes.code, referralCode),
      eq(referralCodes.isActive, true)
    ),
  });

  if (!codeRecord) {
    throw new BadRequestError("Invalid referral code");
  }

  if (codeRecord.userId === userId) {
    throw new BadRequestError("Cannot use your own referral code");
  }

  await db
    .update(users)
    .set({ referredBy: codeRecord.userId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(referralRewards).values({
    referralCodeId: codeRecord.id,
    referrerId: codeRecord.userId,
    refereeId: userId,
    referrerRewardAmount: codeRecord.referrerReward || "50.00",
    refereeRewardAmount: codeRecord.refereeReward || "50.00",
  });

  return { applied: true, code: referralCode };
}
