import React, { useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity } from "react-native"
import { Typography, Spinner, Button, BottomSheet } from "heroui-native"
import { BottomSheetScrollView } from "@gorhom/bottom-sheet"
import { SlotPicker } from "./slot-picker"
import { useBookingsStore } from "../../store"
import { BookingSlot, RecurringType } from "../../types/api"

interface RecurringSheetProps {
  isVisible: boolean
  onClose: () => void
  onConfirm: (data: {
    recurringType: RecurringType
    days?: string[]
    date: string
    slot: BookingSlot
  }) => void
  initialFrequency?: RecurringType
  initialDays?: string[]
  initialDate?: string | null
  initialSlot?: BookingSlot | null
  totalAmount: string
  addressLat: number
  addressLng: number
}

const FREQUENCIES: { label: string; value: RecurringType }[] = [
  { label: "Weekly", value: "WEEKLY" },
  { label: "Biweekly", value: "BIWEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
]

const WEEKDAYS = [
  { label: "M", value: "Mon" },
  { label: "T", value: "Tue" },
  { label: "W", value: "Wed" },
  { label: "Th", value: "Thu" },
  { label: "F", value: "Fri" },
  { label: "Sa", value: "Sat" },
  { label: "Su", value: "Sun" },
]

export function RecurringSheet({
  isVisible,
  onClose,
  onConfirm,
  initialFrequency = "WEEKLY",
  initialDays = [],
  initialDate,
  initialSlot,
  totalAmount,
  addressLat,
  addressLng,
}: RecurringSheetProps) {
  const { slots, availableDates, fetchSlots, isLoading } = useBookingsStore()
  const [frequency, setFrequency] = useState<RecurringType>("WEEKLY")
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null)

  useEffect(() => {
    if (isVisible && addressLat && addressLng) {
      fetchSlots(addressLat, addressLng, "RECURRING")
    }
  }, [isVisible, addressLat, addressLng, fetchSlots])

  useEffect(() => {
    if (isVisible) {
      setFrequency(initialFrequency)
      setSelectedDays(initialDays)
      setSelectedDate(initialDate || null)
      setSelectedSlot(initialSlot || null)
    }
  }, [isVisible, initialFrequency, initialDays, initialDate, initialSlot])

  useEffect(() => {
    if (isVisible && availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0])
    }
  }, [isVisible, availableDates, selectedDate])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  const handleConfirm = () => {
    if (selectedDate && selectedSlot) {
      onConfirm({
        recurringType: frequency,
        days: frequency === "WEEKLY" ? selectedDays : undefined,
        date: selectedDate,
        slot: selectedSlot,
      })
    }
  }

  const isConfirmDisabled =
    !selectedDate ||
    !selectedSlot ||
    (frequency === "WEEKLY" && selectedDays.length === 0)

  return (
    <BottomSheet isOpen={isVisible} onOpenChange={(open) => { if (!open) onClose() }}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          backgroundClassName="rounded-t-[24px]"
          snapPoints={["65%", "90%"]}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
        >
          <BottomSheet.Close />
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            className="px-4 pb-6"
            showsVerticalScrollIndicator={false}
          >
            <BottomSheet.Title className="font-jakarta-bold text-h6 text-gray-12 mb-4">
              Set Recurring Schedule
            </BottomSheet.Title>

            {/* Frequency Selector */}
            <View className="gap-2.5 mb-5">
              <Typography className="font-jakarta-bold text-body-s text-gray-07">
                Frequency
              </Typography>
              <View className="flex-row gap-2.5">
                {FREQUENCIES.map((freq) => {
                  const isSelected = frequency === freq.value
                  return (
                    <TouchableOpacity
                      key={freq.value}
                      onPress={() => setFrequency(freq.value)}
                      activeOpacity={0.8}
                      className={`flex-1 py-3 items-center justify-center rounded-xl border active:scale-[0.96] transition-transform ${
                        isSelected ? "bg-blue-03 border-blue-03" : "bg-white border-gray-02"
                      }`}
                    >
                      <Typography
                        className={`font-inter-semibold text-body-s ${
                          isSelected ? "text-white" : "text-gray-12"
                        }`}
                      >
                        {freq.label}
                      </Typography>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Days Selector (Weekly only) */}
            {frequency === "WEEKLY" && (
              <View className="gap-2.5 mb-5">
                <Typography className="font-jakarta-bold text-body-s text-gray-07">
                  Select Days
                </Typography>
                <View className="flex-row justify-between gap-1.5">
                  {WEEKDAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.value)
                    return (
                      <TouchableOpacity
                        key={day.value}
                        onPress={() => handleDayToggle(day.value)}
                        activeOpacity={0.8}
                        className={`h-10 w-10 items-center justify-center rounded-full border active:scale-[0.96] transition-transform ${
                          isSelected ? "bg-blue-03 border-blue-03" : "bg-white border-gray-02"
                        }`}
                      >
                        <Typography
                          className={`font-inter-semibold text-caption-m ${
                            isSelected ? "text-white" : "text-gray-12"
                          }`}
                        >
                          {day.label}
                        </Typography>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Date and Time Selector */}
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
                label="First Occurs On"
              />
            )}

            {/* Sticky footer inside Sheet content */}
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
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
})
