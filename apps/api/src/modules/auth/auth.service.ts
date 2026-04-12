import { db } from "@subito/db";
import { users, referralCodes, referralRewards } from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyFirebaseToken } from "../../lib/firebase";
import {
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  verifyVerificationToken,
} from "../../lib/jwt";
import { BadRequestError, UnauthorizedError } from "../../lib/errors";
import { generateReferralCode } from "../../utils/helpers";

export async function login(mobileNumber: string) {
  const token = await generateVerificationToken(mobileNumber);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.phone, mobileNumber),
  });

  return {
    token,
    isExistingUser: !!existingUser,
    mobileNumber,
  };
}

export async function verify(data: {
  token: string;
  idtoken: string;
  mobileNumber: string;
  referralCode?: string;
}) {
  const tokenPayload = await verifyVerificationToken(data.token);
  if (!tokenPayload || tokenPayload.phone !== data.mobileNumber) {
    throw new UnauthorizedError("Invalid verification token");
  }

  const firebaseUser = await verifyFirebaseToken(data.idtoken);
  if (!firebaseUser) {
    throw new UnauthorizedError("Invalid Firebase token");
  }

  if (firebaseUser.phone !== data.mobileNumber) {
    throw new BadRequestError("Phone number mismatch");
  }

  let user = await db.query.users.findFirst({
    where: eq(users.phone, data.mobileNumber),
  });

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const newReferralCode = generateReferralCode();

    let referredByUserId: string | undefined;

    if (data.referralCode) {
      const referralCodeRecord = await db.query.referralCodes.findFirst({
        where: and(
          eq(referralCodes.code, data.referralCode),
          eq(referralCodes.isActive, true)
        ),
      });

      if (referralCodeRecord) {
        referredByUserId = referralCodeRecord.userId;
      }
    }

    const [newUser] = await db
      .insert(users)
      .values({
        phone: data.mobileNumber,
        firebaseUid: firebaseUser.uid,
        referralCode: newReferralCode,
        referredBy: referredByUserId,
        role: "customer",
        isOnboarded: false,
      })
      .returning();

    user = newUser;

    await db.insert(referralCodes).values({
      userId: user.id,
      code: newReferralCode,
      referrerReward: "50.00",
      refereeReward: "50.00",
    });

    if (referredByUserId && data.referralCode) {
      const referralCodeRecord = await db.query.referralCodes.findFirst({
        where: eq(referralCodes.code, data.referralCode),
      });

      if (referralCodeRecord) {
        await db.insert(referralRewards).values({
          referralCodeId: referralCodeRecord.id,
          referrerId: referredByUserId,
          refereeId: user.id,
          referrerRewardAmount: referralCodeRecord.referrerReward || "50.00",
          refereeRewardAmount: referralCodeRecord.refereeReward || "50.00",
        });
      }
    }
  } else {
    if (!user.firebaseUid) {
      await db
        .update(users)
        .set({ firebaseUid: firebaseUser.uid, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }

  const accessToken = await generateAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
  });

  const refreshToken = await generateRefreshToken(user.id);

  return {
    jwt_token: accessToken,
    refreshToken,
    userData: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      referralCode: user.referralCode,
      isOnboarded: user.isOnboarded,
    },
    isNewUser,
  };
}
