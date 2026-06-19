import { apiClient } from "../api-client"
import {
  LocationAvailability,
  GeocodedAddress,
  AutocompleteResult,
} from "../../types/api"

export const locationApi = {
  checkAvailability: (lat: number, lng: number) =>
    apiClient.get<LocationAvailability>(
      `/location/availability?lat=${lat}&lng=${lng}`
    ),

  reverseGeocode: (lat: number, lng: number) =>
    apiClient.get<GeocodedAddress>(
      `/location/v2/reverse-geocode?lat=${lat}&lng=${lng}`
    ),

  autocomplete: (input: string) =>
    apiClient.get<{ results: AutocompleteResult[] }>(
      `/location/auto-complete?input=${encodeURIComponent(input)}`
    ),
}
