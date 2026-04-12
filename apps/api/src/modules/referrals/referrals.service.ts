import { db } from "@subito/db";
import {
  referralCodes,
  referralRewards,
  userCredits,
  users,
} from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError } from "../../lib/errors";

export async function getReferralSummary(userId: string) {
  const userReferralCode = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.userId, userId),
  });

  if (!userReferralCode) {
    throw new NotFoundError("Referral code");
  }

  const rewards = await db.query.referralRewards.findMany({
    where: eq(referralRewards.referrerId, userId),
    with: {
      referee: {
        columns: {
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      },
    },
  });

  const credits = await db.query.userCredits.findFirst({
    where: eq(userCredits.userId, userId),
  });

  const totalEarned = rewards.reduce((sum, r) => {
    if (r.referrerRewardStatus === "CREDITED") {
      return sum + parseFloat(r.referrerRewardAmount || "0");
    }
    return sum;
  }, 0);

  const pendingRewards = rewards.filter(
    (r) => r.referrerRewardStatus === "PENDING"
  ).length;

  return {
    referralCode: userReferralCode.code,
    referrerReward: userReferralCode.referrerReward,
    refereeReward: userReferralCode.refereeReward,
    totalReferrals: rewards.length,
    successfulReferrals: rewards.filter(
      (r) => r.referrerRewardStatus === "CREDITED"
    ).length,
    pendingRewards,
    totalEarned,
    currentBalance: credits?.balance || "0",
    referrals: rewards.map((r) => ({
      id: r.id,
      refereeName: r.referee
        ? `${r.referee.firstName || ""} ${r.referee.lastName || ""}`.trim()
        : "User",
      refereeJoinedAt: r.referee?.createdAt,
      rewardStatus: r.referrerRewardStatus,
      rewardAmount: r.referrerRewardAmount,
      creditedAt: r.referrerCreditedAt,
    })),
  };
}

export async function checkReferralCode(code: string) {
  const referralCode = await db.query.referralCodes.findFirst({
    where: and(eq(referralCodes.code, code), eq(referralCodes.isActive, true)),
    with: {
      user: {
        columns: {
          firstName: true,
        },
      },
    },
  });

  if (!referralCode) {
    return { exists: false };
  }

  if (referralCode.maxUsage && (referralCode.currentUsage || 0) >= referralCode.maxUsage) {
    return { exists: false, reason: "Code usage limit reached" };
  }

  if (referralCode.validTill && new Date() > referralCode.validTill) {
    return { exists: false, reason: "Code has expired" };
  }

  return {
    exists: true,
    code: referralCode.code,
    referrerName: referralCode.user?.firstName || "A friend",
    refereeReward: referralCode.refereeReward,
  };
}
