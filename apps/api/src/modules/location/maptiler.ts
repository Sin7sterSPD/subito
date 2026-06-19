import "../../env"

const MAPTILER_API_KEY = process.env.MAPTILER_API_KEY
const MAPTILER_BASE_URL = "https://api.maptiler.com/geocoding"

interface MapTilerFeatureProperties {
  address?: string
  country?: string
  region?: string
  city?: string
  locality?: string
  district?: string
  postcode?: string
  street?: string
  [key: string]: unknown
}

interface MapTilerContextElement {
  id: string
  text: string
  place_designation?: string
  [key: string]: unknown
}

interface MapTilerFeature {
  id: string
  type: "Feature"
  text: string
  place_name: string
  center: [number, number]
  geometry: {
    type: "Point"
    coordinates: [number, number]
  }
  properties: MapTilerFeatureProperties
  context?: MapTilerContextElement[]
}

interface MapTilerResponse {
  type: "FeatureCollection"
  features: MapTilerFeature[]
  query: string[]
  attribution: string
}

export interface AutocompleteResult {
  id: string
  description: string
  mainText: string
  secondaryText: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  pincode?: string
  area?: string
}

export interface ReverseGeocodeResult {
  address: string
  city: string
  state: string
  pincode: string
  area: string
  closestPlace: string
}

export async function forwardGeocode(
  query: string,
  opts?: { country?: string; limit?: number }
): Promise<{ results: AutocompleteResult[] }> {
  if (!MAPTILER_API_KEY) {
    return { results: [] }
  }
  if (!query.trim() || query.trim().length < 2) {
    return { results: [] }
  }

  try {
    const url = new URL(
      `${MAPTILER_BASE_URL}/${encodeURIComponent(query)}.json`
    )
    url.searchParams.set("key", MAPTILER_API_KEY)
    url.searchParams.set("autocomplete", "true")
    url.searchParams.set("limit", String(opts?.limit ?? 5))
    if (opts?.country) {
      url.searchParams.set("country", opts.country)
    }

    const response = await fetch(url.toString())
    if (!response.ok) {
      return { results: [] }
    }

    const data: MapTilerResponse = await response.json()

    return {
      results: data.features.map((f) => {
        const [lng, lat] = f.center
        const props = f.properties
        const description = f.place_name
        const mainText = f.text
        const secondaryText = description
          .replace(mainText, "")
          .replace(/^,\s*/, "")

        const { city, state, pincode, area } = extractFieldsFromFeature(f)

        return {
          id: f.id,
          description,
          mainText,
          secondaryText,
          latitude: lat,
          longitude: lng,
          address: props.address || props.street || mainText,
          city,
          state,
          pincode,
          area,
        }
      }),
    }
  } catch {
    return { results: [] }
  }
}

function extractStateFromPlaceName(placeName: string): string | null {
  const parts = placeName.split(",").map((s) => s.trim())
  const last = parts[parts.length - 1]
  if (last === "India" && parts.length >= 2) {
    const candidate = parts[parts.length - 2].replace(/\s+\d{6}$/, "").trim()
    if (candidate.length > 0 && candidate.length <= 40) {
      return candidate
    }
  }
  return null
}

function extractFieldsFromFeature(feature: MapTilerFeature) {
  const props = feature.properties
  let city = props.city || ""
  let state = props.state || props.region || ""
  let pincode = props.postcode || ""
  let area = props.locality || props.district || ""

  // Extract from the feature itself first
  const id = feature.id || ""
  if (id.startsWith("postal_code") && !pincode) {
    pincode = feature.text.replace(/\s+/g, "")
  }
  if ((id.startsWith("municipality") || props.place_designation === "city") && !city) {
    city = feature.text
  }
  if ((id.startsWith("region") || props.place_designation === "state") && !state) {
    state = feature.text
  }
  if ((id.startsWith("place") || id.startsWith("municipal_district") || id.startsWith("locality")) && !area) {
    area = feature.text
  }

  // Extract from parent contexts
  if (feature.context) {
    for (const ctx of feature.context) {
      const cid = ctx.id || ""
      if (cid.startsWith("postal_code") && !pincode) {
        pincode = ctx.text.replace(/\s+/g, "")
      }
      if ((cid.startsWith("municipality") || ctx.place_designation === "city") && !city) {
        city = ctx.text
      }
      if ((cid.startsWith("region") || ctx.place_designation === "state") && !state) {
        state = ctx.text
      }
      if ((cid.startsWith("place") || cid.startsWith("municipal_district") || cid.startsWith("locality")) && !area) {
        area = ctx.text
      }
    }
  }

  // Fallbacks using place_name splits
  if (!state) {
    state = extractStateFromPlaceName(feature.place_name) || ""
  }

  return { city, state, pincode, area }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | { error: string }> {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      error:
        "Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180",
    }
  }
  if (!MAPTILER_API_KEY) {
    return { error: "MapTiler API key not configured" }
  }

  try {
    const url = new URL(`${MAPTILER_BASE_URL}/${lng},${lat}.json`)
    url.searchParams.set("key", MAPTILER_API_KEY)

    const response = await fetch(url.toString())
    if (!response.ok) {
      return { error: `Geocoding API returned ${response.status}` }
    }

    const data: MapTilerResponse = await response.json()
    if (!data.features.length) {
      return { error: "Could not geocode location" }
    }

    let address = ""
    let city = ""
    let state = ""
    let pincode = ""
    let area = ""
    let closestPlace = ""

    for (const feature of data.features) {
      if (!address) {
        address = feature.place_name
      }
      if (!closestPlace) {
        closestPlace = feature.text || feature.place_name
      }

      const extracted = extractFieldsFromFeature(feature)
      if (!city) city = extracted.city
      if (!state) state = extracted.state
      if (!pincode) pincode = extracted.pincode
      if (!area) area = extracted.area
    }

    return { address, city, state, pincode, area, closestPlace }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to reverse geocode",
    }
  }
}
