import "../../env"

import { db } from "@subito/db"

import { hubs, microHubs, hubConfigs } from "@subito/db"
import { eq, and } from "@subito/db"
import { calculateDistance } from "@subito/shared"
import { ServiceabilityStatus } from "@/lib/types"
import { cacheGet, cacheSet } from "@/lib/redis"
import * as maptiler from "./maptiler"

export async function checkAvailability(lat: number, lng: number) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error(
      "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180"
    )
  }
  const cacheKey = `location:availability:${lat.toFixed(4)}:${lng.toFixed(4)}`
  const cached = await cacheGet<ServiceabilityResult>(cacheKey)
  if (cached) return cached

  const allHubs = await db.query.hubs.findMany({
    where: eq(hubs.isActive, true),
  })

  let nearestHub: (typeof allHubs)[0] | null = null
  let nearestDistance = Infinity

  for (const hub of allHubs) {
    const distance = calculateDistance(lat, lng, hub.latitude, hub.longitude)
    if (distance < nearestDistance && distance <= (hub.radius || 10)) {
      nearestHub = hub
      nearestDistance = distance
    }
  }

  if (!nearestHub) {
    const result: ServiceabilityResult = {
      serviceable: ServiceabilityStatus.NOT_SERVICEABLE,
      hubId: null,
      microHubId: null,
      dayClosingTime: null,
      serviceableEndHour: null,
      areaFeatureConfig: null,
      kitConfig: null,
    }
    await cacheSet(cacheKey, result, 300)
    return result
  }

  const hubMicroHubs = await db.query.microHubs.findMany({
    where: and(
      eq(microHubs.hubId, nearestHub.id),
      eq(microHubs.isActive, true)
    ),
  })

  let nearestMicroHub: (typeof hubMicroHubs)[0] | null = null
  nearestDistance = Infinity

  for (const microHub of hubMicroHubs) {
    const distance = calculateDistance(
      lat,
      lng,
      microHub.latitude,
      microHub.longitude
    )
    if (distance < nearestDistance && distance <= (microHub.radius || 5)) {
      nearestMicroHub = microHub
      nearestDistance = distance
    }
  }

  const config = await db.query.hubConfigs.findFirst({
    where: nearestMicroHub
      ? eq(hubConfigs.microHubId, nearestMicroHub.id)
      : eq(hubConfigs.hubId, nearestHub.id),
  })

  const result: ServiceabilityResult = {
    serviceable: ServiceabilityStatus.SERVICEABLE,
    hubId: nearestHub.id,
    microHubId: nearestMicroHub?.id || null,
    dayClosingTime: config?.dayClosingTime || "21:00",
    serviceableEndHour: config?.serviceableEndHour || 21,
    areaFeatureConfig: config?.areaFeatureConfig || null,
    kitConfig: config?.kitConfig || null,
  }

  await cacheSet(cacheKey, result, 300)
  return result
}

interface ServiceabilityResult {
  serviceable: ServiceabilityStatus
  hubId: string | null
  microHubId: string | null
  dayClosingTime: string | null
  serviceableEndHour: number | null
  areaFeatureConfig: unknown
  kitConfig: unknown
}

export async function reverseGeocode(lat: number, lng: number) {
  return maptiler.reverseGeocode(lat, lng)
}

export async function autocomplete(input: string) {
  const result = await maptiler.forwardGeocode(input, { country: "in" })
  return { results: result.results }
}
