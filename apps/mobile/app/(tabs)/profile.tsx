import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text, Card, Avatar, Divider } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useAuthStore, useUserStore, useAppStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: string;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, badge, danger }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? semantic.error : semantic.primary} />
      </View>
      <Text
        variant="bodyMedium"
        color={danger ? 'error' : 'textPrimary'}
        style={styles.menuLabel}
      >
        {label}
      </Text>
      {badge && (
        <View style={styles.menuBadge}>
          <Text variant="captionMedium" color={colors.white} weight="600">
            {badge}
          </Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
    </TouchableOpacity>
  );
}

function MenuSection({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <View style={styles.menuSection}>
      {title && (
        <Text variant="captionLarge" color="textMuted" style={styles.menuSectionTitle}>
          {title}
        </Text>
      )}
      <Card variant="outlined" padding={0}>
        {children}
      </Card>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { referralSummary } = useUserStore();
  const { settings } = useAppStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEditProfile = () => {
    router.push('/(screens)/edit-profile');
  };

  const handleAddresses = () => {
    router.push('/(screens)/addresses');
  };

  const handleReferrals = () => {
    router.push('/(screens)/referrals');
  };

  const handleHelp = () => {
    router.push('/(screens)/help');
  };

  const handleAbout = () => {
    router.push('/(screens)/about');
  };

  const handleNotifications = () => {
    router.push('/(screens)/notifications');
  };

  const handlePaymentHistory = () => {
    router.push('/(screens)/payment-history');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.profileCard} onPress={handleEditProfile}>
            <Avatar
              source={user?.profileImage}
              name={user?.firstName || 'User'}
              size="lg"
            />
            <View style={styles.profileInfo}>
              <Text variant="h5" color="textPrimary" weight="700">
                {user?.firstName || 'User'} {user?.lastName || ''}
              </Text>
              <Text variant="bodySmall" color="textSecondary">
                +91 {user?.phone}
              </Text>
              {user?.email && (
                <Text variant="captionMedium" color="textMuted">
                  {user.email}
                </Text>
              )}
            </View>
            <View style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={semantic.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {referralSummary && (
          <Card style={styles.referralCard} variant="filled">
            <View style={styles.referralContent}>
              <View style={styles.referralIcon}>
                <Ionicons name="gift" size={24} color={colors.white} />
              </View>
              <View style={styles.referralText}>
                <Text variant="bodySmall" color="textPrimary" weight="600">
                  Refer & Earn
                </Text>
                <Text variant="captionMedium" color="textMuted">
                  Share your code: {referralSummary.referralCode}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.referralButton}
                onPress={handleReferrals}
              >
                <Text variant="captionLarge" color="primary" weight="600">
                  Invite
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <MenuSection title="Account">
          <MenuItem icon="person-outline" label="Edit Profile" onPress={handleEditProfile} />
          <Divider marginVertical={0} />
          <MenuItem icon="location-outline" label="Saved Addresses" onPress={handleAddresses} />
          <Divider marginVertical={0} />
          <MenuItem icon="card-outline" label="Payment History" onPress={handlePaymentHistory} />
          <Divider marginVertical={0} />
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={handleNotifications}
          />
        </MenuSection>

        <MenuSection title="Rewards">
          <MenuItem
            icon="gift-outline"
            label="Refer & Earn"
            onPress={handleReferrals}
            badge={referralSummary?.successfulReferrals?.toString()}
          />
        </MenuSection>

        <MenuSection title="Support">
          <MenuItem icon="help-circle-outline" label="Help & Support" onPress={handleHelp} />
          <Divider marginVertical={0} />
          <MenuItem icon="information-circle-outline" label="About" onPress={handleAbout} />
        </MenuSection>

        <MenuSection>
          <MenuItem icon="log-out-outline" label="Logout" onPress={handleLogout} danger />
        </MenuSection>

        <View style={styles.footer}>
          <Text variant="captionMedium" color="textMuted" align="center">
            App Version {settings?.appVersions?.android || '1.0.0'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing[4],
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: colors.orange[1],
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orange[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  referralButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
  },
  menuSection: {
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  menuSectionTitle: {
    marginBottom: spacing[2],
    marginLeft: spacing[2],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: colors.red[1],
  },
  menuLabel: {
    flex: 1,
    marginLeft: spacing[3],
  },
  menuBadge: {
    backgroundColor: semantic.primary,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
  },
  footer: {
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
});
