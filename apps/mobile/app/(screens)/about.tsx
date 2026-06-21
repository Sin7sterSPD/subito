import React from "react"
import { View, StyleSheet, ScrollView, Linking } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Image } from "expo-image"
import { Typography, Card, Separator } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useAppStore } from "../../src/store"

export default function AboutScreen() {
  const { settings } = useAppStore()
  const version = settings?.appVersions?.android || "1.0.0"

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Image
            source={require("../../assets/home/HomeBanner.png")}
            style={styles.logo}
            contentFit="cover"
          />
          <Typography type="h3" weight="bold" style={{ color: semantic.textPrimary }}>
            Subito
          </Typography>
          <Typography type="body-sm" color="muted">
            Version {version}
          </Typography>
        </View>

        <View style={styles.content}>
          <Typography
            type="body"
            color="muted"
            align="center"
            style={styles.description}
          >
            Professional home services at your doorstep. We connect you with
            skilled partners for cleaning, maintenance, and more.
          </Typography>

          <Card style={styles.statsCard} variant="secondary">
            <View style={styles.stat}>
              <Typography type="h4" weight="bold" className="text-accent">
                50K+
              </Typography>
              <Typography type="body" color="muted">
                Happy Customers
              </Typography>
            </View>
            <Separator orientation="vertical" style={{ marginHorizontal: spacing[4] }} />
            <View style={styles.stat}>
              <Typography type="h4" weight="bold" className="text-accent">
                1000+
              </Typography>
              <Typography type="body" color="muted">
                Service Partners
              </Typography>
            </View>
            <Separator orientation="vertical" style={{ marginHorizontal: spacing[4] }} />
            <View style={styles.stat}>
              <Typography type="h4" weight="bold" className="text-accent">
                10+
              </Typography>
              <Typography type="body" color="muted">
                Cities
              </Typography>
            </View>
          </Card>

          <View style={styles.section}>
            <Typography
              type="h6"
              weight="semibold"
              style={[styles.sectionTitle, { color: semantic.textPrimary }]}
            >
              Our Services
            </Typography>
            <View style={styles.services}>
              {[
                "Home Cleaning",
                "Deep Cleaning",
                "Kitchen Cleaning",
                "Bathroom Cleaning",
                "Laundry & Ironing",
                "Dish Washing",
                "Party Cleanup",
                "Office Cleaning",
              ].map((service, idx) => (
                <View key={idx} style={styles.serviceTag}>
                  <Typography type="body" className="text-accent">
                    {service}
                  </Typography>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Typography
              type="h6"
              weight="semibold"
              style={[styles.sectionTitle, { color: semantic.textPrimary }]}
            >
              Connect With Us
            </Typography>
            <View style={styles.socialLinks}>
              {[
                { name: "Facebook", url: "https://facebook.com/subito" },
                { name: "Instagram", url: "https://instagram.com/subito" },
                { name: "Twitter", url: "https://twitter.com/subito" },
                {
                  name: "LinkedIn",
                  url: "https://linkedin.com/company/subito",
                },
              ].map((social, idx) => (
                <Typography
                  key={idx}
                  type="body-sm"
                  weight="medium"
                  style={[styles.socialLink, { color: semantic.primary }]}
                  onPress={() => Linking.openURL(social.url)}
                >
                  {social.name}
                </Typography>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <Typography type="body" color="muted" align="center">
              Made with ❤️ in India
            </Typography>
            <Typography
              type="body"
              color="muted"
              align="center"
              style={styles.copyright}
            >
              © {new Date().getFullYear()} Subito. All rights reserved.
            </Typography>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
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
    alignItems: "center",
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing[4],
    marginBottom: spacing[6],
  },
  stat: {
    alignItems: "center",
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  services: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  serviceTag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.blue[1],
    borderRadius: 100,
  },
  socialLinks: {
    flexDirection: "row",
    gap: spacing[6],
    justifyContent: "center",
  },
  socialLink: {
    textDecorationLine: "underline",
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
})
