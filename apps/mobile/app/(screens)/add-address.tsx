import React, { useState, useEffect, useRef } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Typography, Button, TextField, Input, Label, FieldError, Card, Spinner, InputGroup } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useUserStore, useLocationStore } from "../../src/store"
import { AddressType, Address, AutocompleteResult } from "../../src/types/api"
import { locationApi } from "../../src/services/api"
import { Ionicons } from "@expo/vector-icons"

const ADDRESS_TYPES: {
  key: AddressType
  label: string
  icon: keyof typeof Ionicons.glyphMap
}[] = [
  { key: "HOME", label: "Home", icon: "home" },
  { key: "OFFICE", label: "Office", icon: "business" },
  { key: "OTHER", label: "Other", icon: "location" },
]

export default function AddAddressScreen() {
  const { addressId } = useLocalSearchParams<{ addressId?: string }>()
  const {
    addresses,
    addAddress,
    updateAddress,
    isLoading: isSaving,
  } = useUserStore()
  const {
    getCurrentLocation,
    reverseGeocode,
    isLoading: locationLoading,
  } = useLocationStore()
  const isEditMode = typeof addressId === "string" && addressId.length > 0

  const existingAddress = addressId
    ? addresses.find((a) => a.id === addressId)
    : null

  const [formData, setFormData] = useState({
    name: existingAddress?.name || "",
    addressLine1: existingAddress?.addressLine1 || "",
    addressLine2: existingAddress?.addressLine2 || "",
    area: existingAddress?.area || "",
    city: existingAddress?.city || "",
    state: existingAddress?.state || "",
    pincode: existingAddress?.pincode || "",
    latitude: existingAddress?.latitude || 0,
    longitude: existingAddress?.longitude || 0,
    type: (existingAddress?.type || "HOME") as AddressType,
    houseNo: existingAddress?.houseNo || "",
    buildingName: existingAddress?.buildingName || "",
    landmark: existingAddress?.landmark || "",
    floor: existingAddress?.floor?.toString() || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchRequestSeq = useRef(0)
  const [searchResults, setSearchResults] = useState<AutocompleteResult[]>([])

  useEffect(() => {
    if (!existingAddress) return

    setFormData({
      name: existingAddress.name || "",
      addressLine1: existingAddress.addressLine1 || "",
      addressLine2: existingAddress.addressLine2 || "",
      area: existingAddress.area || "",
      city: existingAddress.city || "",
      state: existingAddress.state || "",
      pincode: existingAddress.pincode || "",
      latitude: existingAddress.latitude || 0,
      longitude: existingAddress.longitude || 0,
      type: (existingAddress.type || "HOME") as AddressType,
      houseNo: existingAddress.houseNo || "",
      buildingName: existingAddress.buildingName || "",
      landmark: existingAddress.landmark || "",
      floor: existingAddress.floor?.toString() || "",
    })
  }, [existingAddress])

  const handleUseCurrentLocation = async () => {
    const location = await getCurrentLocation()
    if (location) {
      const geocoded = await reverseGeocode(
        location.latitude,
        location.longitude
      )
      if (geocoded) {
        setFormData((prev) => ({
          ...prev,
          addressLine1: geocoded.address || "",
          area: geocoded.area || "",
          city: geocoded.city || "",
          state: geocoded.state || "",
          pincode: geocoded.pincode || "",
          latitude: location.latitude,
          longitude: location.longitude,
        }))
      }
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 3) {
      searchRequestSeq.current += 1
      setSearchResults([])
      setIsSearching(false)
      return
    }

    const requestId = ++searchRequestSeq.current
    setIsSearching(true)
    try {
      const response = await locationApi.autocomplete(query)
      if (
        requestId === searchRequestSeq.current &&
        response.success &&
        response.data
      ) {
        setSearchResults(response.data.results)
      }
    } catch {
      // Silent fail
    } finally {
      if (requestId === searchRequestSeq.current) {
        setIsSearching(false)
      }
    }
  }

  const handleSelectPlace = async (result: AutocompleteResult) => {
    setIsSearching(true)
    try {
      const { latitude, longitude, address, city, state, pincode, area } =
        result
      if (city && state && pincode) {
        setFormData((prev) => ({
          ...prev,
          addressLine1: address || result.description,
          area: area || "",
          city: city || "",
          state: state || "",
          pincode: pincode || "",
          latitude,
          longitude,
        }))
      } else {
        const geocoded = await reverseGeocode(latitude, longitude)
        if (geocoded) {
          setFormData((prev) => ({
            ...prev,
            addressLine1: geocoded.address || result.description,
            area: geocoded.area || "",
            city: geocoded.city || "",
            state: geocoded.state || "",
            pincode: geocoded.pincode || "",
            latitude,
            longitude,
          }))
        }
      }
      setSearchQuery("")
      setSearchResults([])
    } catch {
      // Silent fail
    } finally {
      setIsSearching(false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.addressLine1.trim())
      newErrors.addressLine1 = "Address is required"
    if (!formData.city.trim()) newErrors.city = "City is required"
    if (!formData.state.trim()) newErrors.state = "State is required"
    if (!formData.pincode.trim()) newErrors.pincode = "Pincode is required"
    if (formData.latitude === 0 || formData.longitude === 0) {
      newErrors.addressLine1 = "Please select a location"
    }
    if (formData.floor && !/^[+-]?\d+$/.test(formData.floor.trim())) {
      newErrors.floor = "Floor must be a valid number"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    const parsedFloor = formData.floor.trim()
    const floor =
      parsedFloor && /^[+-]?\d+$/.test(parsedFloor)
        ? Number.parseInt(parsedFloor, 10)
        : undefined

    try {
      if (isEditMode) {
        if (!existingAddress) {
          Alert.alert("Error", "Address not found")
          return
        }

        const success = await updateAddress({
          id: existingAddress.id,
          ...formData,
          floor,
        })
        if (success) {
          Alert.alert("Success", "Address updated successfully")
          router.back()
        } else {
          Alert.alert("Error", "Failed to update address")
        }
      } else {
        const address = await addAddress({
          ...formData,
          floor,
          isDefault: addresses.length === 0,
        } as Omit<Address, "id" | "userId" | "canDelete">)
        if (address) {
          Alert.alert("Success", "Address added successfully")
          router.back()
        } else {
          Alert.alert("Error", "Failed to add address")
        }
      }
    } catch {
      Alert.alert("Error", "Something went wrong")
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        >
          
          {/* Location Autocomplete & Geolocation Section */}
          <View style={{ padding: spacing[4], borderBottomWidth: 1, borderBottomColor: "#dee0e3" }}>
            <TextField>
              <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Search Location</Label>
              <InputGroup className="border border-gray-03 rounded-sm bg-white overflow-hidden h-12 flex-row items-center">
                <InputGroup.Prefix isDecorative className="pl-3 justify-center items-center">
                  <Ionicons name="search" size={20} color="#7E869A" />
                </InputGroup.Prefix>
                <InputGroup.Input
                  placeholder="Search for area, street, locality..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  className="flex-1 h-full px-2 text-body-s text-gray-12"
                />
              </InputGroup>
            </TextField>
            
            {isSearching && <Spinner size="sm" style={{ marginVertical: spacing[2] }} />}
            
            {searchResults.length > 0 && (
              <Card className="mt-2 max-h-52 p-0 overflow-hidden border border-gray-03 rounded-sm bg-white" variant="default">
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    className="flex-row items-center p-3 border-b border-gray-02"
                    onPress={() => handleSelectPlace(result)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#7E869A"
                    />
                    <Typography
                      type="body-sm"
                      numberOfLines={1}
                      className="ml-2 flex-1 text-gray-12 font-inter-regular"
                    >
                      {result.description}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <TouchableOpacity
              className="flex-row items-center mt-4"
              onPress={handleUseCurrentLocation}
              activeOpacity={0.8}
            >
              <View className="w-9 h-9 rounded-sm bg-blue-01 items-center justify-center mr-2">
                <Ionicons name="navigate" size={18} color="#2a9cff" />
              </View>
              <Typography type="body-sm" className="text-blue-03" weight="semibold">
                Use current location
              </Typography>
              {locationLoading && <Spinner size="sm" style={{ marginLeft: spacing[2] }} />}
            </TouchableOpacity>
          </View>

          {/* Address Type Section */}
          <View style={{ padding: spacing[4], borderBottomWidth: 1, borderBottomColor: "#dee0e3" }}>
            <Typography
              type="body"
              weight="semibold"
              className="text-gray-12 mb-3"
            >
              Save as
            </Typography>
            <View className="flex-row gap-2">
              {ADDRESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-sm border ${
                    formData.type === type.key
                      ? "bg-blue-03 border-blue-03"
                      : "bg-white border-gray-03"
                  }`}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, type: type.key }))
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={formData.type === type.key ? "#ffffff" : "#2a9cff"}
                  />
                  <Typography
                    type="body-sm"
                    weight="semibold"
                    style={{
                      color: formData.type === type.key ? "#ffffff" : "#2a9cff",
                    }}
                  >
                    {type.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Address Input Form Fields */}
          <View style={{ padding: spacing[4] }}>
            <TextField isRequired isInvalid={!!errors.name}>
              <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Address Label Name</Label>
              <Input
                placeholder="E.g., My Home"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, name: text }))
                  if (errors.name) setErrors({ ...errors, name: "" })
                }}
                className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
              />
              {errors.name ? <FieldError className="mt-1.5">{errors.name}</FieldError> : null}
            </TextField>

            <View className="mt-4">
              <TextField isRequired isInvalid={!!errors.addressLine1}>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Complete Address</Label>
                <Input
                  placeholder="House no, Building, Street"
                  value={formData.addressLine1}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, addressLine1: text }))
                    if (errors.addressLine1)
                      setErrors({ ...errors, addressLine1: "" })
                  }}
                  multiline
                  className="rounded-sm border border-gray-03 focus:border-blue-03 bg-white p-3 min-h-[80px] leading-relaxed text-body-s text-gray-12"
                />
                {errors.addressLine1 ? <FieldError className="mt-1.5">{errors.addressLine1}</FieldError> : null}
              </TextField>
            </View>

            <View className="mt-4">
              <TextField>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Flat / House No</Label>
                <Input
                  placeholder="Optional"
                  value={formData.houseNo}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, houseNo: text }))
                  }
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
              </TextField>
            </View>

            <View className="mt-4">
              <TextField>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Building / Society Name</Label>
                <Input
                  placeholder="Optional"
                  value={formData.buildingName}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, buildingName: text }))
                  }
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
              </TextField>
            </View>

            <View className="mt-4">
              <TextField isInvalid={!!errors.floor}>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Floor</Label>
                <Input
                  placeholder="Optional"
                  value={formData.floor}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, floor: text }))
                    if (errors.floor) setErrors({ ...errors, floor: "" })
                  }}
                  keyboardType="number-pad"
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
                {errors.floor ? <FieldError className="mt-1.5">{errors.floor}</FieldError> : null}
              </TextField>
            </View>

            <View className="mt-4">
              <TextField>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Landmark</Label>
                <Input
                  placeholder="Near school, temple, etc."
                  value={formData.landmark}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, landmark: text }))
                  }
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
              </TextField>
            </View>

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1">
                <TextField isRequired isInvalid={!!errors.city}>
                  <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">City</Label>
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, city: text }))
                      if (errors.city) setErrors({ ...errors, city: "" })
                    }}
                    className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                  />
                  {errors.city ? <FieldError className="mt-1.5">{errors.city}</FieldError> : null}
                </TextField>
              </View>
              
              <View className="flex-1">
                <TextField isRequired isInvalid={!!errors.state}>
                  <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">State</Label>
                  <Input
                    placeholder="State"
                    value={formData.state}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, state: text }))
                      if (errors.state) setErrors({ ...errors, state: "" })
                    }}
                    className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                  />
                  {errors.state ? <FieldError className="mt-1.5">{errors.state}</FieldError> : null}
                </TextField>
              </View>
            </View>

            <View className="mt-4">
              <TextField isRequired isInvalid={!!errors.pincode}>
                <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Pincode</Label>
                <Input
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, pincode: text }))
                    if (errors.pincode) setErrors({ ...errors, pincode: "" })
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  className="h-12 rounded-sm border border-gray-03 focus:border-blue-03 bg-white px-3 text-body-s text-gray-12"
                />
                {errors.pincode ? <FieldError className="mt-1.5">{errors.pincode}</FieldError> : null}
              </TextField>
            </View>
          </View>
        </ScrollView>

        {/* Footer Button Bar */}
        <View className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-03 bg-white">
          <Button
            onPress={handleSave}
            isDisabled={isSaving}
            className="w-full bg-blue-03 rounded-sm py-3.5 transition-transform active:scale-[0.96]"
          >
            {isSaving ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Button.Label className="text-white font-inter-bold text-body-s">
                {isEditMode ? "Update Address" : "Save Address"}
              </Button.Label>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
