import React from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Typography, Card, Avatar, Separator } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { useAuthStore, useUserStore, useAppStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  badge?: string
  danger?: boolean
}

function MenuItem({ icon, label, onPress, badge, danger }: MenuItemProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center bg-white px-3 py-3 active:bg-gray-01"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${
          danger ? "bg-red-01" : "bg-blue-01"
        }`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#e6483d" : "#2a9cff"}
        />
      </View>
      <Typography
        className={`font-inter-medium text-gray-12 ml-3 flex-1 text-[14px] ${
          danger ? "text-danger" : ""
        }`}
      >
        {label}
      </Typography>
      {badge && (
        <View className="bg-blue-03 mr-2 rounded-full px-2 py-0.5">
          <Typography className="font-inter-semibold text-[11px] text-white tabular-nums">
            {badge}
          </Typography>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color="#7E869A" />
    </TouchableOpacity>
  )
}

function MenuSection({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  return (
    <View className="mb-4 px-4">
      {title && (
        <Typography className="font-inter-semibold text-gray-07 mb-2 ml-1 text-[13px]">
          {title}
        </Typography>
      )}
      <Card
        className="overflow-hidden rounded-2xl border border-gray-02 bg-white p-0"
        variant="default"
      >
        {children}
      </Card>
    </View>
  )
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const { referralSummary } = useUserStore()
  const { settings } = useAppStore()
  const appVersion =
    Platform.OS === "ios"
      ? settings?.appVersions?.ios
      : settings?.appVersions?.android

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout()
            router.replace("/(auth)/login")
          },
        },
      ],
      { cancelable: true }
    )
  }

  const handleEditProfile = () => {
    router.push("/(screens)/edit-profile")
  }

  const handleAddresses = () => {
    router.push("/(screens)/addresses")
  }

  const handleReferrals = () => {
    router.push("/(screens)/referrals")
  }

  const handleHelp = () => {
    router.push("/(screens)/help")
  }

  const handleAbout = () => {
    router.push("/(screens)/about")
  }

  const handleNotifications = () => {
    router.push("/(screens)/notifications")
  }

  const handlePaymentHistory = () => {
    router.push("/(screens)/payment-history")
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f8" }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile header card */}
        <View className="px-4 pt-4">
          <TouchableOpacity
            className="flex-row items-center rounded-2xl border border-gray-02 bg-white p-4"
            onPress={handleEditProfile}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Avatar className="h-[60px] w-[60px] rounded-full">
              {user?.profileImage ? (
                <Avatar.Image
                  source={{ uri: user.profileImage }}
                  className="h-full w-full rounded-full"
                />
              ) : null}
              <Avatar.Fallback>
                {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
              </Avatar.Fallback>
            </Avatar>
            <View className="ml-3.5 flex-1">
              <Typography className="font-jakarta-bold text-gray-12 text-[17px]">
                {user?.firstName || "User"} {user?.lastName || ""}
              </Typography>
              <Typography className="font-inter-regular text-gray-07 mt-0.5 text-[13px] tabular-nums">
                +91 {user?.phone}
              </Typography>
              {user?.email ? (
                <Typography
                  numberOfLines={1}
                  className="font-inter-regular text-gray-07 text-[12px]"
                >
                  {user.email}
                </Typography>
              ) : null}
            </View>
            <View className="bg-blue-01 h-10 w-10 items-center justify-center rounded-full">
              <Ionicons
                name="create-outline"
                size={18}
                color="#2a9cff"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Refer & Earn Banner */}
        {referralSummary ? (
          <View className="mt-4 px-4">
            <Card
              className="rounded-2xl border-0 bg-orange-01 p-4"
              variant="secondary"
            >
              <View className="flex-row items-center">
                <View className="bg-orange-08 h-11 w-11 items-center justify-center rounded-2xl">
                  <Ionicons name="gift" size={22} color={colors.white} />
                </View>
                <View className="ml-3 flex-1">
                  <Typography className="font-jakarta-bold text-gray-12 text-[14px]">
                    Refer & Earn
                  </Typography>
                  <Typography className="font-inter-regular text-gray-07 mt-0.5 text-[12px]">
                    Share your code: {referralSummary.referralCode}
                  </Typography>
                </View>
                <TouchableOpacity
                  className="bg-blue-03 rounded-xl px-4 py-2 transition-transform active:scale-[0.96]"
                  onPress={handleReferrals}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Invite friends"
                >
                  <Typography className="font-inter-semibold text-[13px] text-white">
                    Invite
                  </Typography>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        ) : null}

        {/* Account Menu Section */}
        <View className="mt-4">
          <MenuSection title="Account">
            <MenuItem
              icon="person-outline"
              label="Edit Profile"
              onPress={handleEditProfile}
            />
            <Separator className="ml-16 bg-gray-02" />
            <MenuItem
              icon="location-outline"
              label="Saved Addresses"
              onPress={handleAddresses}
            />
            <Separator className="ml-16 bg-gray-02" />
            <MenuItem
              icon="card-outline"
              label="Payment History"
              onPress={handlePaymentHistory}
            />
            <Separator className="ml-16 bg-gray-02" />
            <MenuItem
              icon="notifications-outline"
              label="Notifications"
              onPress={handleNotifications}
            />
          </MenuSection>
        </View>

        {/* Rewards Menu Section */}
        <MenuSection title="Rewards">
          <MenuItem
            icon="gift-outline"
            label="Refer & Earn"
            onPress={handleReferrals}
            badge={referralSummary?.successfulReferrals?.toString()}
          />
        </MenuSection>

        {/* Support Menu Section */}
        <MenuSection title="Support">
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleHelp}
          />
          <Separator className="ml-16 bg-gray-02" />
          <MenuItem
            icon="information-circle-outline"
            label="About"
            onPress={handleAbout}
          />
        </MenuSection>

        {/* Logout Menu Section */}
        <MenuSection>
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            danger
          />
        </MenuSection>

        <View className="px-4 py-6">
          <Typography className="font-inter-regular text-gray-06 text-center text-[12px] tabular-nums">
            App Version {appVersion || "1.0.0"}
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
