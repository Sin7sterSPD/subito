import { db } from "@subito/db";
import { hubs, microHubs, hubConfigs } from "@subito/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateDistance } from "../../utils/helpers";
import { ServiceabilityStatus } from "../../lib/types";
import { cacheGet, cacheSet } from "../../lib/redis";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function checkAvailability(lat: number, lng: number) {
  const cacheKey = `location:availability:${lat.toFixed(4)}:${lng.toFixed(4)}`;
  const cached = await cacheGet<ServiceabilityResult>(cacheKey);
  if (cached) return cached;

  const allHubs = await db.query.hubs.findMany({
    where: eq(hubs.isActive, true),
  });

  let nearestHub: (typeof allHubs)[0] | null = null;
  let nearestDistance = Infinity;

  for (const hub of allHubs) {
    const distance = calculateDistance(lat, lng, hub.latitude, hub.longitude);
    if (distance < nearestDistance && distance <= (hub.radius || 10)) {
      nearestHub = hub;
      nearestDistance = distance;
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
    };
    await cacheSet(cacheKey, result, 300);
    return result;
  }

  const hubMicroHubs = await db.query.microHubs.findMany({
    where: and(eq(microHubs.hubId, nearestHub.id), eq(microHubs.isActive, true)),
  });

  let nearestMicroHub: (typeof hubMicroHubs)[0] | null = null;
  nearestDistance = Infinity;

  for (const microHub of hubMicroHubs) {
    const distance = calculateDistance(
      lat,
      lng,
      microHub.latitude,
      microHub.longitude
    );
    if (distance < nearestDistance && distance <= (microHub.radius || 5)) {
      nearestMicroHub = microHub;
      nearestDistance = distance;
    }
  }

  const config = await db.query.hubConfigs.findFirst({
    where: nearestMicroHub
      ? eq(hubConfigs.microHubId, nearestMicroHub.id)
      : eq(hubConfigs.hubId, nearestHub.id),
  });

  const result: ServiceabilityResult = {
    serviceable: ServiceabilityStatus.SERVICEABLE,
    hubId: nearestHub.id,
    microHubId: nearestMicroHub?.id || null,
    dayClosingTime: config?.dayClosingTime || "21:00",
    serviceableEndHour: config?.serviceableEndHour || 21,
    areaFeatureConfig: config?.areaFeatureConfig || null,
    kitConfig: config?.kitConfig || null,
  };

  await cacheSet(cacheKey, result, 300);
  return result;
}

interface ServiceabilityResult {
  serviceable: ServiceabilityStatus;
  hubId: string | null;
  microHubId: string | null;
  dayClosingTime: string | null;
  serviceableEndHour: number | null;
  areaFeatureConfig: unknown;
  kitConfig: unknown;
}

export async function getPlaceDetails(placeId: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    return { error: "Google Maps API key not configured" };
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  url.searchParams.set(
    "fields",
    "formatted_address,geometry,address_components,name"
  );

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== "OK") {
    return { error: data.error_message || "Place not found" };
  }

  const result = data.result;
  return {
    placeId,
    name: result.name,
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    addressComponents: result.address_components,
  };
}

export async function reverseGeocode(lat: number, lng: number) {
  if (!GOOGLE_MAPS_API_KEY) {
    return { error: "Google Maps API key not configured" };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== "OK" || !data.results.length) {
    return { error: "Could not geocode location" };
  }

  const result = data.results[0];
  return {
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    addressComponents: result.address_components,
    latitude: lat,
    longitude: lng,
  };
}

export async function autocomplete(input: string) {
  if (!GOOGLE_MAPS_API_KEY) {
    return { predictions: [] };
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );
  url.searchParams.set("input", input);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);
  url.searchParams.set("components", "country:in");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== "OK") {
    return { predictions: [] };
  }

  return {
    predictions: data.predictions.map(
      (p: { place_id: string; description: string }) => ({
        placeId: p.place_id,
        description: p.description,
      })
    ),
  };
}
