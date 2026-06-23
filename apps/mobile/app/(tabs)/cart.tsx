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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Image } from "expo-image"
import {
  Typography,
  Card,
  Button,
  Spinner,
  Separator,
  Tabs,
  BottomSheet,
} from "heroui-native"
import { Input } from "../../src/components/ui"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useCartStore, useUserStore, useAppStore } from "../../src/store"
import {
  CartItem,
  BookingType,
  RecurringType,
  BookingSlot,
} from "../../src/types/api"
import { Ionicons } from "@expo/vector-icons"
import { ScheduledSheet, RecurringSheet } from "../../src/components/booking"

const resolveImage = (name: string | undefined) => {
  if (!name) return require("../../assets/home/main/vaccum-floor.jpg")

  const lowercaseName = name.toLowerCase()
  if (lowercaseName.includes("floor") || lowercaseName.includes("clean"))
    return require("../../assets/home/main/floor-cleaning.jpg")
  if (
    lowercaseName.includes("bathroom") ||
    lowercaseName.includes("toilet") ||
    lowercaseName.includes("vaccum")
  )
    return require("../../assets/home/main/vaccum-floor.jpg")
  if (lowercaseName.includes("cupboard") || lowercaseName.includes("wardrobe"))
    return require("../../assets/home/preview/cupboard-cleaning.png")
  if (
    lowercaseName.includes("utensils") ||
    lowercaseName.includes("cook") ||
    lowercaseName.includes("sink")
  )
    return require("../../assets/home/main/cook-preview.jpg")
  if (
    lowercaseName.includes("plumbing") ||
    lowercaseName.includes("leak") ||
    lowercaseName.includes("tap")
  )
    return require("../../assets/home/main/plumbing.jpg")
  if (
    lowercaseName.includes("ac ") ||
    lowercaseName.includes("repair") ||
    lowercaseName.includes("appliance")
  )
    return require("../../assets/home/main/ac-repair.jpg")
  if (lowercaseName.includes("paint"))
    return require("../../assets/home/main/painting.jpg")

  return require("../../assets/home/main/vaccum-floor.jpg")
}

const getItemImageSource = (item: CartItem) => {
  const catalogWithListing = item.catalog as any
  const listingImage =
    catalogWithListing?.listing?.images?.[0] ||
    catalogWithListing?.listing?.image
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
  {
    id: "addon-kitchen",
    name: "Kitchen Deep Clean",
    price: 399,
    icon: "sparkles",
  },
]

const formatSelectedSlot = (startTime: string | undefined) => {
  if (!startTime) return ""
  const date = new Date(startTime)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ]

  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  const monthName = months[date.getMonth()]

  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  const strMinutes = minutes < 10 ? "0" + minutes : minutes

  return `${dayName}, ${dayNum} ${monthName} • ${hours}:${strMinutes} ${ampm}`
}

