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
      className="flex-row items-center px-4 py-3.5 bg-white active:bg-gray-01"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className={`w-9 h-9 items-center justify-center rounded-sm ${
        danger ? "bg-red-01" : "bg-blue-01"
      }`}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#e6483d" : "#2a9cff"}
        />
      </View>
      <Typography
        type="body"
        className={`flex-1 ml-3 ${danger ? "text-danger" : "text-gray-12"}`}
        weight="medium"
      >
        {label}
      </Typography>
      {badge && (
        <View className="bg-blue-03 px-2 py-0.5 rounded-sm mr-2">
          <Typography type="body-sm" className="text-white font-inter-semibold">
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
    <View className="mb-5 px-4">
      {title && (
        <Typography
          type="body-sm"
          className="text-gray-07 mb-2 ml-1"
          weight="semibold"
        >
          {title}
        </Typography>
      )}
      <Card className="rounded-sm border border-gray-03 bg-white overflow-hidden p-0" variant="default">
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
        
        {/* Profile Info Header */}
        <View className="bg-white p-4 border-b border-gray-03 mb-4">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={handleEditProfile}
            activeOpacity={0.9}
          >
            <Avatar className="w-[60px] h-[60px] rounded-sm">
              {user?.profileImage ? (
                <Avatar.Image source={{ uri: user.profileImage }} className="w-full h-full rounded-sm" />
              ) : null}
              <Avatar.Fallback />
            </Avatar>
            <View className="flex-1 ml-4">
              <Typography type="h5" className="text-gray-12" weight="bold">
                {user?.firstName || "User"} {user?.lastName || ""}
              </Typography>
              <Typography type="body-sm" className="text-gray-07 mt-0.5">
                +91 {user?.phone}
              </Typography>
              {user?.email && (
                <Typography type="body-sm" className="text-gray-08 mt-0.5">
                  {user.email}
                </Typography>
              )}
            </View>
            <View className="w-9 h-9 rounded-sm bg-blue-01 border border-gray-03 items-center justify-center">
              <Ionicons
                name="create-outline"
                size={18}
                color="#2a9cff"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Refer & Earn Banner */}
        {referralSummary && (
          <View className="px-4 mb-4">
            <Card className="rounded-sm border border-gray-03 bg-orange-01 p-4" variant="secondary">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-sm bg-orange-08 items-center justify-center">
                  <Ionicons name="gift" size={20} color={colors.white} />
                </View>
                <View className="flex-1 ml-3">
                  <Typography type="body-sm" className="text-gray-12" weight="bold">
                    Refer & Earn
                  </Typography>
                  <Typography type="body-sm" className="text-gray-07 mt-0.5">
                    Share your code: {referralSummary.referralCode}
                  </Typography>
                </View>
                <TouchableOpacity
                  className="bg-blue-03 px-4 py-2 rounded-sm active:scale-[0.96]"
                  onPress={handleReferrals}
                  activeOpacity={0.8}
                >
                  <Typography type="body-sm" className="text-white font-inter-semibold">
                    Invite
                  </Typography>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* Account Menu Section */}
        <MenuSection title="Account">
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={handleEditProfile}
          />
          <Separator className="bg-gray-02" />
          <MenuItem
            icon="location-outline"
            label="Saved Addresses"
            onPress={handleAddresses}
          />
          <Separator className="bg-gray-02" />
          <MenuItem
            icon="card-outline"
            label="Payment History"
            onPress={handlePaymentHistory}
          />
          <Separator className="bg-gray-02" />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={handleNotifications}
          />
        </MenuSection>

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
          <Separator className="bg-gray-02" />
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

        <View className="py-6 px-4">
          <Typography type="body-sm" className="text-gray-07 text-center">
            App Version {appVersion || "1.0.0"}
          </Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
