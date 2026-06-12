import { apiClient } from "../api-client"
import { LocationAvailability, GeocodedAddress } from "../../types/api"

interface PlaceDetails {
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}

interface AutocompleteResult {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export const locationApi = {
  checkAvailability: (lat: number, lng: number) =>
    apiClient.get<LocationAvailability>(
      `/location/availability?lat=${lat}&lng=${lng}`
    ),

  getPlaceDetails: (placeId: string) =>
    apiClient.get<PlaceDetails>(
      `/location/places?placeId=${encodeURIComponent(placeId)}`
    ),

  reverseGeocode: (lat: number, lng: number) =>
    apiClient.get<GeocodedAddress>(
      `/location/v2/reverse-geocode?lat=${lat}&lng=${lng}`
    ),

  autocomplete: (input: string) =>
    apiClient.get<AutocompleteResult[]>(
      `/location/auto-complete?input=${encodeURIComponent(input)}`
    ),
}