const formatRecurringSchedule = (cart: any) => {
  if (!cart?.timeSlot?.time?.[0]?.start) return ""
  const typeLabel =
    cart.recurringType === "WEEKLY"
      ? "Week"
      : cart.recurringType === "BIWEEKLY"
        ? "2 Weeks"
        : "Month"

  const date = new Date(cart.timeSlot.time[0].start)
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  const strMinutes = minutes < 10 ? "0" + minutes : minutes
  const timeLabel = `${hours}:${strMinutes} ${ampm}`

  return `Every ${typeLabel} • ${timeLabel}`
}

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
    <Card
      variant="default"
      className="relative mb-4 rounded-[24px] border-0 bg-white p-3 shadow-sm"
    >
      <View className="flex-row items-start gap-3">
        {/* Image Thumbnail with subtle pure black outline for depth */}
        <Image
          source={getItemImageSource(item)}
          style={{ width: 88, height: 88 }}
          className="bg-gray-01 rounded-xl border border-black/10"
          contentFit="cover"
        />

        {/* Content Details */}
        <View className="flex-1 pr-6">
          <Typography
            numberOfLines={1}
            className="font-jakarta-bold text-body-s text-gray-12"
          >
            {item.catalog?.name || "Service"}
          </Typography>
          <Typography
            numberOfLines={2}
            className="font-inter-regular text-caption-l text-gray-07 mt-1 leading-relaxed"
          >
            {item.catalog?.description || "Professional service"}
          </Typography>

          <View className="mt-1.5 flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#F48E2F" />
            <Typography className="font-inter-medium text-caption-m text-gray-08">
              4.8 (200+)
            </Typography>
          </View>

          <Typography className="font-jakarta-bold text-body-m text-blue-03 mt-2 tabular-nums">
            ₹{item.totalPrice}
          </Typography>

          {/* Compact Quantity Selector */}
          <View className="bg-gray-01 border-gray-02 mt-3 flex-row items-center self-start rounded-lg border">
            <TouchableOpacity
              className="px-2.5 py-1.5 transition-transform active:scale-[0.96]"
              onPress={onDecrement}
              activeOpacity={0.7}
            >
              <Ionicons
                name="remove"
                size={14}
                color="#1D54E2"
                className="text-blue-03"
              />
            </TouchableOpacity>
            <Typography className="font-inter-bold text-body-s text-gray-12 px-1 tabular-nums">
              {item.quantity}
            </Typography>
            <TouchableOpacity
              className="px-2.5 py-1.5 transition-transform active:scale-[0.96]"
              onPress={onIncrement}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add"
                size={14}
                color="#1D54E2"
                className="text-blue-03"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trash Icon top right */}
        <TouchableOpacity
          onPress={onRemove}
          activeOpacity={0.7}
          className="absolute top-1 right-1 p-1.5 transition-transform active:scale-[0.96]"
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
    <Card
      variant="default"
      className="rounded-[24px] border-0 bg-white p-3 shadow-sm"
    >
      <Typography className="font-jakarta-bold text-body-m text-gray-12 mb-3">
        Payment Details
      </Typography>

      <View className="mb-2.5 flex-row items-center justify-between">
        <Typography className="font-inter-regular text-body-s text-gray-08">
          Service Charge
        </Typography>
        <Typography className="font-inter-medium text-body-s text-gray-12 tabular-nums">
          ₹{subtotal}
        </Typography>
      </View>

      <View className="mb-2.5 flex-row items-center justify-between">
        <Typography className="font-inter-regular text-body-s text-gray-08">
          Tax
        </Typography>
        <Typography className="font-inter-medium text-body-s text-gray-12 tabular-nums">
          ₹{gst}
        </Typography>
      </View>

      {discountVal > 0 && (
        <View className="mb-2.5 flex-row items-center justify-between">
          <Typography className="font-inter-regular text-green-08">
            Discount
          </Typography>
          <Typography className="font-inter-semibold text-green-08 tabular-nums">
            -₹{discount}
          </Typography>
        </View>
      )}

      <Separator className="bg-gray-02 my-2" />

      <View className="mt-1 flex-row items-center justify-between">
        <Typography className="font-jakarta-bold text-body-m text-gray-12">
          Amount to Pay
        </Typography>
        <Typography className="font-jakarta-bold text-blue-03 text-[20px] tabular-nums">
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
      <Typography className="font-jakarta-bold text-h5 text-gray-12 mb-2 text-center">
        Your cart is empty
      </Typography>
      <Typography className="font-inter-regular text-body-s text-gray-07 mb-6 text-center leading-relaxed">
        Add services to your cart to get started
      </Typography>
      <Button
        variant="primary"
        className="bg-blue-03 rounded-xl px-8 transition-transform active:scale-[0.96]"
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
    <Card
      variant="default"
      className="border-gray-03 mr-3 w-[150px] rounded-[20px] border bg-white p-3"
    >
      <View className="bg-gray-01 h-9 w-9 items-center justify-center rounded-lg">
        <Ionicons name={addon.icon as any} size={20} color="#5E636E" />
      </View>
      <Typography
        numberOfLines={2}
        className="font-inter-semibold text-caption-l text-gray-12 mt-2 h-[36px] leading-tight"
      >
        {addon.name}
      </Typography>
      <Typography className="font-jakarta-bold text-caption-l text-blue-03 mt-1 tabular-nums">
        +₹{addon.price}
      </Typography>

      <TouchableOpacity
        onPress={onAdd}
        disabled={isAdding}
        activeOpacity={0.8}
        className="bg-blue-01 border-blue-03 mt-2 w-full items-center justify-center rounded-lg border py-1.5 transition-transform active:scale-[0.96]"
      >
        <Typography className="font-inter-semibold text-caption-m text-blue-03">
          {isAdding ? "Adding..." : "Add"}
        </Typography>
      </TouchableOpacity>
    </Card>
  )
}

