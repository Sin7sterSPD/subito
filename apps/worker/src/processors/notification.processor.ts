import { Worker, Job } from "bullmq";
import { db } from "@subito/db";
import { notifications, fcmTokens } from "@subito/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "../lib/redis";
import type { NotificationJobData } from "../queues";

const CLEVERTAP_ACCOUNT_ID = process.env.CLEVERTAP_ACCOUNT_ID;
const CLEVERTAP_PASSCODE = process.env.CLEVERTAP_PASSCODE;

async function processNotification(job: Job<NotificationJobData>) {
  const { type, userId, title, body, data } = job.data;

  console.log(`Processing notification job ${job.id}: ${type} for user ${userId}`);

  await db.insert(notifications).values({
    userId,
    title,
    body,
    type,
    referenceType: data?.referenceType as string,
    referenceId: data?.referenceId as string,
    metadata: data,
  });

  const userTokens = await db.query.fcmTokens.findMany({
    where: eq(fcmTokens.userId, userId),
  });

  if (userTokens.length === 0) {
    console.log(`No FCM tokens found for user ${userId}`);
    return { sent: false, reason: "No FCM tokens" };
  }

  if (CLEVERTAP_ACCOUNT_ID && CLEVERTAP_PASSCODE) {
    await sendViaCleverTap({
      userId,
      title,
      body,
      data,
      tokens: userTokens.map((t) => t.token),
    });
  } else {
    console.log("CleverTap not configured, skipping push notification");
  }

  return { sent: true, tokensCount: userTokens.length };
}

async function sendViaCleverTap(payload: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  tokens: string[];
}) {
  const response = await fetch(
    "https://api.clevertap.com/1/send/push.json",
    {
      method: "POST",
      headers: {
        "X-CleverTap-Account-Id": CLEVERTAP_ACCOUNT_ID!,
        "X-CleverTap-Passcode": CLEVERTAP_PASSCODE!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: {
          FBID: payload.tokens,
        },
        tag_group: "notifications",
        content: {
          title: payload.title,
          body: payload.body,
          platform_specific: {
            android: {
              notification_channel_id: "default",
            },
          },
        },
        data: payload.data,
      }),
    }
  );

  const result = await response.json();
  console.log("CleverTap response:", result);
  return result;
}

export const notificationWorker = new Worker<NotificationJobData>(
  "notification-queue",
  processNotification,
  {
    connection: redis,
    concurrency: 10,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});
