import { db } from "@subito/db";
import { appSettings, featureFlags, complaints } from "@subito/db/schema";
import { eq } from "drizzle-orm";
import { generateTicketNumber } from "../../utils/helpers";
import { cacheGet, cacheSet } from "../../lib/redis";

export async function getAppSettings() {
  const cacheKey = "settings:app";
  const cached = await cacheGet<AppSettingsResponse>(cacheKey);
  if (cached) return cached;

  const settings = await db.query.appSettings.findMany({
    where: eq(appSettings.isPublic, true),
  });

  const flags = await db.query.featureFlags.findMany({
    where: eq(featureFlags.isEnabled, true),
  });

  const settingsMap: Record<string, unknown> = {};
  for (const setting of settings) {
    settingsMap[setting.key] = setting.value;
  }

  const flagsMap: Record<string, boolean> = {};
  for (const flag of flags) {
    flagsMap[flag.key] = flag.isEnabled;
  }

  const result: AppSettingsResponse = {
    isRecurring: flagsMap["recurring_booking"] ?? true,
    isInstantBookingDisabled: !flagsMap["instant_booking"] ?? false,
    isScheduleBookingDisabled: !flagsMap["scheduled_booking"] ?? false,
    isRecurringBookingDisabled: !flagsMap["recurring_booking"] ?? false,
    testPhoneNumbers: (settingsMap["test_phone_numbers"] as string[]) || [],
    supportEmail:
      (settingsMap["support_email"] as string) || "support@subito.in",
    supportNumber:
      (settingsMap["support_number"] as string) || "+91-9876543210",
    appVersions: (settingsMap["app_versions"] as object) || {
      android: { min: "1.0.0", latest: "1.0.0" },
      ios: { min: "1.0.0", latest: "1.0.0" },
    },
    servicesExcludedForCleaningKit:
      (settingsMap["excluded_cleaning_kit_services"] as string[]) || [],
    features: flagsMap,
  };

  await cacheSet(cacheKey, result, 300);
  return result;
}

interface AppSettingsResponse {
  isRecurring: boolean;
  isInstantBookingDisabled: boolean;
  isScheduleBookingDisabled: boolean;
  isRecurringBookingDisabled: boolean;
  testPhoneNumbers: string[];
  supportEmail: string;
  supportNumber: string;
  appVersions: object;
  servicesExcludedForCleaningKit: string[];
  features: Record<string, boolean>;
}

export async function getSupportContact() {
  const emailSetting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "support_email"),
  });

  const phoneSetting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "support_number"),
  });

  return {
    email: (emailSetting?.value as string) || "support@subito.in",
    phone: (phoneSetting?.value as string) || "+91-9876543210",
    hours: "9 AM - 9 PM IST",
    days: "Monday - Saturday",
  };
}

export async function submitComplaint(
  userId: string,
  data: {
    category?: string;
    subject: string;
    description: string;
    bookingId?: string;
    attachments?: string[];
  }
) {
  const ticketNumber = generateTicketNumber();

  const [complaint] = await db
    .insert(complaints)
    .values({
      ticketNumber,
      userId,
      bookingId: data.bookingId,
      category: data.category,
      subject: data.subject,
      description: data.description,
      attachments: data.attachments,
      status: "OPEN",
      priority: "MEDIUM",
    })
    .returning();

  return {
    submitted: true,
    ticketNumber: complaint.ticketNumber,
    id: complaint.id,
    message: "Your complaint has been registered. We will get back to you soon.",
  };
}
