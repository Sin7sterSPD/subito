import React, { useEffect, useState } from "react"
import { View } from "react-native"
import { Typography, Button, BottomSheet } from "heroui-native"
import { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { SlotPicker } from "./slot-picker"
import { useBookingsStore } from "../../store"
import { BookingSlot } from "../../types/api"

interface ScheduledSheetProps {
  isVisible: boolean
  onClose: () => void
  onConfirm: (date: string, slot: BookingSlot) => void
  initialDate?: string | null
  initialSlot?: BookingSlot | null
  totalAmount: string
  addressLat: number
  addressLng: number
}

const formatSelectedSummary = (dateStr: string, slot: BookingSlot) => {
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
  const date = new Date(dateStr)
  const dayName = days[date.getDay()]
  const dayNum = date.getDate()
  const monthName = months[date.getMonth()]

  let hours: number
  let minutes: number
  if (slot.startTime.includes("T")) {
    const d = new Date(slot.startTime)
    hours = d.getHours()
    minutes = d.getMinutes()
  } else {
    const parts = slot.startTime.split(":")
    hours = parseInt(parts[0], 10)
    minutes = parseInt(parts[1], 10)
  }
  const ampm = hours >= 12 ? "PM" : "AM"
  const h12 = hours % 12 || 12
  const strMin = minutes < 10 ? "0" + minutes : minutes

  return {
    line1: `${dayName}, ${dayNum} ${monthName}`,
    line2: `${h12}:${strMin} ${ampm}`,
  }
}

export function ScheduledSheet({
  isVisible,
  onClose,
  onConfirm,
  initialDate,
  initialSlot,
  totalAmount,
  addressLat,
  addressLng,
}: ScheduledSheetProps) {
  const { slots, availableDates, fetchSlots, isLoading } = useBookingsStore()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)

  useEffect(() => {
    if (isVisible && addressLat && addressLng) {
      fetchSlots(addressLat, addressLng, "SCHEDULED", 14)
    }
  }, [isVisible, addressLat, addressLng, fetchSlots])

  useEffect(() => {
    if (isVisible) {
      setSelectedDate(initialDate || null)
      setSelectedSlot(initialSlot || null)
    }
  }, [isVisible, initialDate, initialSlot])

  useEffect(() => {
    if (isVisible && availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0])
    }
  }, [isVisible, availableDates, selectedDate])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleConfirm = () => {
    if (selectedDate && selectedSlot) {
      onConfirm(selectedDate, selectedSlot)
    }
  }

  const isConfirmDisabled = !selectedDate || !selectedSlot
  const summary =
    selectedDate && selectedSlot
      ? formatSelectedSummary(selectedDate, selectedSlot)
      : null

  return (
    <BottomSheet
      isOpen={isVisible}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)" }} />
        <BottomSheet.Content
          backgroundClassName="rounded-t-[32px]"
          snapPoints={["80%"]}
          index={0}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full flex-col justify-between"
          handleIndicatorClassName="w-12 h-1.5 bg-gray-03 rounded-full self-center mt-3"
        >
          <BottomSheet.Close />
          
          <BottomSheetScrollView
            contentContainerClassName="px-5 pb-6"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <View className="h-2" />
            <BottomSheet.Title className="font-jakarta-bold text-h5 text-gray-12 mb-5">
              Schedule Service
            </BottomSheet.Title>

            {isLoading ? (
              <SlotPicker
                slots={{}}
                availableDates={[]}
                selectedDate={null}
                selectedSlot={null}
                onDateChange={() => {}}
                onSlotChange={() => {}}
                isLoading
              />
            ) : (
              <SlotPicker
                slots={slots}
                availableDates={availableDates}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onDateChange={handleDateChange}
                onSlotChange={setSelectedSlot}
                showDateLabel={false}
              />
            )}

            {summary && (
              <View className="bg-blue-01 border-blue-02 mt-6 rounded-2xl border p-4">
                <Typography className="font-inter-semibold text-[13px] text-gray-07 mb-2">
                  Selected Slot
                </Typography>
                <Typography className="font-jakarta-semibold text-body-s text-gray-12">
                  {summary.line1}
                </Typography>
                <Typography className="font-jakarta-bold text-body-m text-blue-03 mt-0.5">
                  {summary.line2}
                </Typography>
              </View>
            )}
          </BottomSheetScrollView>

          {/* Sticky Footer */}
          <View className="border-gray-02 bg-white px-5 py-4 border-t flex-row items-center justify-between pb-8">
            <View>
              <Typography className="text-caption-l text-gray-07 font-inter-regular">
                Total Amount
              </Typography>
              <Typography className="text-gray-12 font-jakarta-bold mt-0.5 text-[20px] tabular-nums">
                ₹{totalAmount}
              </Typography>
            </View>

            <Button
              variant="primary"
              className="bg-blue-03 h-[48px] rounded-xl px-6 justify-center transition-transform active:scale-[0.96]"
              onPress={handleConfirm}
              isDisabled={isConfirmDisabled}
              style={isConfirmDisabled && { opacity: 0.5 }}
            >
              <Button.Label>Confirm & Proceed</Button.Label>
            </Button>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}