export default function CartScreen() {
  const insets = useSafeAreaInsets()
  const {
    cart,
    isLoading,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
    updateCart,
  } = useCartStore()
  const { selectedAddress } = useUserStore()
  const { availableCoupons, fetchCoupons } = useAppStore()

  const [refreshing, setRefreshing] = useState(false)
  const [showCouponSheet, setShowCouponSheet] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [addingAddonId, setAddingAddonId] = useState<string | null>(null)

  // Booking details states
  const [bookingType, setBookingType] = useState<BookingType>("INSTANT")
  const [showScheduledSheet, setShowScheduledSheet] = useState(false)
  const [showRecurringSheet, setShowRecurringSheet] = useState(false)

  useEffect(() => {
    fetchCart()
    fetchCoupons()
  }, [fetchCart, fetchCoupons])

  // Sync active tab with cart value when loaded
  useEffect(() => {
    if (cart?.bookingType) {
      setBookingType(cart.bookingType)
    }
  }, [cart?.bookingType])

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

  const handleAddAddon = async (addon: (typeof ADDONS)[number]) => {
    setAddingAddonId(addon.id)
    try {
      await addItem(addon.id, 1, {
        propertyConfig: {
          mockName: addon.name,
          mockDesc: "Enhancement service addon",
          mockPrice: addon.price,
        },
      })
      await fetchCart()
    } catch (e) {
      console.error(e)
    } finally {
      setAddingAddonId(null)
    }
  }

  const handleBookingTypeChange = async (type: string) => {
    const bt = type as BookingType
    setBookingType(bt)
    if (bt === "INSTANT") {
      await updateCart({
        bookingType: "INSTANT",
        timeSlot: { time: [] },
        recurringType: undefined,
      })
      await fetchCart()
    }
  }

  const handleScheduledConfirm = async (date: string, slot: BookingSlot) => {
    let startIso = slot.startTime
    if (!slot.startTime.includes("T")) {
      startIso = `${date}T${slot.startTime}:00`
    }
    await updateCart({
      bookingType: "SCHEDULED",
      timeSlot: { time: [{ start: startIso }] },
      recurringType: undefined,
    })
    setShowScheduledSheet(false)
    await fetchCart()
  }

  const handleRecurringConfirm = async (data: {
    recurringType: RecurringType
    days?: string[]
    date: string
    slot: BookingSlot
  }) => {
    let startIso = data.slot.startTime
    if (!data.slot.startTime.includes("T")) {
      startIso = `${data.date}T${data.slot.startTime}:00`
    }
    await updateCart({
      bookingType: "RECURRING",
      recurringType: data.recurringType,
      timeSlot: { time: [{ start: startIso }] },
    })
    setShowRecurringSheet(false)
    await fetchCart()
  }

  const handleCheckout = () => {
    if (!selectedAddress) {
      router.push("/(screens)/addresses")
      return
    }
    // If not configured, prompt slot selection
    if (
      bookingType !== "INSTANT" &&
      (!cart?.timeSlot?.time?.[0]?.start || cart.bookingType !== bookingType)
    ) {
      if (bookingType === "SCHEDULED") {
        setShowScheduledSheet(true)
      } else {
        setShowRecurringSheet(true)
      }
      return
    }
    router.push("/(screens)/checkout")
  }

  const addressLat = selectedAddress?.latitude || 0
  const addressLng = selectedAddress?.longitude || 0

  if (isLoading && !cart) {
    return (
      <Spinner
        style={{ flex: 1, justifyContent: "center", alignSelf: "center" }}
      />
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
            >
              <Ionicons name="arrow-back" size={24} color="#14151a" />
            </TouchableOpacity>
          )}
          <Typography className="font-jakarta-bold text-gray-12 text-[24px]">
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
        <Typography className="font-jakarta-bold text-gray-12 flex-1 text-[24px]">
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
            <Card
              variant="default"
              className="flex-row items-center gap-3 rounded-[24px] border-0 bg-white p-3 shadow-sm"
            >
              <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-full">
                <Ionicons
                  name="location"
                  size={20}
                  color="#1D54E2"
                  className="text-blue-03"
                />
              </View>
              <View className="flex-1">
                <Typography className="font-jakarta-bold text-body-s text-gray-12">
                  Home
                </Typography>
                <Typography
                  numberOfLines={2}
                  className="font-inter-regular text-caption-l text-gray-07 mt-0.5 leading-relaxed"
                >
                  {selectedAddress
                    ? `${selectedAddress.addressLine1}${selectedAddress.addressLine2 ? ", " + selectedAddress.addressLine2 : ""}`
                    : "No address selected"}
                </Typography>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(screens)/addresses")}
                activeOpacity={0.8}
                className="bg-blue-01 border-blue-03 rounded-lg border px-3 py-1.5 transition-transform active:scale-[0.96]"
              >
                <Typography className="font-inter-semibold text-caption-m text-blue-03">
                  Change
                </Typography>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Booking Option Tabs & Configuration */}
          <View>
            <Typography className="font-jakarta-bold text-body-m text-gray-12 mb-2">
              Booking Option
            </Typography>
            <Tabs
              value={bookingType}
              onValueChange={handleBookingTypeChange}
              variant="primary"
            >
              <Tabs.List className="bg-gray-01 border-gray-02 mb-3 rounded-xl border p-1">
                <Tabs.Indicator className="bg-blue-03 rounded-lg" />
                <Tabs.Trigger value="INSTANT" className="flex-1 py-2.5">
                  {({ isSelected }) => (
                    <Tabs.Label
                      className={`font-inter-semibold text-caption-m text-center ${isSelected ? "text-white" : "text-gray-07"}`}
                    >
                      Instant
                    </Tabs.Label>
                  )}
                </Tabs.Trigger>
                <Tabs.Trigger value="SCHEDULED" className="flex-1 py-2.5">
                  {({ isSelected }) => (
                    <Tabs.Label
                      className={`font-inter-semibold text-caption-m text-center ${isSelected ? "text-white" : "text-gray-07"}`}
                    >
                      Scheduled
                    </Tabs.Label>
                  )}
                </Tabs.Trigger>
                <Tabs.Trigger value="RECURRING" className="flex-1 py-2.5">
                  {({ isSelected }) => (
                    <Tabs.Label
                      className={`font-inter-semibold text-caption-m text-center ${isSelected ? "text-white" : "text-gray-07"}`}
                    >
                      Recurring
                    </Tabs.Label>
                  )}
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs>

            {/* Configured slot detail cards */}
            {bookingType === "INSTANT" && (
              <Card
                variant="default"
                className="border-blue-03 flex-row items-center gap-3 rounded-[24px] border bg-white p-3"
              >
                <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-full">
                  <Ionicons
                    name="flash"
                    size={20}
                    color="#1D54E2"
                    className="text-blue-03"
                  />
                </View>
                <View className="flex-1">
                  <Typography className="font-jakarta-bold text-body-s text-gray-12">
                    Instant Booking
                  </Typography>
                  <Typography className="font-inter-regular text-caption-l text-gray-07 mt-0.5 leading-relaxed">
                    No time slot needed. Pay now and we&apos;ll connect you
                    right away.
                  </Typography>
                </View>
              </Card>
            )}

            {bookingType === "SCHEDULED" && (
              <TouchableOpacity
                onPress={() => setShowScheduledSheet(true)}
                activeOpacity={0.9}
                className="transition-transform active:scale-[0.96]"
              >
                {cart.timeSlot?.time?.[0]?.start &&
                cart.bookingType === "SCHEDULED" ? (
                  <Card
                    variant="default"
                    className="flex-row items-center justify-between rounded-[24px] border-0 bg-white p-3 shadow-sm"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-full">
                        <Ionicons
                          name="time"
                          size={20}
                          color="#1D54E2"
                          className="text-blue-03"
                        />
                      </View>
                      <View>
                        <Typography className="font-jakarta-bold text-body-s text-gray-12">
                          Selected Slot
                        </Typography>
                        <Typography className="font-inter-medium text-caption-l text-blue-03 mt-0.5">
                          {formatSelectedSlot(cart.timeSlot.time[0].start)}
                        </Typography>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#7E869A"
                    />
                  </Card>
                ) : (
                  <Card
                    variant="default"
                    className="border-gray-03 flex-row items-center justify-between rounded-[24px] border border-dashed bg-white p-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="bg-gray-01 h-10 w-10 items-center justify-center rounded-full">
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#7E869A"
                        />
                      </View>
                      <View>
                        <Typography className="font-jakarta-bold text-body-s text-gray-12">
                          Select Slot
                        </Typography>
                        <Typography className="font-inter-regular text-caption-l text-gray-07 mt-0.5">
                          Choose date & time for service
                        </Typography>
                      </View>
                    </View>
                  </Card>
                )}
              </TouchableOpacity>
            )}

            {bookingType === "RECURRING" && (
              <TouchableOpacity
                onPress={() => setShowRecurringSheet(true)}
                activeOpacity={0.9}
                className="transition-transform active:scale-[0.96]"
              >
                {cart.timeSlot?.time?.[0]?.start &&
                cart.bookingType === "RECURRING" ? (
                  <Card
                    variant="default"
                    className="flex-row items-center justify-between rounded-[24px] border-0 bg-white p-3 shadow-sm"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-full">
                        <Ionicons
                          name="repeat"
                          size={20}
                          color="#1D54E2"
                          className="text-blue-03"
                        />
                      </View>
                      <View>
                        <Typography className="font-jakarta-bold text-body-s text-gray-12">
                          Active Schedule
                        </Typography>
                        <Typography className="font-inter-medium text-caption-l text-blue-03 mt-0.5">
                          {formatRecurringSchedule(cart)}
                        </Typography>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#7E869A"
                    />
                  </Card>
                ) : (
                  <Card
                    variant="default"
                    className="border-gray-03 flex-row items-center justify-between rounded-[24px] border border-dashed bg-white p-3"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="bg-gray-01 h-10 w-10 items-center justify-center rounded-full">
                        <Ionicons
                          name="repeat-outline"
                          size={20}
                          color="#7E869A"
                        />
                      </View>
                      <View>
                        <Typography className="font-jakarta-bold text-body-s text-gray-12">
                          Set Schedule
                        </Typography>
                        <Typography className="font-inter-regular text-caption-l text-gray-07 mt-0.5">
                          Choose recurring frequency & slot
                        </Typography>
                      </View>
                    </View>
                  </Card>
                )}
              </TouchableOpacity>
            )}
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
              <Card
                variant="default"
                className="bg-green-01 border-green-03 flex-row items-center justify-between rounded-[24px] border p-3"
              >
                <View className="flex-row items-center gap-3">
                  <Typography className="text-xl">🏷️</Typography>
                  <View>
                    <Typography className="font-inter-bold text-body-s text-green-08">
                      {cart.coupon.code} Applied
                    </Typography>
                    <Typography className="font-inter-medium text-caption-l text-green-08 mt-0.5 tabular-nums">
                      You saved ₹{cart.discountAmount}
                    </Typography>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleRemoveCoupon}
                  activeOpacity={0.8}
                  className="px-2 py-1 transition-transform active:scale-[0.96]"
                >
                  <Typography className="font-inter-semibold text-body-s text-danger">
                    Remove
                  </Typography>
                </TouchableOpacity>
              </Card>
            ) : (
              <TouchableOpacity
                onPress={() => setShowCouponSheet(true)}
                activeOpacity={0.9}
                className="transition-transform active:scale-[0.96]"
              >
                <Card
                  variant="default"
                  className="flex-row items-center justify-between rounded-[24px] border-0 bg-white p-3 shadow-sm"
                >
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
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
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, spacing[5]) },
        ]}
      >
        <View>
          <Typography className="text-caption-l text-gray-07 font-inter-regular">
            Amount
          </Typography>
          <Typography className="text-blue-03 font-jakarta-bold mt-0.5 text-[22px] tabular-nums">
            ₹{cart.finalTotalAmount}
          </Typography>
        </View>

        <Button
          variant="primary"
          className="bg-blue-03 ml-6 h-[52px] flex-1 justify-center rounded-xl transition-transform active:scale-[0.96]"
          onPress={handleCheckout}
        >
          <Button.Label>Checkout</Button.Label>
        </Button>
      </View>

      {/* Coupon Selector Bottom Sheet */}
      {showCouponSheet && (
        <BottomSheet isOpen={showCouponSheet} onOpenChange={setShowCouponSheet}>
          <BottomSheet.Portal>
            <BottomSheet.Overlay />
            <BottomSheet.Content
              backgroundClassName="rounded-t-[32px]"
              snapPoints={["45%"]}
              index={0}
              enableOverDrag={false}
              enableDynamicSizing={false}
              handleIndicatorClassName="w-12 h-1.5 bg-gray-03 rounded-full self-center mt-3"
            >
              <BottomSheet.Close />
              <View style={styles.couponSheet} className="px-5 pb-8">
                <View className="h-2" />
                <BottomSheet.Title className="font-jakarta-bold text-h5 text-gray-12 mb-5">
                  Apply Coupon
                </BottomSheet.Title>

                <View className="mb-6 flex-row items-start gap-3">
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
                    className="bg-blue-03 h-[44px] justify-center transition-transform active:scale-[0.96]"
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
                        className="border-gray-02 flex-row items-center justify-between border-b py-3.5 transition-transform active:scale-[0.96]"
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
            </BottomSheet.Content>
          </BottomSheet.Portal>
        </BottomSheet>
      )}

      {/* Scheduled Time Selector Bottom Sheet */}
      {showScheduledSheet && (
        <ScheduledSheet
          isVisible={showScheduledSheet}
          onClose={() => setShowScheduledSheet(false)}
          onConfirm={handleScheduledConfirm}
          initialDate={
            cart.timeSlot?.time?.[0]?.start
              ? cart.timeSlot.time[0].start.split("T")[0]
              : null
          }
          initialSlot={
            cart.timeSlot?.time?.[0]?.start && cart.bookingType === "SCHEDULED"
              ? {
                  startTime: cart.timeSlot.time[0].start,
                  isFull: false,
                  isExperiencingSurge: parseFloat(cart.surgePrice || "0") > 0,
                  surgePrice: parseFloat(cart.surgePrice || "0"),
                }
              : null
          }
          totalAmount={cart.finalTotalAmount}
          addressLat={addressLat}
          addressLng={addressLng}
        />
      )}

      {/* Recurring Schedule Selector Bottom Sheet */}
      {showRecurringSheet && (
        <RecurringSheet
          isVisible={showRecurringSheet}
          onClose={() => setShowRecurringSheet(false)}
          onConfirm={handleRecurringConfirm}
          initialFrequency={cart.recurringType || "WEEKLY"}
          initialDate={
            cart.timeSlot?.time?.[0]?.start
              ? cart.timeSlot.time[0].start.split("T")[0]
              : null
          }
          initialSlot={
            cart.timeSlot?.time?.[0]?.start && cart.bookingType === "RECURRING"
              ? {
                  startTime: cart.timeSlot.time[0].start,
                  isFull: false,
                  isExperiencingSurge: parseFloat(cart.surgePrice || "0") > 0,
                  surgePrice: parseFloat(cart.surgePrice || "0"),
                }
              : null
          }
          totalAmount={cart.finalTotalAmount}
          addressLat={addressLat}
          addressLng={addressLng}
        />
      )}
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
