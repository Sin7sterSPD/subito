import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useUserStore, useAuthStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function ReferralsScreen() {
  const { user } = useAuthStore();
  const { referralSummary, fetchReferralSummary, isLoading } = useUserStore();

  useEffect(() => {
    fetchReferralSummary();
  }, [fetchReferralSummary]);

  const referralCode = referralSummary?.referralCode || user?.referralCode || 'LOADING';

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(referralCode);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} to get amazing discounts on Subito! Download now: https://subito.app`,
        title: 'Invite friends to Subito',
      });
    } catch {
      // Sharing cancelled
    }
  };

  if (isLoading && !referralSummary) {
    return <Spinner fullScreen message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="gift" size={48} color={colors.white} />
          </View>
          <Text variant="h4" color="textPrimary" weight="700" align="center">
            Refer & Earn
          </Text>
          <Text variant="bodyMedium" color="textSecondary" align="center" style={styles.headerSubtitle}>
            Share your code with friends and earn rewards when they complete their first booking
          </Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.codeCard} variant="outlined">
            <Text variant="captionMedium" color="textMuted" align="center">
              Your Referral Code
            </Text>
            <View style={styles.codeContainer}>
              <Text variant="h3" color="primary" weight="700">
                {referralCode}
              </Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                <Ionicons name="copy" size={20} color={semantic.primary} />
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard} variant="filled">
              <Text variant="h4" color="primary" weight="700">
                {referralSummary?.totalReferrals || 0}
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Total Referrals
              </Text>
            </Card>
            <Card style={styles.statCard} variant="filled">
              <Text variant="h4" color="success" weight="700">
                {referralSummary?.successfulReferrals || 0}
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Successful
              </Text>
            </Card>
            <Card style={styles.statCard} variant="filled">
              <Text variant="h4" color="warning" weight="700">
                {referralSummary?.pendingReferrals || 0}
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Pending
              </Text>
            </Card>
          </View>

          {referralSummary?.totalEarnings && parseFloat(referralSummary.totalEarnings) > 0 && (
            <Card style={styles.earningsCard} variant="elevated">
              <View style={styles.earningsContent}>
                <View style={styles.earningsIcon}>
                  <Ionicons name="wallet" size={24} color={colors.white} />
                </View>
                <View style={styles.earningsText}>
                  <Text variant="captionMedium" color="textMuted">
                    Total Earnings
                  </Text>
                  <Text variant="h4" color="success" weight="700">
                    ₹{referralSummary.totalEarnings}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <View style={styles.howItWorks}>
            <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
              How it works
            </Text>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="bodySmall" color={colors.white} weight="700">
                  1
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="bodySmall" color="textPrimary" weight="500">
                  Share your code
                </Text>
                <Text variant="captionMedium" color="textMuted">
                  Send your referral code to friends
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="bodySmall" color={colors.white} weight="700">
                  2
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="bodySmall" color="textPrimary" weight="500">
                  Friend signs up
                </Text>
                <Text variant="captionMedium" color="textMuted">
                  They use your code during registration
                </Text>
              </View>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="bodySmall" color={colors.white} weight="700">
                  3
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text variant="bodySmall" color="textPrimary" weight="500">
                  Both earn rewards
                </Text>
                <Text variant="captionMedium" color="textMuted">
                  Get credits after their first booking
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onPress={handleShare}
          leftIcon={<Ionicons name="share-social" size={20} color={colors.white} />}
        >
          Share with Friends
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.orange[1],
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orange[8],
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  copyButton: {
    marginLeft: spacing[3],
    padding: spacing[2],
    backgroundColor: colors.blue[1],
    borderRadius: borderRadius.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  earningsCard: {
    marginBottom: spacing[6],
  },
  earningsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
});
