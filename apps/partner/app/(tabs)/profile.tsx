import { Alert, ScrollView, View, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Button, Chip } from "heroui-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore, useJobsStore } from "@/src/store"

const AVAILABILITY_CONFIG: Record<string, { label: string; className: string }> = {
  online: { label: "Online", className: "bg-green-01 text-green-09" },
  busy: { label: "On a job", className: "bg-orange-01 text-orange-09" },
  offline: { label: "Offline", className: "bg-gray-02 text-gray-12" },
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  label: string
}) {
  return (
    <View className="flex-1 items-center">
      <View className="h-9 w-9 rounded-full bg-blue-01 items-center justify-center">
        <Ionicons name={icon} size={16} color="#1d54e2" />
      </View>
      <Text className="text-body-s font-inter-bold text-gray-13 mt-2">
        {value}
      </Text>
      <Text className="text-caption-m text-gray-07 font-inter-regular">
        {label}
      </Text>
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, partnerProfile, logout } = useAuthStore()
  const resetJobs = useJobsStore((s) => s.reset)

  const availability =
    AVAILABILITY_CONFIG[partnerProfile?.availabilityStatus ?? "offline"] ??
    AVAILABILITY_CONFIG.offline

  const initials = (partnerProfile?.name ?? user?.firstName ?? "P")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const rating = partnerProfile?.rating
    ? Number.parseFloat(partnerProfile.rating).toFixed(1)
    : "—"

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          resetJobs()
          void logout()
          router.replace("/(auth)/login")
        },
      },
    ])
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#f7f7f8" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-h6 text-gray-13 font-jakarta-bold">Profile</Text>
        </View>

        {/* Identity card */}
        <View className="mx-4 mt-3 rounded-2xl bg-white p-5 items-center">
          <View className="h-16 w-16 rounded-full bg-blue-03 items-center justify-center">
            <Text className="text-body-l font-inter-bold text-white">
              {initials}
            </Text>
          </View>
          <Text className="text-body-s font-inter-semibold text-gray-13 mt-3">
            {partnerProfile?.name ?? user?.firstName ?? "Subito Partner"}
          </Text>
          <Text className="text-caption-l text-gray-07 font-inter-regular mt-0.5">
            {partnerProfile?.phone ?? user?.phone}
          </Text>
          <View className="mt-3">
            <Chip size="sm" className={availability.className}>
              {availability.label}
            </Chip>
          </View>
        </View>

        {/* Stats */}
        <View className="mx-4 mt-3 rounded-2xl bg-white p-5 flex-row">
          <StatItem icon="star" value={rating} label={`Rating (${partnerProfile?.totalRatings ?? 0})`} />
          <StatItem
            icon="checkmark-done"
            value={String(partnerProfile?.completedBookings ?? 0)}
            label="Completed"
          />
          <StatItem
            icon="briefcase"
            value={String(partnerProfile?.totalBookings ?? 0)}
            label="Total jobs"
          />
        </View>

        {/* Account details */}
        <View className="mx-4 mt-3 rounded-2xl bg-white p-5">
          <Text className="text-caption-l font-inter-semibold text-gray-12">
            Account
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-caption-l text-gray-07 font-inter-regular">
              Partner ID
            </Text>
            <Text className="text-caption-l font-inter-medium text-gray-12">
              {partnerProfile?.id?.slice(0, 8).toUpperCase() ?? "—"}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-caption-l text-gray-07 font-inter-regular">
              Account status
            </Text>
            <Text className="text-caption-l font-inter-medium text-gray-12 capitalize">
              {partnerProfile?.status ?? "—"}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-caption-l text-gray-07 font-inter-regular">
              Services
            </Text>
            <Text className="text-caption-l font-inter-medium text-gray-12">
              {partnerProfile?.services?.filter((s) => s.isActive).length ?? 0} active
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <View className="mx-4 mt-4">
          <Button variant="primary" className="bg-red-01 py-3" onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#e6483d" />
            <Button.Label className="text-red-08">Sign out</Button.Label>
          </Button>
        </View>

        <Text className="text-caption-m text-gray-06 font-inter-regular text-center mt-6">
          Subito Partner v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
