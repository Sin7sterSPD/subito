import React, { useEffect } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  Share,
  TouchableOpacity,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Typography, Card, Button, Spinner } from "heroui-native"
import { colors } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useUserStore, useAuthStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"
import * as Clipboard from "expo-clipboard"

export default function ReferralsScreen() {
  const { user } = useAuthStore()
  const { referralSummary, fetchReferralSummary, isLoading } = useUserStore()

  useEffect(() => {
    fetchReferralSummary()
  }, [fetchReferralSummary])

  const referralCode = referralSummary?.referralCode || user?.referralCode || ""
  const hasReferralCode = referralCode.length > 0

  const handleCopyCode = async () => {
    if (!hasReferralCode) return
    await Clipboard.setStringAsync(referralCode)
  }

  const handleShare = async () => {
    if (!hasReferralCode) return
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} to get amazing discounts on Subito! Download now: https://subito.app`,
        title: "Invite friends to Subito",
      })
    } catch {
      // Sharing cancelled
    }
  }

  if (isLoading && !referralSummary) {
    return <Spinner size="lg" style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="gift" size={48} color={colors.white} />
          </View>
          <Typography type="h4" weight="bold" align="center" style={{ color: "#14151a" }}>
            Refer & Earn
          </Typography>
          <Typography
            type="body"
            color="muted"
            align="center"
            style={styles.headerSubtitle}
          >
            Share your code with friends and earn rewards when they complete
            their first booking
          </Typography>
        </View>

        <View className="p-4">
          
          {/* Referral Code Card */}
          <Card className="items-center mb-4 p-4 rounded-sm border border-gray-03 bg-white" variant="default">
            <Typography type="body" color="muted" align="center">
              Your Referral Code
            </Typography>
            <View className="flex-row items-center mt-2">
              <Typography type="h3" weight="bold" className="text-blue-03">
                {referralCode}
              </Typography>
              <TouchableOpacity
                className="ml-3 p-2 bg-blue-01 rounded-sm border border-blue-03/20"
                onPress={handleCopyCode}
                disabled={!hasReferralCode}
                activeOpacity={0.8}
              >
                <Ionicons name="copy" size={20} color="#2a9cff" />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Stats Grid */}
          <View className="flex-row gap-3 mb-4">
            <Card className="flex-1 items-center p-4 rounded-sm border border-gray-03 bg-white" variant="secondary">
              <Typography type="h4" weight="bold" className="text-blue-03">
                {referralSummary?.totalReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-1">
                Total Referrals
              </Typography>
            </Card>
            <Card className="flex-1 items-center p-4 rounded-sm border border-gray-03 bg-white" variant="secondary">
              <Typography type="h4" weight="bold" className="text-success">
                {referralSummary?.successfulReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-1">
                Successful
              </Typography>
            </Card>
            <Card className="flex-1 items-center p-4 rounded-sm border border-gray-03 bg-white" variant="secondary">
              <Typography type="h4" weight="bold" className="text-warning">
                {referralSummary?.pendingReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted" className="mt-1">
                Pending
              </Typography>
            </Card>
          </View>

          {/* Earnings Card */}
          {referralSummary?.totalEarnings &&
            parseFloat(referralSummary.totalEarnings) > 0 && (
              <Card className="mb-6 p-4 rounded-sm border border-gray-03 bg-white flex-row items-center" variant="default">
                <View className="w-12 h-12 rounded-sm bg-green-01 items-center justify-center mr-4">
                  <Ionicons name="wallet" size={24} color="#26bd6c" />
                </View>
                <View>
                  <Typography type="body" color="muted">
                    Total Earnings
                  </Typography>
                  <Typography type="h4" weight="bold" className="text-success mt-0.5">
                    ₹{referralSummary.totalEarnings}
                  </Typography>
                </View>
              </Card>
            )}

          {/* How It Works Section */}
          <View className="mt-2">
            <Typography
              type="h6"
              weight="semibold"
              className="text-gray-12 mb-4"
            >
              How it works
            </Typography>
            
            <View className="flex-row items-start mb-4">
              <View className="w-7 h-7 rounded-sm bg-blue-03 items-center justify-center mr-3 mt-0.5">
                <Typography type="body-sm" weight="bold" className="text-white">
                  1
                </Typography>
              </View>
              <View className="flex-1">
                <Typography type="body" weight="semibold" className="text-gray-12">
                  Share your code
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                  Send your referral code to friends
                </Typography>
              </View>
            </View>

            <View className="flex-row items-start mb-4">
              <View className="w-7 h-7 rounded-sm bg-blue-03 items-center justify-center mr-3 mt-0.5">
                <Typography type="body-sm" weight="bold" className="text-white">
                  2
                </Typography>
              </View>
              <View className="flex-1">
                <Typography type="body" weight="semibold" className="text-gray-12">
                  Friend signs up
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                  They use your code during registration
                </Typography>
              </View>
            </View>

            <View className="flex-row items-start mb-4">
              <View className="w-7 h-7 rounded-sm bg-blue-03 items-center justify-center mr-3 mt-0.5">
                <Typography type="body-sm" weight="bold" className="text-white">
                  3
                </Typography>
              </View>
              <View className="flex-1">
                <Typography type="body" weight="semibold" className="text-gray-12">
                  Both earn rewards
                </Typography>
                <Typography type="body-sm" color="muted" className="mt-0.5 leading-relaxed">
                  Get credits after their first booking
                </Typography>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer Share Button */}
      <View className="p-4 border-t border-gray-03 bg-white">
        <Button
          onPress={handleShare}
          isDisabled={!hasReferralCode}
          className="w-full bg-blue-03 rounded-sm py-3.5 transition-transform active:scale-[0.96]"
        >
          <Button.Label className="text-white font-inter-bold text-body-s">Share with Friends</Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.orange[1],
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: colors.orange[8],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
})
