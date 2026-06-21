import React, { useState, useEffect, useRef } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Typography, Button, TextField, Input, Label, FieldError, Card, Spinner, InputGroup } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing, borderRadius } from "../../src/theme/spacing"
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
    currentLocation,
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <TextField>
              <Label>Search Location</Label>
              <InputGroup>
                <InputGroup.Prefix isDecorative className="flex-row items-center">
                  <Ionicons name="search" size={20} color={semantic.textMuted} />
                </InputGroup.Prefix>
                <InputGroup.Input
                  placeholder="Search for area, street, locality..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
              </InputGroup>
            </TextField>
            
            {isSearching && <Spinner size="sm" style={{ marginVertical: spacing[2] }} />}
            
            {searchResults.length > 0 && (
              <Card style={styles.searchResults} variant="default">
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.id}
                    style={styles.searchResult}
                    onPress={() => handleSelectPlace(result)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={semantic.textMuted}
                    />
                    <Typography
                      type="body-sm"
                      numberOfLines={1}
                      style={styles.searchResultText}
                    >
                      {result.description}
                    </Typography>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <TouchableOpacity
              style={styles.currentLocation}
              onPress={handleUseCurrentLocation}
            >
              <View style={styles.currentLocationIcon}>
                <Ionicons name="navigate" size={18} color={semantic.primary} />
              </View>
              <Typography type="body-sm" className="text-accent" weight="semibold">
                Use current location
              </Typography>
              {locationLoading && <Spinner size="sm" style={{ marginLeft: spacing[2] }} />}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Typography
              type="body"
              weight="semibold"
              style={[styles.sectionTitle, { color: semantic.textPrimary }]}
            >
              Save as
            </Typography>
            <View style={styles.typeSelector}>
              {ADDRESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    formData.type === type.key && styles.typeButtonActive,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({ ...prev, type: type.key }))
                  }
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={
                      formData.type === type.key
                        ? colors.white
                        : semantic.primary
                    }
                  />
                  <Typography
                    type="body"
                    weight="medium"
                    style={{
                      color: formData.type === type.key ? colors.white : semantic.primary
                    }}
                  >
                    {type.label}
                  </Typography>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TextField isRequired isInvalid={!!errors.name}>
              <Label>Name</Label>
              <Input
                placeholder="E.g., My Home"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, name: text }))
                  if (errors.name) setErrors({ ...errors, name: "" })
                }}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </TextField>

            <View style={styles.inputSpacing}>
              <TextField isRequired isInvalid={!!errors.addressLine1}>
                <Label>Complete Address</Label>
                <Input
                  placeholder="House no, Building, Street"
                  value={formData.addressLine1}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, addressLine1: text }))
                    if (errors.addressLine1)
                      setErrors({ ...errors, addressLine1: "" })
                  }}
                  multiline
                />
                {errors.addressLine1 ? <FieldError>{errors.addressLine1}</FieldError> : null}
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField>
                <Label>Flat / House No</Label>
                <Input
                  placeholder="Optional"
                  value={formData.houseNo}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, houseNo: text }))
                  }
                />
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField>
                <Label>Building / Society Name</Label>
                <Input
                  placeholder="Optional"
                  value={formData.buildingName}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, buildingName: text }))
                  }
                />
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isInvalid={!!errors.floor}>
                <Label>Floor</Label>
                <Input
                  placeholder="Optional"
                  value={formData.floor}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, floor: text }))
                    if (errors.floor) setErrors({ ...errors, floor: "" })
                  }}
                  keyboardType="number-pad"
                />
                {errors.floor ? <FieldError>{errors.floor}</FieldError> : null}
              </TextField>
            </View>

            <View style={styles.inputSpacing}>
              <TextField>
                <Label>Landmark</Label>
                <Input
                  placeholder="Near school, temple, etc."
                  value={formData.landmark}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, landmark: text }))
                  }
                />
              </TextField>
            </View>

            <View style={styles.row}>
              <View style={[styles.halfInput, styles.inputSpacing]}>
                <TextField isRequired isInvalid={!!errors.city}>
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={formData.city}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, city: text }))
                      if (errors.city) setErrors({ ...errors, city: "" })
                    }}
                  />
                  {errors.city ? <FieldError>{errors.city}</FieldError> : null}
                </TextField>
              </View>
              <View style={[styles.halfInput, styles.inputSpacing]}>
                <TextField isRequired isInvalid={!!errors.state}>
                  <Label>State</Label>
                  <Input
                    placeholder="State"
                    value={formData.state}
                    onChangeText={(text) => {
                      setFormData((prev) => ({ ...prev, state: text }))
                      if (errors.state) setErrors({ ...errors, state: "" })
                    }}
                  />
                  {errors.state ? <FieldError>{errors.state}</FieldError> : null}
                </TextField>
              </View>
            </View>

            <View style={styles.inputSpacing}>
              <TextField isRequired isInvalid={!!errors.pincode}>
                <Label>Pincode</Label>
                <Input
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, pincode: text }))
                    if (errors.pincode) setErrors({ ...errors, pincode: "" })
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {errors.pincode ? <FieldError>{errors.pincode}</FieldError> : null}
              </TextField>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            onPress={handleSave}
            isDisabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <Spinner size="sm" />
            ) : (
              <Button.Label>{isEditMode ? "Update Address" : "Save Address"}</Button.Label>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  searchResults: {
    marginTop: spacing[2],
    maxHeight: 200,
    padding: 0,
    overflow: "hidden",
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  searchResultText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  currentLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[3],
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[2],
  },
  typeSelector: {
    flexDirection: "row",
    gap: spacing[2],
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: 12,
    backgroundColor: colors.blue[1],
  },
  typeButtonActive: {
    backgroundColor: semantic.primary,
  },
  inputSpacing: {
    marginTop: spacing[4],
  },
  row: {
    flexDirection: "row",
    gap: spacing[3],
  },
  halfInput: {
    flex: 1,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
})
