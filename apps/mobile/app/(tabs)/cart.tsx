import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Button, Spinner, Separator } from "heroui-native"
import { BottomSheet, Input } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useCartStore, useUserStore, useAppStore } from "../../src/store"
import { CartItem } from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

const resolveImage = (name: string | undefined) => {
  if (!name) return require("../../assets/home/main/vaccum-floor.jpg")
  
  const lowercaseName = name.toLowerCase()
  if (lowercaseName.includes("floor") || lowercaseName.includes("clean")) return require("../../assets/home/main/floor-cleaning.jpg")
  if (lowercaseName.includes("bathroom") || lowercaseName.includes("toilet") || lowercaseName.includes("vaccum")) return require("../../assets/home/main/vaccum-floor.jpg")
  if (lowercaseName.includes("cupboard") || lowercaseName.includes("wardrobe")) return require("../../assets/home/preview/cupboard-cleaning.png")
  if (lowercaseName.includes("utensils") || lowercaseName.includes("cook") || lowercaseName.includes("sink")) return require("../../assets/home/main/cook-preview.jpg")
  if (lowercaseName.includes("plumbing") || lowercaseName.includes("leak") || lowercaseName.includes("tap")) return require("../../assets/home/main/plumbing.jpg")
  if (lowercaseName.includes("ac ") || lowercaseName.includes("repair") || lowercaseName.includes("appliance")) return require("../../assets/home/main/ac-repair.jpg")
  if (lowercaseName.includes("paint")) return require("../../assets/home/main/painting.jpg")
  
  return require("../../assets/home/main/vaccum-floor.jpg")
}

const getItemImageSource = (item: CartItem) => {
  const catalogWithListing = item.catalog as any
  const listingImage = catalogWithListing?.listing?.images?.[0] || catalogWithListing?.listing?.image
  if (listingImage) {
    if (listingImage.startsWith("http")) {
      return { uri: listingImage }
    }
    return resolveImage(listingImage)
  }
  return resolveImage(item.catalog?.name)
}

const ADDONS = [
  { id: "addon-window", name: "Window Cleaning", price: 199, icon: "water" },
  { id: "addon-balcony", name: "Balcony Cleaning", price: 299, icon: "leaf" },
  { id: "addon-kitchen", name: "Kitchen Deep Clean", price: 399, icon: "sparkles" },
]

function CartItemCard({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem
  onIncrement: () => void
  onDecrement: () => void
  onRemove: () => void
}) {
  return (
    <Card variant="default" className="bg-white border-0 shadow-sm p-3 rounded-[20px] mb-4 relative">
      <View className="flex-row items-start gap-3">
        {/* Image Thumbnail */}
        <Image
          source={getItemImageSource(item)}
          style={{ width: 88, height: 88 }}
          className="rounded-xl bg-gray-01"
          contentFit="cover"
        />

        {/* Content Details */}
        <View className="flex-1 pr-6">
          <Typography numberOfLines={1} className="font-jakarta-bold text-body-s text-gray-12">
            {item.catalog?.name || "Service"}
          </Typography>
          <Typography numberOfLines={2} className="font-inter-regular text-caption-l text-gray-07 mt-1 leading-relaxed">
            {item.catalog?.description || "Professional service"}
          </Typography>
          
          <View className="flex-row items-center gap-1 mt-1.5">
            <Ionicons name="star" size={12} color="#F48E2F" />
            <Typography className="font-inter-medium text-caption-m text-gray-08">
              4.8 (200+)
            </Typography>
          </View>
          
          <Typography className="font-jakarta-bold text-body-m text-blue-03 mt-2">
            ₹{item.totalPrice}
          </Typography>

          {/* Compact Quantity Selector */}
          <View className="flex-row items-center bg-gray-01 rounded-lg border border-gray-02 mt-3 self-start">
            <TouchableOpacity
              className="px-2.5 py-1.5"
              onPress={onDecrement}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={14} color="#1D54E2" className="text-blue-03" />
            </TouchableOpacity>
            <Typography className="font-inter-bold text-body-s text-gray-12 px-1">
              {item.quantity}
            </Typography>
            <TouchableOpacity
              className="px-2.5 py-1.5"
              onPress={onIncrement}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color="#1D54E2" className="text-blue-03" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trash Icon top right */}
        <TouchableOpacity
          onPress={onRemove}
          activeOpacity={0.7}
          className="absolute right-1 top-1 p-1.5"
        >
          <Ionicons name="trash-outline" size={18} color="#E6483D" />
        </TouchableOpacity>
      </View>
    </Card>
  )
}

