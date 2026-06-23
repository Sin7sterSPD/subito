import React from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native"
import { Typography } from "heroui-native"
import { spacing } from "../../theme/spacing"
import { BookingSlot } from "../../types/api"

interface SlotPickerProps {
  slots: Record<string, BookingSlot[]>
  availableDates: string[]
  selectedDate: string | null
  selectedSlot: BookingSlot | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: BookingSlot) => void
  label?: string
  showDateLabel?: boolean
  isLoading?: boolean
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const formatDateChip = (dateStr: string) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()

  if (isToday) {
    return { dayName: "Today", dateNum: date.getDate().toString() }
  }
  if (isTomorrow) {
    return { dayName: "Tomorrow", dateNum: date.getDate().toString() }
  }

  return {
    dayName: WEEKDAYS[date.getDay()],
    dateNum: date.getDate().toString(),
  }
}

const formatTimeSlot = (startTime: string) => {
  let hours = 0
  let minutes = 0
  if (startTime.includes("T")) {
    const date = new Date(startTime)
    hours = date.getHours()
    minutes = date.getMinutes()
  } else {
    const parts = startTime.split(":")
    hours = parseInt(parts[0], 10)
    minutes = parts[1] ? parseInt(parts[1], 10) : 0
  }
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12
  const strMinutes = minutes < 10 ? "0" + minutes : minutes
  return `${displayHours}:${strMinutes} ${ampm}`
}

function DateSkeleton() {
  return (
    <View className="flex-row justify-between px-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          className="bg-gray-01 h-[82px] w-[72px] rounded-[16px]"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </View>
  )
}

function TimeSkeleton() {
  return (
    <View className="gap-3">
      {[1, 2, 3].map((row) => (
        <View key={row} className="flex-row gap-2.5">
          {[1, 2, 3].map((col) => (
            <View
              key={col}
              className="bg-gray-01 h-[48px] flex-1 rounded-[12px]"
              style={{ opacity: 1 - (row + col) * 0.06 }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

export function SlotPicker({
  slots,
  availableDates,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  label = "Select Date & Time",
  showDateLabel = true,
  isLoading = false,
}: SlotPickerProps) {
  const activeSlots = selectedDate ? slots[selectedDate] || [] : []

  console.log("Available Dates", availableDates)
  console.log("Selected Date", selectedDate)
  console.log("Active Slots", activeSlots)

  return (
    <View className="gap-5">
      {showDateLabel && (
        <Typography className="font-jakarta-bold text-body-m text-gray-12">
          {label}
        </Typography>
      )}

      {isLoading ? (
        <DateSkeleton />
      ) : availableDates.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
          contentContainerClassName="gap-2.5"
        >
          {availableDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr
            const { dayName, dateNum } = formatDateChip(dateStr)
            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => onDateChange(dateStr)}
                activeOpacity={0.8}
                className={`items-center justify-center rounded-[16px] border ${
                  isSelected
                    ? "bg-blue-03 border-blue-03"
                    : "border-gray-02 bg-white"
                }`}
                style={styles.dateChip}
              >
                <Typography
                  className={`font-inter-medium text-[11px] ${
                    isSelected ? "text-white" : "text-gray-07"
                  }`}
                >
                  {dayName}
                </Typography>
                <Typography
                  className={`font-jakarta-bold mt-1 text-[18px] ${
                    isSelected ? "text-white" : "text-gray-12"
                  }`}
                >
                  {dateNum}
                </Typography>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      ) : (
        <Typography className="font-inter-regular text-body-s text-gray-07 py-4 text-center">
          No dates available
        </Typography>
      )}

      {selectedDate && (
        <View className="gap-4">
          {isLoading ? (
            <TimeSkeleton />
          ) : activeSlots.length > 0 ? (
            <View className="flex-row flex-wrap gap-2.5">
              {activeSlots.map((slot) => {
                const isSelected = selectedSlot?.startTime === slot.startTime
                const isFull = slot.isFull

                return (
                  <TouchableOpacity
                    key={slot.startTime}
                    disabled={isFull}
                    onPress={() => onSlotChange(slot)}
                    activeOpacity={0.7}
                    className={`items-center justify-center rounded-xl border ${
                      isSelected
                        ? "bg-blue-03 border-blue-03"
                        : isFull
                          ? "bg-gray-01 border-gray-02"
                          : "border-gray-02 bg-white"
                    }`}
                    style={styles.timeChip}
                  >
                    <Typography
                      className={`font-inter-medium text-body-s ${
                        isSelected
                          ? "text-white"
                          : isFull
                            ? "text-gray-04"
                            : "text-gray-08"
                      }`}
                    >
                      {formatTimeSlot(slot.startTime)}
                    </Typography>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <Typography className="font-inter-regular text-body-s text-gray-07 py-4 text-center">
              No slots available for this date
            </Typography>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  dateChip: {
    width: 72,
    height: 82,
  },
  timeChip: {
    width: (Dimensions.get("window").width - spacing[4] * 2 - 20) / 3,
    height: 48,
  },
})
