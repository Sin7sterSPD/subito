import React, { useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import {
  Typography,
  Card,
  Button,
  Spinner,
  TextField,
  Input,
  Label,
  Separator,
} from "heroui-native"
import { colors } from "../../src/theme/colors"
import {
  useCartStore,
  useUserStore,
} from "../../src/store"
import { Ionicons } from "@expo/vector-icons"

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

export default function CheckoutScreen() {
  const {
    cart,
    updateCart,
    checkoutV2,
    isLoading: cartLoading,
  } = useCartStore()
  const { selectedAddress } = useUserStore()
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCheckout = async () => {
    if (!selectedAddress) {
      Alert.alert("Error", "Please select a delivery address")
      router.push("/(screens)/addresses")
      return
    }

    if (cart?.bookingType !== "INSTANT" && !cart?.timeSlot?.time?.[0]?.start) {
      Alert.alert("Error", "Please select a time slot")
      return
    }

    setIsProcessing(true)

    try {
      await updateCart({ 
        deliveryAddressId: selectedAddress.id,
      })

      const result = await checkoutV2()

      if (result.bookingId && result.orderId) {
        router.push({
          pathname: "/(screens)/payment",
          params: {
            orderId: result.orderId,
            bookingId: result.bookingId,
            amount: cart?.finalTotalAmount || "0",
          },
        })
      } else {
        Alert.alert(
          "Error",
          result.error || "Checkout failed. Please try again."
        )
      }
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!cart) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  const isInstant = cart.bookingType === "INSTANT"

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f8" }} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Delivery Address Section */}
        <View className="p-4">
          <Typography
            type="body"
            weight="semibold"
            className="text-gray-12 mb-3"
          >
            Delivery Address
          </Typography>
          
          <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-sm border border-gray-03"
            onPress={() => router.push("/(screens)/addresses")}
            activeOpacity={0.8}
          >
            {selectedAddress ? (
              <>
                <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-sm mr-3">
                  <Ionicons
                    name="location"
                    size={20}
                    color="#2a9cff"
                    className="text-blue-03"
                  />
                </View>
                <View className="flex-1">
                  <Typography type="body-sm" weight="semibold" className="text-gray-12">
                    {selectedAddress.name}
                  </Typography>
                  <Typography
                    type="body-sm"
                    numberOfLines={2}
                    className="text-gray-07 mt-0.5 leading-relaxed"
                  >
                    {selectedAddress.addressLine1}, {selectedAddress.city}
                  </Typography>
                </View>
                <Typography type="body-sm" weight="semibold" className="text-blue-03">
                  Change
                </Typography>
              </>
            ) : (
              <>
                <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-sm mr-3">
                  <Ionicons name="add" size={20} color="#2a9cff" className="text-blue-03" />
                </View>
                <Typography
                  type="body-sm"
                  weight="semibold"
                  className="text-blue-03 flex-1"
                >
                  Add Delivery Address
                </Typography>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Separator className="bg-gray-03 mx-4" />

        {/* Selected Booking Slot Section */}
        {!isInstant && (
          <>
            <View className="p-4">
              <Typography
                type="body"
                weight="semibold"
                className="text-gray-12 mb-3"
              >
                Booking Details
              </Typography>
              
              <Card
                className="flex-row items-center justify-between bg-white p-4 rounded-sm border border-gray-03"
                variant="default"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-sm">
                    <Ionicons
                      name={cart.bookingType === "RECURRING" ? "repeat" : "time"}
                      size={20}
                      color="#2a9cff"
                      className="text-blue-03"
                    />
                  </View>
                  <View className="flex-1">
                    <Typography type="body-sm" weight="semibold" className="text-gray-12">
                      {cart.bookingType === "RECURRING" ? "Active Schedule" : "Selected Slot"}
                    </Typography>
                    <Typography type="body-sm" weight="medium" className="text-blue-03 mt-0.5 leading-relaxed">
                      {cart.bookingType === "RECURRING"
                        ? formatRecurringSchedule(cart)
                        : formatSelectedSlot(cart?.timeSlot?.time?.[0]?.start)}
                    </Typography>
                  </View>
                </View>
              </Card>

              {/* Surge Pricing Alert */}
              {parseFloat(cart.surgePrice || "0") > 0 && (
                <Card className="mt-3 bg-orange-01 border border-orange-03 p-3 rounded-sm flex-row items-center gap-2" variant="secondary">
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={colors.orange[9]}
                  />
                  <Typography
                    type="body-sm"
                    className="text-orange-11 flex-1 font-inter-medium leading-relaxed"
                  >
                    High demand! Surge pricing of ₹{cart.surgePrice} applies
                  </Typography>
                </Card>
              )}
            </View>
            <Separator className="bg-gray-03 mx-4" />
          </>
        )}

        {/* Order Summary Section */}
        <View className="p-4">
          <Typography
            type="body"
            weight="semibold"
            className="text-gray-12 mb-3"
          >
            Order Summary
          </Typography>
          <Card className="bg-white p-4 rounded-sm border border-gray-03" variant="default">
            {cart.items.map((item, idx) => (
              <React.Fragment key={item.id}>
                <View className="flex-row justify-between items-center py-1">
                  <View className="flex-1">
                    <Typography type="body-sm" className="text-gray-12 font-inter-medium">
                      {item.catalog?.name || "Service"}
                    </Typography>
                    <Typography type="body-sm" className="text-gray-07 mt-0.5">
                      Qty: {item.quantity}
                    </Typography>
                  </View>
                  <Typography type="body-sm" weight="semibold" className="text-gray-12 tabular-nums">
                    ₹{item.totalPrice}
                  </Typography>
                </View>
                {idx < cart.items.length - 1 && (
                  <Separator className="bg-gray-02 my-2.5" />
                )}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <Separator className="bg-gray-03 mx-4" />

        {/* Notes for Partner Section */}
        <View className="p-4">
          <TextField>
            <Label className="mb-1.5 font-inter-medium text-body-s text-gray-12">Notes for partner (optional)</Label>
            <Input
              placeholder="Any special instructions..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              className="rounded-sm border border-gray-03 focus:border-blue-03 bg-white p-3 min-h-[80px] leading-relaxed text-body-s"
            />
          </TextField>
        </View>

        <Separator className="bg-gray-03 mx-4" />

        {/* Payment Summary Section */}
        <View className="p-4">
          <Card className="bg-white p-4 rounded-sm border border-gray-03" variant="secondary">
            <View className="flex-row justify-between items-center mb-2.5">
              <Typography type="body-sm" className="text-gray-08">
                Subtotal
              </Typography>
              <Typography type="body-sm" className="text-gray-12 tabular-nums">
                ₹{cart.totalPrice}
              </Typography>
            </View>
            
            {parseFloat(cart.discountAmount || "0") > 0 && (
              <View className="flex-row justify-between items-center mb-2.5">
                <Typography type="body-sm" className="text-green-08 font-inter-semibold">
                  Discount
                </Typography>
                <Typography type="body-sm" className="text-green-08 font-inter-semibold tabular-nums">
                  -₹{cart.discountAmount}
                </Typography>
              </View>
            )}
            
            {parseFloat(cart.surgePrice || "0") > 0 && (
              <View className="flex-row justify-between items-center mb-2.5">
                <Typography type="body-sm" className="text-orange-08 font-inter-semibold">
                  Surge
                </Typography>
                <Typography type="body-sm" className="text-orange-08 font-inter-semibold tabular-nums">
                  +₹{cart.surgePrice}
                </Typography>
              </View>
            )}
            
            <View className="flex-row justify-between items-center mb-2.5">
              <Typography type="body-sm" className="text-gray-08">
                GST
              </Typography>
              <Typography type="body-sm" className="text-gray-12 tabular-nums">
                ₹{cart.gst}
              </Typography>
            </View>
            
            <Separator className="bg-gray-02 my-3" />
            
            <View className="flex-row justify-between items-center">
              <Typography type="body" weight="bold" className="text-gray-12">
                Total Amount
              </Typography>
              <Typography type="body" weight="bold" className="text-blue-03 tabular-nums text-[20px]">
                ₹{cart.finalTotalAmount}
              </Typography>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Footer Payment Bar */}
      <View className="absolute bottom-0 left-0 right-0 flex-row items-center p-4 border-t border-gray-03 bg-white">
        <View className="mr-4">
          <Typography type="body-sm" className="text-gray-07">
            Total
          </Typography>
          <Typography type="h5" weight="bold" className="text-blue-03 tabular-nums">
            ₹{cart.finalTotalAmount}
          </Typography>
        </View>
        <Button
          onPress={handleCheckout}
          isDisabled={!selectedAddress || (!isInstant && !cart?.timeSlot?.time?.[0]?.start) || isProcessing || cartLoading}
          className="bg-blue-03 rounded-sm py-3.5 flex-1 transition-transform active:scale-[0.96]"
        >
          <Button.Label className="text-white font-inter-bold text-body-s">
            {isProcessing ? "Processing..." : "Proceed to Pay"}
          </Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}
