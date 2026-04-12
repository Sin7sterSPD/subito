import { create } from 'zustand';
import * as Location from 'expo-location';
import { LocationAvailability, GeocodedAddress } from '../types/api';
import { locationApi } from '../services/api';

interface LocationState {
  currentLocation: { latitude: number; longitude: number } | null;
  geocodedAddress: GeocodedAddress | null;
  serviceability: LocationAvailability | null;
  isLoading: boolean;
  hasPermission: boolean;
  permissionStatus: Location.PermissionStatus | null;

  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  checkServiceability: (lat: number, lng: number) => Promise<LocationAvailability | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeocodedAddress | null>;
  reset: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentLocation: null,
  geocodedAddress: null,
  serviceability: null,
  isLoading: false,
  hasPermission: false,
  permissionStatus: null,

  requestPermission: async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasPermission = status === Location.PermissionStatus.GRANTED;
      set({ permissionStatus: status, hasPermission });
      return hasPermission;
    } catch {
      return false;
    }
  },

  getCurrentLocation: async () => {
    const { hasPermission } = get();
    if (!hasPermission) {
      const granted = await get().requestPermission();
      if (!granted) return null;
    }

    set({ isLoading: true });
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      set({ currentLocation: coords });
      return coords;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  checkServiceability: async (lat, lng) => {
    set({ isLoading: true });
    try {
      const response = await locationApi.checkAvailability(lat, lng);
      if (response.success && response.data) {
        set({ serviceability: response.data });
        return response.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  reverseGeocode: async (lat, lng) => {
    try {
      const response = await locationApi.reverseGeocode(lat, lng);
      if (response.success && response.data) {
        set({ geocodedAddress: response.data });
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  reset: () =>
    set({
      currentLocation: null,
      geocodedAddress: null,
      serviceability: null,
      isLoading: false,
    }),
}));