function PricingSummary({
  subtotal,
  discount,
  gst,
  total,
}: {
  subtotal: string
  discount: string
  gst: string
  total: string
}) {
  const discountVal = parseFloat(discount)
  return (
    <Card variant="default" className="bg-white border-0 shadow-sm p-3 rounded-[20px]">
      <Typography className="font-jakarta-bold text-body-m text-gray-12 mb-3">
        Payment Details
      </Typography>
      
      <View className="flex-row justify-between items-center mb-2.5">
        <Typography className="font-inter-regular text-body-s text-gray-08">
          Service Charge
        </Typography>
        <Typography className="font-inter-medium text-body-s text-gray-12">
          ₹{subtotal}
        </Typography>
      </View>

      <View className="flex-row justify-between items-center mb-2.5">
        <Typography className="font-inter-regular text-body-s text-gray-08">
          Tax
        </Typography>
        <Typography className="font-inter-medium text-body-s text-gray-12">
          ₹{gst}
        </Typography>
      </View>

      {discountVal > 0 && (
        <View className="flex-row justify-between items-center mb-2.5">
          <Typography className="font-inter-regular text-green-08">
            Discount
          </Typography>
          <Typography className="font-inter-semibold text-green-08">
            -₹{discount}
          </Typography>
        </View>
      )}

      <Separator className="my-2 bg-gray-02" />

      <View className="flex-row justify-between items-center mt-1">
        <Typography className="font-jakarta-bold text-body-m text-gray-12">
          Amount to Pay
        </Typography>
        <Typography className="font-jakarta-bold text-[20px] text-blue-03">
          ₹{total}
        </Typography>
      </View>
    </Card>
  )
}

function EmptyCart() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cart-outline" size={64} color="#7E869A" />
      </View>
      <Typography className="font-jakarta-bold text-h5 text-gray-12 text-center mb-2">
        Your cart is empty
      </Typography>
      <Typography className="font-inter-regular text-body-s text-gray-07 text-center mb-6 leading-relaxed">
        Add services to your cart to get started
      </Typography>
      <Button
        variant="primary"
        className="bg-blue-03 rounded-xl px-8"
        onPress={() => router.push("/(tabs)")}
      >
        <Button.Label>Browse Services</Button.Label>
      </Button>
    </View>
  )
}

interface AddOnItem {
  id: string
  name: string
  price: number
  icon: string
}

function RecommendedAddonCard({
  addon,
  onAdd,
  isAdding,
}: {
  addon: AddOnItem
  onAdd: () => void
  isAdding: boolean
}) {
  return (
    <Card variant="default" className="w-[150px] p-3 rounded-xl border border-gray-03 bg-white mr-3">
      <View className="h-9 w-9 bg-gray-01 rounded-lg items-center justify-center">
        <Ionicons name={addon.icon as any} size={20} color="#5E636E" />
      </View>
      <Typography numberOfLines={2} className="font-inter-semibold text-caption-l text-gray-12 mt-2 h-[36px] leading-tight">
        {addon.name}
      </Typography>
      <Typography className="font-jakarta-bold text-caption-l text-blue-03 mt-1">
        +₹{addon.price}
      </Typography>
      
      <TouchableOpacity
        onPress={onAdd}
        disabled={isAdding}
        activeOpacity={0.8}
        className="w-full py-1.5 rounded-lg mt-2 bg-blue-01 border border-blue-03 items-center justify-center"
      >
        <Typography className="font-inter-semibold text-caption-m text-blue-03">
          {isAdding ? "Adding..." : "Add"}
        </Typography>
      </TouchableOpacity>
    </Card>
  )
}

