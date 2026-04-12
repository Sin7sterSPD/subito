import { db } from "@subito/db";
import { addresses } from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "../../lib/errors";
import { calculateDistance } from "../../utils/helpers";

interface AddressInput {
  name?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  type: "HOME" | "OFFICE" | "OTHER";
  bhk?: number;
  bathroom?: number;
  balcony?: number;
  floor?: number;
  buildingName?: string;
  houseNo?: string;
  otherName?: string;
  otherPhone?: string;
}

export async function getUserAddresses(
  userId: string,
  options?: {
    lat?: number;
    lng?: number;
    nearestRequired?: boolean;
  }
) {
  const userAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, userId),
    orderBy: (addresses, { desc }) => [desc(addresses.createdAt)],
  });

  if (options?.lat && options?.lng && options?.nearestRequired) {
    const addressesWithDistance = userAddresses.map((addr) => ({
      ...addr,
      distance: calculateDistance(
        options.lat!,
        options.lng!,
        addr.latitude,
        addr.longitude
      ),
    }));

    addressesWithDistance.sort((a, b) => a.distance - b.distance);

    return {
      addresses: addressesWithDistance,
      nearestAddress: addressesWithDistance[0] || null,
    };
  }

  return {
    addresses: userAddresses,
    nearestAddress: null,
  };
}

export async function createAddress(userId: string, data: AddressInput) {
  const existingAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, userId),
    columns: { id: true },
  });

  const isDefault = existingAddresses.length === 0;

  const [address] = await db
    .insert(addresses)
    .values({
      userId,
      ...data,
      isDefault,
    })
    .returning();

  return address;
}

export async function updateAddress(
  userId: string,
  data: Partial<AddressInput> & { id: string }
) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, data.id), eq(addresses.userId, userId)),
  });

  if (!existing) {
    throw new NotFoundError("Address");
  }

  const { id, ...updateData } = data;

  const [updated] = await db
    .update(addresses)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(addresses.id, id))
    .returning();

  return updated;
}

export async function deleteAddress(userId: string, addressId: string) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!existing) {
    throw new NotFoundError("Address");
  }

  if (!existing.canDelete) {
    throw new ForbiddenError("This address cannot be deleted");
  }

  await db.delete(addresses).where(eq(addresses.id, addressId));

  if (existing.isDefault) {
    const remainingAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId),
      orderBy: (addresses, { desc }) => [desc(addresses.createdAt)],
      limit: 1,
    });

    if (remainingAddresses.length > 0) {
      await db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, remainingAddresses[0].id));
    }
  }

  return { deleted: true };
}

export async function getAddressById(userId: string, addressId: string) {
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  });

  if (!address) {
    throw new NotFoundError("Address");
  }

  return address;
}
