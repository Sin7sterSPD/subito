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
import { colors, semantic } from "../../src/theme/colors"
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
          <Typography type="h4" weight="bold" align="center" style={{ color: semantic.textPrimary }}>
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

        <View style={styles.content}>
          <Card style={styles.codeCard} variant="default">
            <Typography type="body" color="muted" align="center">
              Your Referral Code
            </Typography>
            <View style={styles.codeContainer}>
              <Typography type="h3" weight="bold" className="text-accent">
                {referralCode}
              </Typography>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyCode}
                disabled={!hasReferralCode}
              >
                <Ionicons name="copy" size={20} color={semantic.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="secondary">
              <Typography type="h4" weight="bold" className="text-accent">
                {referralSummary?.totalReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted">
                Total Referrals
              </Typography>
            </Card>
            <Card style={styles.statCard} variant="secondary">
              <Typography type="h4" weight="bold" style={{ color: semantic.success }}>
                {referralSummary?.successfulReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted">
                Successful
              </Typography>
            </Card>
            <Card style={styles.statCard} variant="secondary">
              <Typography type="h4" weight="bold" style={{ color: semantic.warning }}>
                {referralSummary?.pendingReferrals || 0}
              </Typography>
              <Typography type="body-sm" color="muted">
                Pending
              </Typography>
            </Card>
          </View>

          {referralSummary?.totalEarnings &&
            parseFloat(referralSummary.totalEarnings) > 0 && (
              <Card style={styles.earningsCard} variant="default">
                <View style={styles.earningsContent}>
                  <View style={styles.earningsIcon}>
                    <Ionicons name="wallet" size={24} color={colors.white} />
                  </View>
                  <View style={styles.earningsText}>
                    <Typography type="body" color="muted">
                      Total Earnings
                    </Typography>
                    <Typography type="h4" weight="bold" style={{ color: semantic.success }}>
                      ₹{referralSummary.totalEarnings}
                    </Typography>
                  </View>
                </View>
              </Card>
            )}

          <View style={styles.howItWorks}>
            <Typography
              type="h6"
              weight="semibold"
              style={[styles.sectionTitle, { color: semantic.textPrimary }]}
            >
              How it works
            </Typography>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Typography type="body-sm" weight="bold" style={{ color: colors.white }}>
                  1
                </Typography>
              </View>
              <View style={styles.stepContent}>
                <Typography type="body" weight="medium" style={{ color: semantic.textPrimary }}>
                  Share your code
                </Typography>
                <Typography type="body" color="muted">
                  Send your referral code to friends
                </Typography>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Typography type="body-sm" weight="bold" style={{ color: colors.white }}>
                  2
                </Typography>
              </View>
              <View style={styles.stepContent}>
                <Typography type="body" weight="medium" style={{ color: semantic.textPrimary }}>
                  Friend signs up
                </Typography>
                <Typography type="body" color="muted">
                  They use your code during registration
                </Typography>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Typography type="body-sm" weight="bold" style={{ color: colors.white }}>
                  3
                </Typography>
              </View>
              <View style={styles.stepContent}>
                <Typography type="body" weight="medium" style={{ color: semantic.textPrimary }}>
                  Both earn rewards
                </Typography>
                <Typography type="body" color="muted">
                  Get credits after their first booking
                </Typography>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleShare}
          isDisabled={!hasReferralCode}
          className="w-full"
        >
          <Button.Label>Share with Friends</Button.Label>
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
    borderRadius: 40,
    backgroundColor: colors.orange[8],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  headerSubtitle: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
  content: {
    padding: spacing[4],
  },
  codeCard: {
    alignItems: "center",
    marginBottom: spacing[4],
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing[2],
  },
  copyButton: {
    marginLeft: spacing[3],
    padding: spacing[2],
    backgroundColor: colors.blue[1],
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[4],
  },
  earningsCard: {
    marginBottom: spacing[6],
  },
  earningsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: semantic.success,
    alignItems: "center",
    justifyContent: "center",
  },
  earningsText: {
    marginLeft: spacing[4],
  },
  howItWorks: {
    marginTop: spacing[2],
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing[4],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: semantic.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
})
