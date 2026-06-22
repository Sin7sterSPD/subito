import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Card, Button, Spinner, Chip } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
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
        style={[styles.addressCard, isSelected && styles.addressCardSelected]}
        variant="default"
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, isSelected && styles.typeIconSelected]}>
            <Ionicons
              name={getTypeIcon()}
              size={18}
              color={isSelected ? colors.white : semantic.primary}
            />
          </View>
          <View style={styles.cardTitle}>
            <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
              {address.name}
            </Typography>
            {address.isDefault && (
              <Chip size="sm" variant="soft" color="accent">
                Default
              </Chip>
            )}
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={semantic.primary}
            />
          )}
        </View>

        <Typography
          type="body-sm"
          color="muted"
          style={styles.addressLine}
        >
          {address.addressLine1}
          {address.addressLine2 ? `, ${address.addressLine2}` : ""}
        </Typography>
        <Typography type="body" color="muted">
          {address.area ? `${address.area}, ` : ""}
          {address.city}, {address.state} - {address.pincode}
        </Typography>

        {(address.houseNo ||
          address.floor !== undefined && address.floor !== null ||
          address.landmark) && (
          <View style={styles.additionalInfo}>
            {address.houseNo && (
              <Typography type="body-sm" color="muted">
                House: {address.houseNo}
              </Typography>
            )}
            {address.floor !== undefined && address.floor !== null && (
              <Typography type="body-sm" color="muted">
                Floor: {address.floor}
              </Typography>
            )}
            {address.landmark && (
              <Typography type="body-sm" color="muted">
                Landmark: {address.landmark}
              </Typography>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color={semantic.primary} />
            <Typography type="body" className="text-accent" weight="medium">
              Edit
            </Typography>
          </TouchableOpacity>
          {address.canDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={semantic.error} />
              <Typography type="body" className="text-danger" weight="medium">
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
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="location-outline"
          size={48}
          color={semantic.textMuted}
        />
      </View>
      <Typography type="h6" weight="semibold" style={[styles.emptyTitle, { color: semantic.textSecondary }]}>
        No saved addresses
      </Typography>
      <Typography type="body-sm" color="muted" align="center">
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
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.backgroundSecondary }} edges={["bottom"]}>
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
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[semantic.primary]}
          />
        }
        ListEmptyComponent={<EmptyState />}
      />

      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleAddNew}
          className="w-full"
        >
          <Button.Label>Add New Address</Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: spacing[4],
    paddingBottom: spacing[24],
    flexGrow: 1,
  },
  addressCard: {
    marginBottom: spacing[3],
  },
  addressCardSelected: {
    borderColor: semantic.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconSelected: {
    backgroundColor: semantic.primary,
  },
  cardTitle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginLeft: spacing[3],
  },
  addressLine: {
    marginBottom: spacing[1],
  },
  additionalInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: semantic.borderLight,
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing[4],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: semantic.borderLight,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
})
