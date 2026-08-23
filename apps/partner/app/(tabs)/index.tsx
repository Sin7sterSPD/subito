import { useCallback, useEffect } from "react"
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter, useFocusEffect } from "expo-router"
import { Switch, Spinner } from "heroui-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore, useJobsStore } from "@/src/store"
import { BookingStatusChip } from "@/src/components/status-chip"
import type { PartnerBookingListItem } from "@/src/types/api"

function formatSchedule(item: PartnerBookingListItem): string | null {
  if (!item.scheduledDate) return null
  const date = item.scheduledDate
  const time = item.scheduledStartTime ? ` · ${item.scheduledStartTime.slice(0, 5)}` : ""
  return `${date}${time}`
}

function AvailabilityCard() {
  const partnerProfile = useAuthStore((s) => s.partnerProfile)
  const isUpdating = useAuthStore((s) => s.isUpdatingAvailability)
  const updateAvailability = useAuthStore((s) => s.updateAvailability)

  if (!partnerProfile) return null

  const availability = partnerProfile.availabilityStatus
  const isBusy = availability === "busy"
  const isOnline = availability === "online"

  const statusLabel = isBusy ? "On a job" : isOnline ? "Online" : "Offline"
  const statusColor = isBusy ? "#f48e2f" : isOnline ? "#26bd6c" : "#9ea2ad"
  const description = isBusy
    ? "Your availability updates automatically when the job is done."
    : isOnline
      ? "You're receiving new job assignments."
      : "Go online to start receiving job assignments."

  return (
    <View className="mx-4 mt-4 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: isOnline ? "#edfdf4" : isBusy ? "#fef4ec" : "#f7f7f8" }}
          >
            <Ionicons
              name={isBusy ? "time" : isOnline ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={statusColor}
            />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-body-s font-inter-semibold text-gray-13">
                {statusLabel}
              </Text>
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
            </View>
            <Text className="text-caption-m text-gray-07 font-inter-regular mt-0.5">
              {description}
            </Text>
          </View>
        </View>

        {isUpdating ? (
          <Spinner size="sm" />
        ) : (
          <Switch
            isSelected={isOnline}
            isDisabled={isBusy}
            onSelectedChange={(selected) => {
              void updateAvailability(selected ? "online" : "offline")
            }}
          >
            <Switch.Thumb />
          </Switch>
        )}
      </View>
    </View>
  )
}

function JobCard({ item }: { item: PartnerBookingListItem }) {
  const router = useRouter()
  const needsAck = item.cancellationAwaitingPartnerAck
  const schedule = formatSchedule(item)

  return (
    <TouchableOpacity
      className="mx-4 mt-3 rounded-2xl bg-white p-4"
      activeOpacity={0.7}
      onPress={() => router.push(`/job/${item.id}`)}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-body-s font-inter-semibold text-gray-13">
          #{item.bookingNumber}
        </Text>
        <BookingStatusChip status={item.status} />
      </View>

      {needsAck ? (
        <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-orange-01 px-3 py-2">
          <Ionicons name="warning" size={14} color="#d9760c" />
          <Text className="text-caption-l font-inter-medium text-orange-09">
            Customer cancelled — action needed
          </Text>
        </View>
      ) : null}

      {item.address ? (
        <View className="mt-3 flex-row items-start gap-2">
          <Ionicons
            name="location-outline"
            size={16}
            color="#7e869a"
            style={{ marginTop: 2 }}
          />
          <Text className="flex-1 text-caption-l text-gray-09 font-inter-regular">
            {item.address.addressLine1}
            {item.address.city ? `, ${item.address.city}` : ""}
          </Text>
        </View>
      ) : null}

      <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          {schedule ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="calendar-outline" size={13} color="#7e869a" />
              <Text className="text-caption-m text-gray-07 font-inter-regular">
                {schedule}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1">
            <Ionicons name="list-outline" size={13} color="#7e869a" />
            <Text className="text-caption-m text-gray-07 font-inter-regular">
              {item.items?.length ?? 0} item{(item.items?.length ?? 0) === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9ea2ad" />
      </View>
    </TouchableOpacity>
  )
}

function EmptyJobs() {
  return (
    <View className="items-center mt-24 px-8">
      <View className="h-16 w-16 rounded-full bg-gray-02 items-center justify-center">
        <Ionicons name="briefcase-outline" size={28} color="#9ea2ad" />
      </View>
      <Text className="text-body-s font-inter-semibold text-gray-12 mt-4">
        No jobs yet
      </Text>
      <Text className="text-caption-l text-gray-07 font-inter-regular mt-1 text-center">
        New assignments will appear here. Make sure you&apos;re online to
        receive jobs.
      </Text>
    </View>
  )
}

export default function JobsScreen() {
  const router = useRouter()
  const { bookings, isLoading, error, fetchBookings } = useJobsStore()
  const partnerProfile = useAuthStore((s) => s.partnerProfile)
  const loadPartnerProfile = useAuthStore((s) => s.loadPartnerProfile)

  useEffect(() => {
    void fetchBookings()
  }, [fetchBookings])

  // Availability flips server-side when jobs are assigned/completed —
  // refresh the profile whenever this screen regains focus.
  useFocusEffect(
    useCallback(() => {
      void loadPartnerProfile()
      void fetchBookings()
    }, [loadPartnerProfile, fetchBookings])
  )

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#f7f7f8" }}>
      <View className="px-4 pt-4 pb-1 flex-row items-center justify-between">
        <View>
          <Text className="text-h6 text-gray-13 font-jakarta-bold">Jobs</Text>
          <Text className="text-caption-l text-gray-07 font-inter-regular mt-0.5">
            Welcome back{partnerProfile?.name ? `, ${partnerProfile.name.split(" ")[0]}` : ""}
          </Text>
        </View>
        <TouchableOpacity
          className="h-10 w-10 rounded-full bg-white items-center justify-center"
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={20} color="#5e636e" />
        </TouchableOpacity>
      </View>

      <AvailabilityCard />

      {error ? (
        <View className="mx-4 mt-4 rounded-xl bg-red-01 px-4 py-3">
          <Text className="text-caption-l font-inter-medium text-red-09">
            {error}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard item={item} />}
        contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void fetchBookings()
              void loadPartnerProfile()
            }}
            tintColor="#1D54E2"
          />
        }
        ListEmptyComponent={!isLoading ? <EmptyJobs /> : null}
        ListHeaderComponent={
          isLoading && bookings.length === 0 ? (
            <View className="items-center mt-24">
              <Spinner size="lg" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}