export default function CartScreen() {
  const {
    cart,
    isLoading,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCartStore()
  const { selectedAddress } = useUserStore()
  const { availableCoupons, fetchCoupons } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)
  const [showCouponSheet, setShowCouponSheet] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [addingAddonId, setAddingAddonId] = useState<string | null>(null)

  useEffect(() => {
    fetchCart()
    fetchCoupons()
  }, [fetchCart, fetchCoupons])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchCart()
    setRefreshing(false)
  }, [fetchCart])

  const handleIncrement = async (item: CartItem) => {
    await updateItem(item.catalogId, "INCREMENT")
  }

  const handleDecrement = async (item: CartItem) => {
    await updateItem(item.catalogId, "DECREMENT")
  }

  const handleRemove = async (item: CartItem) => {
    await removeItem(item.id)
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponError("")
    const result = await applyCoupon(couponCode.trim())
    if (result.success) {
      setShowCouponSheet(false)
      setCouponCode("")
    } else {
      setCouponError(result.error || "Failed to apply coupon")
    }
  }

  const handleRemoveCoupon = async () => {
    await removeCoupon()
  }

  const handleAddAddon = async (addon: typeof ADDONS[number]) => {
    setAddingAddonId(addon.id)
    try {
      await addItem(addon.id, 1, {
        propertyConfig: {
          mockName: addon.name,
          mockDesc: "Enhancement service addon",
          mockPrice: addon.price,
        }
      })
      await fetchCart()
    } catch (e) {
      console.error(e)
    } finally {
      setAddingAddonId(null)
    }
  }

  const handleCheckout = () => {
    if (!selectedAddress) {
      router.push("/(screens)/addresses")
      return
    }
    router.push("/(screens)/checkout")
  }

  if (isLoading && !cart) {
    return <Spinner style={{ flex: 1, justifyContent: "center", alignSelf: "center" }} />
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          {router.canGoBack() && (
            <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
              <Ionicons name="arrow-back" size={24} color="#14151a" />
            </TouchableOpacity>
          )}
          <Typography className="font-jakarta-bold text-[24px] text-gray-12">
            Cart
          </Typography>
        </View>
        <EmptyCart />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        {router.canGoBack() && (
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#14151a" />
          </TouchableOpacity>
        )}
        <Typography className="font-jakarta-bold text-[24px] text-gray-12 flex-1">
          Cart
        </Typography>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1D54E2"]}
          />
        }
      >
        <View className="gap-5">
          {/* Address Section */}
          <View>
            <Typography className="font-jakarta-bold text-body-m text-gray-12 mb-2">
              Service Address
            </Typography>
            <Card variant="default" className="bg-white border-0 shadow-sm p-3 rounded-[20px] flex-row items-center gap-3">
              <View className="h-10 w-10 bg-blue-01 rounded-full items-center justify-center">
                <Ionicons name="location" size={20} color="#1D54E2" className="text-blue-03" />
              </View>
              <View className="flex-1">
                <Typography className="font-jakarta-bold text-body-s text-gray-12">
                  Home
                </Typography>
                <Typography numberOfLines={2} className="font-inter-regular text-caption-l text-gray-07 mt-0.5 leading-relaxed">
                  {selectedAddress ? `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ', ' + selectedAddress.addressLine2 : ''}` : "No address selected"}
                </Typography>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(screens)/addresses")}
                activeOpacity={0.8}
                className="bg-blue-01 px-3 py-1.5 rounded-lg border border-blue-03"
              >
                <Typography className="font-inter-semibold text-caption-m text-blue-03">
                  Change
                </Typography>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Service Cards (Cart Items) */}
          <View>
            {cart.items.map((item) => (
              <CartItemCard
                key={item.id}
                item={item}
                onIncrement={() => handleIncrement(item)}
                onDecrement={() => handleDecrement(item)}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </View>

          {/* Coupon / Promo Section */}
          <View>
            {cart.coupon ? (
              <Card variant="default" className="bg-green-01 border border-green-03 p-3 rounded-[20px] flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Typography className="text-xl">🏷️</Typography>
                  <View>
                    <Typography className="font-inter-bold text-body-s text-green-08">
                      {cart.coupon.code} Applied
                    </Typography>
                    <Typography className="font-inter-medium text-caption-l text-green-08 mt-0.5">
                      You saved ₹{cart.discountAmount}
                    </Typography>
                  </View>
                </View>
                <TouchableOpacity onPress={handleRemoveCoupon} activeOpacity={0.8} className="px-2 py-1">
                  <Typography className="font-inter-semibold text-body-s text-danger">
                    Remove
                  </Typography>
                </TouchableOpacity>
              </Card>
            ) : (
              <TouchableOpacity
                onPress={() => setShowCouponSheet(true)}
                activeOpacity={0.9}
              >
                <Card variant="default" className="bg-white border-0 shadow-sm p-3 rounded-[20px] flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Typography className="text-xl">🏷️</Typography>
                    <Typography className="font-inter-semibold text-body-s text-gray-12">
                      Apply Coupons & Offers
                    </Typography>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#7E869A" />
                </Card>
              </TouchableOpacity>
            )}
          </View>

          {/* Pricing Details */}
          <PricingSummary
            subtotal={cart.totalPrice}
            discount={cart.discountAmount}
            gst={cart.gst}
            total={cart.finalTotalAmount}
          />

          {/* Recommended Add-ons Section */}
          <View className="gap-3">
            <Typography className="font-jakarta-bold text-body-m text-gray-12">
              Enhance Your Service
            </Typography>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
              {ADDONS.map((addon) => (
                <RecommendedAddonCard
                  key={addon.id}
                  addon={addon}
                  onAdd={() => handleAddAddon(addon)}
                  isAdding={addingAddonId === addon.id}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={styles.stickyFooter}>
        <View>
          <Typography className="text-caption-l text-gray-07 font-inter-regular">
            Amount
          </Typography>
          <Typography className="text-blue-03 font-jakarta-bold text-[22px] mt-0.5">
            ₹{cart.finalTotalAmount}
          </Typography>
        </View>
        
        <Button
          variant="primary"
          className="bg-blue-03 h-[52px] rounded-xl flex-1 ml-6 justify-center"
          onPress={handleCheckout}
        >
          <Button.Label>Proceed to Checkout →</Button.Label>
        </Button>
      </View>

      {/* Coupon Selector Bottom Sheet */}
      <BottomSheet
        isVisible={showCouponSheet}
        onClose={() => setShowCouponSheet(false)}
      >
        <View style={styles.couponSheet} className="pb-8 px-4">
          <Typography className="font-jakarta-bold text-h6 text-gray-12 mb-4">
            Apply Coupon
          </Typography>

          <View className="flex-row gap-3 items-start mb-6">
            <View className="flex-1">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChangeText={(text) => {
                  setCouponCode(text.toUpperCase())
                  setCouponError("")
                }}
                error={couponError}
                autoCapitalize="characters"
              />
            </View>
            <Button
              variant="primary"
              className="bg-blue-03 h-[44px] justify-center"
              onPress={handleApplyCoupon}
              isDisabled={!couponCode.trim()}
            >
              <Button.Label>Apply</Button.Label>
            </Button>
          </View>

          {availableCoupons.length > 0 && (
            <View>
              <Typography className="font-jakarta-semibold text-body-m text-gray-12 mb-3">
                Available Coupons
              </Typography>
              {availableCoupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon.id}
                  activeOpacity={0.8}
                  style={styles.couponItem}
                  className="flex-row items-center justify-between py-3 border-b border-gray-02"
                  onPress={() => {
                    setCouponCode(coupon.code)
                    setCouponError("")
                  }}
                >
                  <View className="flex-1">
                    <Typography className="font-inter-bold text-body-s text-blue-03">
                      {coupon.code}
                    </Typography>
                    <Typography className="font-inter-regular text-caption-l text-gray-07 mt-0.5">
                      {coupon.description || `Get discount`}
                    </Typography>
                  </View>
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color="#1D54E2"
                    className="text-blue-03"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    backgroundColor: "white",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: 120, // spacing above sticky bar
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.gray[2],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5], // extra safe area bottom padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[6],
    marginTop: 80,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[1],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  couponSheet: {
    paddingHorizontal: spacing[2],
  },
  couponItem: {
    paddingVertical: spacing[3],
  },
})
