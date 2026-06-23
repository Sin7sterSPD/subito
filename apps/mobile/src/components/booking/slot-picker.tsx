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
import { Ionicons } from "@expo/vector-icons"

interface SlotPickerProps {
  slots: Record<string, BookingSlot[]>
  availableDates: string[]
  selectedDate: string | null
  selectedSlot: BookingSlot | null
  onDateChange: (date: string) => void
  onSlotChange: (slot: BookingSlot) => void
  label?: string
  showDateLabel?: boolean
}

const formatDateChip = (dateStr: string) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  
  const isToday = date.getFullYear() === today.getFullYear() &&
                  date.getMonth() === today.getMonth() &&
                  date.getDate() === today.getDate()
                  
  const isTomorrow = date.getFullYear() === tomorrow.getFullYear() &&
                    date.getMonth() === tomorrow.getMonth() &&
                    date.getDate() === tomorrow.getDate()

  if (isToday) {
    return { dayName: "Today", dateNum: date.getDate().toString() }
  }
  if (isTomorrow) {
    return { dayName: "Tomorrow", dateNum: date.getDate().toString() }
  }
  
  return { dayName: days[date.getDay()], dateNum: date.getDate().toString() }
}

const formatTimeSlot = (startTime: string) => {
  if (startTime.includes("T")) {
    const date = new Date(startTime)
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    const strMinutes = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${strMinutes} ${ampm}`
  }
  return startTime
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
}: SlotPickerProps) {
  const activeSlots = selectedDate ? (slots[selectedDate] || []) : []

  return (
    <View className="gap-4">
      {showDateLabel && (
        <Typography className="font-jakarta-bold text-body-m text-gray-12">
          {label}
        </Typography>
      )}

      {/* Date Select Horizontal Chips */}
      {availableDates.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {availableDates.map((dateStr) => {
            const isSelected = selectedDate === dateStr
            const { dayName, dateNum } = formatDateChip(dateStr)
            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => onDateChange(dateStr)}
                activeOpacity={0.8}
                className={`items-center justify-center p-3 px-4 mr-2.5 rounded-2xl border ${
                  isSelected
                    ? "bg-blue-03 border-blue-03"
                    : "bg-white border-gray-02"
                }`}
                style={styles.dateChip}
              >
                <Typography
                  className={`font-inter-medium text-caption-m ${
                    isSelected ? "text-white" : "text-gray-07"
                  }`}
                >
                  {dayName}
                </Typography>
                <Typography
                  className={`font-jakarta-bold text-body-m mt-0.5 ${
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
        <Typography className="font-inter-regular text-body-s text-gray-07 text-center py-4">
          No dates available
        </Typography>
      )}

      {/* Time Grid Layout */}
      {selectedDate && (
        <View className="gap-2.5">
          <Typography className="font-jakarta-bold text-caption-l text-gray-07">
            Select Start Time
          </Typography>
          {activeSlots.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {activeSlots.map((slot) => {
                const isSelected = selectedSlot?.startTime === slot.startTime
                const isFull = slot.isFull
                const isSurge = slot.isExperiencingSurge

                return (
                  <TouchableOpacity
                    key={slot.startTime}
                    disabled={isFull}
                    onPress={() => onSlotChange(slot)}
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-center py-3 rounded-xl border relative ${
                      isSelected
                        ? "bg-blue-03 border-blue-03"
                        : isFull
                        ? "bg-gray-01 border-gray-02 opacity-40"
                        : "bg-white border-gray-02"
                    }`}
                    style={styles.timeChip}
                  >
                    <Typography
                      className={`font-inter-semibold text-body-s ${
                        isSelected ? "text-white" : isFull ? "text-gray-05" : "text-gray-12"
                      }`}
                    >
                      {formatTimeSlot(slot.startTime)}
                    </Typography>

                    {isSurge && !isFull && (
                      <View className="absolute -top-1.5 -right-1 bg-orange-01 border border-orange-03 px-1 rounded">
                        <Typography className="text-[8px] font-inter-bold text-orange-08">
                          SURGE
                        </Typography>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : (
            <Typography className="font-inter-regular text-body-s text-gray-07 text-center py-4">
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
    minWidth: 72,
    alignItems: "center",
  },
  timeChip: {
    width: (Dimensions.get("window").width - spacing[4] * 2 - 16) / 3, // 3-column layout
  },
})
