import React, { useState, useCallback, useMemo, useEffect } from "react"
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { Typography, Spinner } from "heroui-native"
import { useListingsStore } from "../../src/store"
import { Listing } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"
import debounce from "lodash.debounce"

const resolveImage = (img: string | undefined) => {
  if (!img) return require("../../assets/home/main/vaccum-floor.jpg")

  const serviceImages: Record<string, number> = {
    "floor.png": require("../../assets/home/main/floor-cleaning.jpg"),
    "bathroom.png": require("../../assets/home/main/vaccum-floor.jpg"),
    "cupboard-cleaning.png": require("../../assets/home/preview/cupboard-cleaning.png"),
    "utensils.png": require("../../assets/home/main/cook-preview.jpg"),
    "roomclieaning.png": require("../../assets/home/main/vaccum-floor.jpg"),
    "plumbing.jpg": require("../../assets/home/main/plumbing.jpg"),
    "toilet-clean.jpg": require("../../assets/home/main/vaccum-floor.jpg"),
    "ac-repair.jpg": require("../../assets/home/main/ac-repair.jpg"),
    "painting.jpg": require("../../assets/home/main/painting.jpg"),
    "bundle-clean.png": require("../../assets/home/main/bundle-clean.png"),
    "bundle-cook.png": require("../../assets/home/main/bundle-cook.png"),
  }

  const filename = img.substring(img.lastIndexOf("/") + 1)
  if (serviceImages[filename]) return serviceImages[filename]
  if (serviceImages[img]) return serviceImages[img]
  if (img.startsWith("http")) return { uri: img }

  const lowercaseImg = img.toLowerCase()
  if (lowercaseImg.includes("floor"))
    return require("../../assets/home/main/floor-cleaning.jpg")
  if (lowercaseImg.includes("bathroom") || lowercaseImg.includes("toilet"))
    return require("../../assets/home/main/vaccum-floor.jpg")
  if (lowercaseImg.includes("cupboard"))
    return require("../../assets/home/preview/cupboard-cleaning.png")
  if (lowercaseImg.includes("utensils") || lowercaseImg.includes("cook"))
    return require("../../assets/home/main/cook-preview.jpg")
  if (lowercaseImg.includes("plumbing"))
    return require("../../assets/home/main/plumbing.jpg")
  if (lowercaseImg.includes("ac") || lowercaseImg.includes("repair"))
    return require("../../assets/home/main/ac-repair.jpg")
  if (lowercaseImg.includes("paint"))
    return require("../../assets/home/main/painting.jpg")

  return require("../../assets/home/main/vaccum-floor.jpg")
}

export default function SearchScreen() {
  const { categories } = useListingsStore()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Listing[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const allListings = useMemo(
    () => categories.flatMap((cat) => cat.listings || []),
    [categories]
  )

  const searchListings = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      const lowerQuery = searchQuery.toLowerCase()

      const filtered = allListings.filter(
        (listing) =>
          listing.name.toLowerCase().includes(lowerQuery) ||
          listing.description?.toLowerCase().includes(lowerQuery) ||
          listing.shortDescription?.toLowerCase().includes(lowerQuery) ||
          listing.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      )

      setResults(filtered)
      setIsSearching(false)
    },
    [allListings]
  )

  const debouncedSearch = useMemo(
    () => debounce(searchListings, 300),
    [searchListings]
  )
  useEffect(() => {
    return () => debouncedSearch.cancel()
  }, [debouncedSearch])

  const handleQueryChange = (text: string) => {
    setQuery(text)
    debouncedSearch(text)
  }

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: "/(screens)/service/[id]",
      params: { id: listing.id },
    })
  }

  const handleClear = () => {
    debouncedSearch.cancel()
    setQuery("")
    setResults([])
    setIsSearching(false)
  }

  const popularServices = allListings.slice(0, 6)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-02 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#2a9cff" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center bg-gray-01 px-3 py-2 rounded-xl">
          <Ionicons name="search" size={20} color="#2a9cff" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-13"
            placeholder="Search for services..."
            placeholderTextColor="#9ea2ad"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons
                name="close-circle"
                size={20}
                color="#9ea2ad"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching && <Spinner size="lg" style={{ padding: 16 }} />}

      {query.length === 0 ? (
        <View className="p-4">
          <Typography
            type="h6"
            weight="semibold"
            className="mb-4 text-gray-13"
          >
            Popular Services
          </Typography>
          <View className="flex-row flex-wrap gap-3">
            {popularServices.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                className="w-[30%] items-center"
                onPress={() => handleServicePress(listing)}
              >
                {listing.image && (
                  <Image
                    source={resolveImage(listing.image)}
                    style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 8 }}
                    contentFit="cover"
                  />
                )}
                <Typography
                  type="body-sm"
                  numberOfLines={2}
                  align="center"
                  className="text-gray-13"
                >
                  {listing.name}
                </Typography>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : results.length === 0 && !isSearching ? (
        <View className="flex-1 items-center justify-center p-6">
          <Ionicons name="search" size={48} color="#2a9cff" />
          <Typography type="h6" weight="semibold" className="mt-4 mb-2 text-gray-08">
            No results found
          </Typography>
          <Typography type="body-sm" color="muted" align="center">
            Try searching with different keywords
          </Typography>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center py-3 border-b border-gray-02"
              onPress={() => handleServicePress(item)}
            >
              {item.image ? (
                <Image
                  source={resolveImage(item.image)}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                  contentFit="cover"
                />
              ) : (
                <View className="w-14 h-14 rounded-lg bg-gray-01 items-center justify-center">
                  <Ionicons
                    name="sparkles"
                    size={24}
                    color="#2a9cff"
                  />
                </View>
              )}
              <View className="flex-1 ml-3">
                <Typography
                  type="body"
                  weight="medium"
                  numberOfLines={1}
                  className="text-gray-13"
                >
                  {item.name}
                </Typography>
                {item.shortDescription && (
                  <Typography
                    type="body-sm"
                    color="muted"
                    numberOfLines={1}
                  >
                    {item.shortDescription}
                  </Typography>
                )}
                {item.basePrice && (
                  <Typography type="body-sm" className="text-blue-03" weight="semibold">
                    From ₹{item.basePrice}
                  </Typography>
                )}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9ea2ad"
              />
            </TouchableOpacity>
          )}
          contentContainerClassName="p-4"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}
