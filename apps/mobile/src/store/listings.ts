import { create } from "zustand"
import { Category, Listing, Bundle } from "../types/api"
import { listingsApi } from "../services/api"
import { MOCK_CATEGORIES, ALL_MOCK_LISTINGS, CategoryWithListings, MOCK_BUNDLES } from "./mockData"

interface ListingsState {
  categories: CategoryWithListings[]
  bundles: Bundle[]
  selectedCategory: Category | null
  selectedListing: Listing | null
  isLoading: boolean
  error: string | null

  fetchListings: (lat?: number, lng?: number) => Promise<void>
  fetchPublicListings: (lat?: number, lng?: number) => Promise<void>
  fetchListingById: (id: string) => Promise<Listing | null>
  fetchServiceById: (id: string) => Promise<Listing | null>
  setSelectedCategory: (category: Category | null) => void
  setSelectedListing: (listing: Listing | null) => void
  reset: () => void
}

function mergeWithMocks(dbCategories: CategoryWithListings[]): CategoryWithListings[] {
  const result = [...dbCategories]
  for (const mockCat of MOCK_CATEGORIES) {
    const existingIndex = result.findIndex(
      (c) => c.slug === mockCat.slug || c.name.toLowerCase() === mockCat.name.toLowerCase()
    )
    if (existingIndex > -1) {
      const existingCat = result[existingIndex]
      const existingListings = existingCat.listings || []
      const mergedListings = [...existingListings]
      
      for (const mockList of mockCat.listings) {
        if (!mergedListings.some((l) => l.id === mockList.id || l.slug === mockList.slug)) {
          mergedListings.push(mockList)
        }
      }
      result[existingIndex] = {
        ...existingCat,
        listings: mergedListings
      }
    } else {
      result.push(mockCat)
    }
  }
  return result.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99))
}

function mergeBundles(dbBundles: Bundle[]): Bundle[] {
  const result = [...dbBundles]
  for (const mockBundle of MOCK_BUNDLES) {
    if (!result.some((b) => b.id === mockBundle.id || b.slug === mockBundle.slug)) {
      result.push(mockBundle)
    }
  }
  return result
}

export const useListingsStore = create<ListingsState>((set) => ({
  categories: [],
  bundles: [],
  selectedCategory: null,
  selectedListing: null,
  isLoading: false,
  error: null,
  
  fetchListings: async (lat, lng) => {
    set({ isLoading: true , error: null })
    try {
      const response = await listingsApi.getListings({ lat, lng })
      if (response.success && response.data) {
        const dbCats = (response.data.categories || []) as CategoryWithListings[]
        const merged = mergeWithMocks(dbCats)
        set({
          categories: merged,
          bundles: mergeBundles(response.data.bundles || []),
        })
      } else {
        set({ categories: MOCK_CATEGORIES, bundles: MOCK_BUNDLES })
      }
    } catch {
      set({ categories: MOCK_CATEGORIES, bundles: MOCK_BUNDLES, error: "Failed to fetch listings" })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchPublicListings: async (lat, lng) => {
    set({ isLoading: true, error: null })
    try {
      const response = await listingsApi.getPublicListings({ lat, lng })
      if (response.success && response.data) {
        const dbCats = (response.data.categories || []) as CategoryWithListings[]
        const merged = mergeWithMocks(dbCats)
        set({
          categories: merged,
          bundles: mergeBundles(response.data.bundles || []),
        })
      } else {
        set({ categories: MOCK_CATEGORIES, bundles: MOCK_BUNDLES })
      }
    } catch {
      set({ categories: MOCK_CATEGORIES, bundles: MOCK_BUNDLES, error: "Failed to fetch listings" })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchListingById: async (id) => {
    const mockItem = ALL_MOCK_LISTINGS.find((item) => item.id === id)
    if (mockItem) {
      set({ selectedListing: mockItem })
      return mockItem
    }
    set({ isLoading: true })
    try {
      const response = await listingsApi.getListingById(id)
      if (response.success && response.data) {
        set({ selectedListing: response.data })
        return response.data
      }
      return null
    } catch {
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  fetchServiceById: async (id) => {
    const mockItem = ALL_MOCK_LISTINGS.find((item) => item.id === id)
    if (mockItem) {
      set({ selectedListing: mockItem })
      return mockItem
    }
    set({ isLoading: true })
    try {
      const response = await listingsApi.getServiceById(id)
      if (response.success && response.data) {
        set({ selectedListing: response.data })
        return response.data
      }
      return null
    } catch {
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedListing: (listing) => set({ selectedListing: listing }),

  reset: () =>
    set({
      categories: [],
      bundles: [],
      selectedCategory: null,
      selectedListing: null,
      isLoading: false,
      error: null,
    }),
}))
