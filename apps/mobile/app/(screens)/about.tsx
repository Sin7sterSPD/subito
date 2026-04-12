import React from 'react';
import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Text, Card, Divider } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { useAppStore } from '../../src/store';

export default function AboutScreen() {
  const { settings } = useAppStore();
  const version = settings?.appVersions?.android || '1.0.0';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/HomeBanner.png')}
            style={styles.logo}
            contentFit="cover"
          />
          <Text variant="h3" color="textPrimary" weight="700">
            Subito
          </Text>
          <Text variant="bodySmall" color="textMuted">
            Version {version}
          </Text>
        </View>

        <View style={styles.content}>
          <Text variant="bodyMedium" color="textSecondary" align="center" style={styles.description}>
            Professional home services at your doorstep. We connect you with skilled partners
            for cleaning, maintenance, and more.
          </Text>

          <Card style={styles.statsCard} variant="filled">
            <View style={styles.stat}>
              <Text variant="h4" color="primary" weight="700">
                50K+
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Happy Customers
              </Text>
            </View>
            <Divider orientation="vertical" marginHorizontal={spacing[4]} />
            <View style={styles.stat}>
              <Text variant="h4" color="primary" weight="700">
                1000+
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Service Partners
              </Text>
            </View>
            <Divider orientation="vertical" marginHorizontal={spacing[4]} />
            <View style={styles.stat}>
              <Text variant="h4" color="primary" weight="700">
                10+
              </Text>
              <Text variant="captionMedium" color="textMuted">
                Cities
              </Text>
            </View>
          </Card>

          <View style={styles.section}>
            <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
              Our Services
            </Text>
            <View style={styles.services}>
              {[
                'Home Cleaning',
                'Deep Cleaning',
                'Kitchen Cleaning',
                'Bathroom Cleaning',
                'Laundry & Ironing',
                'Dish Washing',
                'Party Cleanup',
                'Office Cleaning',
              ].map((service, idx) => (
                <View key={idx} style={styles.serviceTag}>
                  <Text variant="captionLarge" color="primary">
                    {service}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
              Connect With Us
            </Text>
            <View style={styles.socialLinks}>
              {[
                { name: 'Facebook', url: 'https://facebook.com/subito' },
                { name: 'Instagram', url: 'https://instagram.com/subito' },
                { name: 'Twitter', url: 'https://twitter.com/subito' },
                { name: 'LinkedIn', url: 'https://linkedin.com/company/subito' },
              ].map((social, idx) => (
                <Text
                  key={idx}
                  variant="bodySmall"
                  color="primary"
                  weight="500"
                  style={styles.socialLink}
                  onPress={() => Linking.openURL(social.url)}
                >
                  {social.name}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Text variant="captionMedium" color="textMuted" align="center">
              Made with ❤️ in India
            </Text>
            <Text variant="captionMedium" color="textMuted" align="center" style={styles.copyright}>
              © {new Date().getFullYear()} Subito. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    backgroundColor: colors.blue[1],
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: spacing[4],
  },
  content: {
    padding: spacing[4],
  },
  description: {
    marginBottom: spacing[6],
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[4],
    marginBottom: spacing[6],
  },
  stat: {
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  serviceTag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.blue[1],
    borderRadius: 100,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: spacing[6],
    justifyContent: 'center',
  },
  socialLink: {
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: spacing[4],
    paddingTop: spacing[6],
    borderTopWidth: 1,
    borderTopColor: semantic.borderLight,
  },
  copyright: {
    marginTop: spacing[1],
  },
});
