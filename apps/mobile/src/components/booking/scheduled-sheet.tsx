import React, { useEffect, useState } from "react"
import { View, StyleSheet } from "react-native"
import { Typography, Spinner, Button, BottomSheet } from "heroui-native"
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
      fetchSlots(addressLat, addressLng, "SCHEDULED")
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

  return (
    <BottomSheet isOpen={isVisible} onOpenChange={(open) => { if (!open) onClose() }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content backgroundClassName="rounded-t-[24px]">
          <BottomSheet.Close />
          <View style={styles.content} className="px-4 pb-6">
            <BottomSheet.Title className="font-jakarta-bold text-h6 text-gray-12 mb-4">
              Select Date & Time
            </BottomSheet.Title>

            {isLoading ? (
              <View className="py-12 items-center justify-center">
                <Spinner size="lg" />
                <Typography className="font-inter-regular text-body-s text-gray-07 mt-3">
                  Fetching available slots...
                </Typography>
              </View>
            ) : (
              <SlotPicker
                slots={slots}
                availableDates={availableDates}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onDateChange={handleDateChange}
                onSlotChange={setSelectedSlot}
              />
            )}

            <View className="flex-row items-center justify-between mt-6 pt-4 border-t border-gray-02">
              <View>
                <Typography className="text-caption-l text-gray-07 font-inter-regular">
                  Total Amount
                </Typography>
                <Typography className="text-gray-12 font-jakarta-bold text-[20px] mt-0.5 tabular-nums">
                  ₹{totalAmount}
                </Typography>
              </View>

              <Button
                variant="primary"
                className="bg-blue-03 h-[48px] rounded-xl px-6 active:scale-[0.96] transition-transform"
                onPress={handleConfirm}
                isDisabled={isConfirmDisabled}
                style={isConfirmDisabled && { opacity: 0.5 }}
              >
                <Button.Label>Confirm & Proceed</Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    minHeight: 350,
  },
})
