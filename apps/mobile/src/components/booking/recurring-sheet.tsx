import React, { useEffect, useState } from "react"
import { View, TouchableOpacity } from "react-native"
import { Typography, Button, BottomSheet } from "heroui-native"
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

const formatSelectedSummary = (dateStr: string, slot: BookingSlot) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
      fetchSlots(addressLat, addressLng, "RECURRING", 14)
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
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
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

  const summary =
    selectedDate && selectedSlot
      ? formatSelectedSummary(selectedDate, selectedSlot)
      : null

  return (
    <BottomSheet isOpen={isVisible} onOpenChange={(open) => { if (!open) onClose() }}>
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
              Set Recurring Schedule
            </BottomSheet.Title>

            <View className="gap-3 mb-5">
              <Typography className="font-jakarta-semibold text-body-m text-gray-12">
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
                        isSelected
                          ? "bg-blue-03 border-blue-03"
                          : "bg-white border-gray-02"
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

            {frequency === "WEEKLY" && (
              <View className="gap-3 mb-5">
                <Typography className="font-jakarta-semibold text-body-m text-gray-12">
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
                        className={`h-11 w-11 items-center justify-center rounded-full border active:scale-[0.96] transition-transform ${
                          isSelected
                            ? "bg-blue-03 border-blue-03"
                            : "bg-white border-gray-02"
                        }`}
                      >
                        <Typography
                          className={`font-inter-semibold text-body-s ${
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

            <View className="gap-2 mb-3">
              <Typography className="font-jakarta-semibold text-body-m text-gray-12">
                First Occurs On
              </Typography>
            </View>

            {isLoading ? (
              <SlotPicker
                slots={{}}
                availableDates={[]}
                selectedDate={null}
                selectedSlot={null}
                onDateChange={() => {}}
                onSlotChange={() => {}}
                showDateLabel={false}
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
              <View className="mt-6 bg-blue-01 rounded-2xl p-4 border border-blue-02">
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
              <Typography className="text-gray-12 font-jakarta-bold text-[20px] mt-0.5 tabular-nums">
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
