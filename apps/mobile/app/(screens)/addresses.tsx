import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Card, Button, Spinner, Chip } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useUserStore, useLocationStore } from "../../src/store"
import { Address } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

function AddressCard({
  address,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  address: Address
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const getTypeIcon = () => {
    switch (address.type) {
      case "HOME":
        return "home"
      case "OFFICE":
        return "business"
      default:
        return "location"
    }
  }

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.9}>
      <Card
        className={`mb-3 p-4 rounded-sm border ${
          isSelected ? "border-blue-03 border-2 bg-blue-01/10" : "border-gray-03 bg-white"
        }`}
        variant="default"
      >
        <View className="flex-row items-center mb-3">
          <View className={`w-9 h-9 items-center justify-center rounded-sm ${
            isSelected ? "bg-blue-03" : "bg-blue-01"
          }`}>
            <Ionicons
              name={getTypeIcon()}
              size={18}
              color={isSelected ? "#ffffff" : "#2a9cff"}
            />
          </View>
          <View className="flex-1 flex-row items-center gap-2 ml-3">
            <Typography type="body" weight="semibold" className="text-gray-12">
              {address.name}
            </Typography>
            {address.isDefault && (
              <Chip size="sm" variant="soft" className="bg-blue-01 border border-blue-03/20">
                <Typography className="text-blue-03 font-inter-semibold text-caption-s">
                  Default
                </Typography>
              </Chip>
            )}
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color="#2a9cff"
            />
          )}
        </View>

        <Typography
          type="body-sm"
          className="text-gray-08 mb-1 leading-relaxed"
        >
          {address.addressLine1}
          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        </Typography>
        <Typography type="body-sm" className="text-gray-07 leading-relaxed">
          {address.area ? `${address.area}, ` : ""}
          {address.city}, {address.state} - {address.pincode}
        </Typography>

        {(address.houseNo ||
          (address.floor !== undefined && address.floor !== null) ||
          address.landmark) && (
          <View className="flex-row flex-wrap gap-3 mt-2 pt-2 border-t border-gray-02">
            {address.houseNo && (
              <Typography type="body-sm" className="text-gray-08">
                House: {address.houseNo}
              </Typography>
            )}
            {address.floor !== undefined && address.floor !== null && (
              <Typography type="body-sm" className="text-gray-08">
                Floor: {address.floor}
              </Typography>
            )}
            {address.landmark && (
              <Typography type="body-sm" className="text-gray-08">
                Landmark: {address.landmark}
              </Typography>
            )}
          </View>
        )}

        <View className="flex-row gap-4 mt-3 pt-3 border-t border-gray-02">
          <TouchableOpacity className="flex-row items-center gap-1.5" onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color="#2a9cff" />
            <Typography type="body-sm" className="text-blue-03" weight="semibold">
              Edit
            </Typography>
          </TouchableOpacity>
          {address.canDelete && (
            <TouchableOpacity className="flex-row items-center gap-1.5" onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color="#e6483d" className="text-danger" />
              <Typography type="body-sm" className="text-danger" weight="semibold">
                Delete
              </Typography>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  )
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-10">
      <View className="w-20 h-20 rounded-full bg-gray-02 items-center justify-center mb-4">
        <Ionicons
          name="location-outline"
          size={40}
          color="#7E869A"
        />
      </View>
      <Typography type="h6" weight="semibold" className="text-gray-12 mb-2 text-center">
        No saved addresses
      </Typography>
      <Typography type="body-sm" className="text-gray-07 text-center">
        Add your first address to get started
      </Typography>
    </View>
  )
}

export default function AddressesScreen() {
  const {
    addresses,
    selectedAddress,
    fetchAddresses,
    setSelectedAddress,
    deleteAddress,
    isLoading,
  } = useUserStore()
  const { currentLocation } = useLocationStore()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAddresses(currentLocation?.latitude, currentLocation?.longitude)
  }, [fetchAddresses, currentLocation])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchAddresses(currentLocation?.latitude, currentLocation?.longitude)
    setRefreshing(false)
  }, [fetchAddresses, currentLocation])

  const handleSelect = (address: Address) => {
    setSelectedAddress(address)
    router.back()
  }

  const handleEdit = (address: Address) => {
    router.push({
      pathname: "/(screens)/add-address",
      params: { addressId: address.id },
    })
  }

  const handleDelete = (address: Address) => {
    Alert.alert(
      "Delete Address",
      `Are you sure you want to delete "${address.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteAddress(address.id)
            if (!success) {
              Alert.alert("Error", "Failed to delete address")
            }
          },
        },
      ]
    )
  }

  const handleAddNew = () => {
    router.push("/(screens)/add-address")
  }

  if (isLoading && addresses.length === 0) {
    return <Spinner size="lg" style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f8" }} edges={["bottom"]}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            isSelected={selectedAddress?.id === item.id}
            onSelect={() => handleSelect(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={{ padding: spacing[4], paddingBottom: 100, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2a9cff"]}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-03">
        <Button
          onPress={handleAddNew}
          className="w-full bg-blue-03 rounded-sm py-3.5 transition-transform active:scale-[0.96]"
        >
          <Button.Label className="text-white font-inter-bold text-body-s">
            Add New Address
          </Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}
