import { db } from "@subito/db"
import { addresses } from "@subito/db"
import { eq, and, desc } from "@subito/db"
import { NotFoundError, ForbiddenError, InternalError } from "@/lib/errors"
import { calculateDistance } from "@subito/shared"

interface AddressInput {
  name?: string
  addressLine1: string
  addressLine2?: string
  landmark?: string
  area?: string
  city: string
  state: string
  pincode: string
  latitude: number
  longitude: number
  type: "HOME" | "OFFICE" | "OTHER"
  bhk?: number
  bathroom?: number
  balcony?: number
  floor?: number
  buildingName?: string
  houseNo?: string
  otherName?: string
  otherPhone?: string
}

export async function getUserAddresses(
  userId: string,
  options?: {
    lat?: number
    lng?: number
    nearestRequired?: boolean
  }
) {
  const userAddresses = await db.query.addresses.findMany({
    where: eq(addresses.userId, userId),
    orderBy: (addresses, { desc }) => [desc(addresses.createdAt)],
  })

  if (
    options?.nearestRequired &&
    options?.lat != null &&
    options?.lng != null
  ) {
    const addressesWithDistance = userAddresses.map((addr) => ({
      ...addr,
      distance: calculateDistance(
        options.lat!,
        options.lng!,
        addr.latitude,
        addr.longitude
      ),
    }))

    addressesWithDistance.sort((a, b) => a.distance - b.distance)

    return {
      addresses: addressesWithDistance,
      nearestAddress: addressesWithDistance[0] || null,
    }
  }

  return {
    addresses: userAddresses,
    nearestAddress: null,
  }
}

export async function createAddress(userId: string, data: AddressInput) {
  return db.transaction(async (tx) => {
    const existingAddresses = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .limit(1)

    const isDefault = existingAddresses.length === 0

    const [address] = await tx
      .insert(addresses)
      .values({
        userId,
        ...data,
        isDefault,
      })
      .returning()

    if (!address) {
      throw new InternalError("Failed to create address")
    }

    return address
  })
}

export async function updateAddress(
  userId: string,
  data: Partial<AddressInput> & { id: string }
) {
  const existing = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, data.id), eq(addresses.userId, userId)),
  })

  if (!existing) {
    throw new NotFoundError("Address")
  }

  const { id, ...updateData } = data

  const [updated] = await db
    .update(addresses)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(addresses.id, id))
    .returning()

  if (!updated) {
    throw new InternalError("Failed to update address")
  }

  return updated
}

export async function deleteAddress(userId: string, addressId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1)

    if (!existing) {
      throw new NotFoundError("Address")
    }

    if (!existing.canDelete) {
      throw new ForbiddenError("This address cannot be deleted")
    }

    await tx.delete(addresses).where(eq(addresses.id, addressId))

    if (existing.isDefault) {
      const [nextDefaultAddress] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, userId))
        .orderBy(desc(addresses.createdAt))
        .limit(1)

      if (nextDefaultAddress) {
        await tx
          .update(addresses)
          .set({ isDefault: true })
          .where(eq(addresses.id, nextDefaultAddress.id))
      }
    }

    return { deleted: true }
  })
}

export async function getAddressById(userId: string, addressId: string) {
  const address = await db.query.addresses.findFirst({
    where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
  })

  if (!address) {
    throw new NotFoundError("Address")
  }

  return address
}
