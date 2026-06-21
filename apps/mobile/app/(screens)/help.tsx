import React from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Typography, Card, Separator } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing } from "../../src/theme/spacing"
import { useAppStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"

interface HelpItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  subtitle: string
  onPress: () => void
}

function HelpItem({ icon, title, subtitle, onPress }: HelpItemProps) {
  return (
    <TouchableOpacity style={styles.helpItem} onPress={onPress}>
      <View style={styles.helpIcon}>
        <Ionicons name={icon} size={22} color={semantic.primary} />
      </View>
      <View style={styles.helpContent}>
        <Typography type="body" weight="medium" style={{ color: semantic.textPrimary }}>
          {title}
        </Typography>
        <Typography type="body-sm" color="muted">
          {subtitle}
        </Typography>
      </View>
      <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
    </TouchableOpacity>
  )
}

const openExternalUrl = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url)

    if (!supported) {
      Alert.alert(
        "Unable to Open",
        "This action is not supported on your device."
      )
      return
    }

    await Linking.openURL(url)
  } catch {
    Alert.alert("Something went wrong", "Please try again later.")
  }
}

export default function HelpScreen() {
  const { settings } = useAppStore()

  const handleCall = () => {
    const phone = settings?.supportNumber || "1800-123-4567"
    openExternalUrl(`tel:${phone}`)
  }

  const handleEmail = () => {
    const email = settings?.supportEmail || "support@subito.com"
    openExternalUrl(`mailto:${email}`)
  }

  const handleWhatsApp = () => {
    const phone = settings?.supportNumber || "918888888888"
    openExternalUrl(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`)
  }

  const faqs = [
    {
      question: "How do I book a service?",
      answer:
        "Browse services on the home screen, add items to cart, select a time slot, and proceed to payment.",
    },
    {
      question: "How can I cancel my booking?",
      answer:
        "Go to My Bookings, select the booking, and tap Cancel. Cancellation policies may apply.",
    },
    {
      question: "How do refunds work?",
      answer:
        "Refunds are processed within 5-7 business days to your original payment method.",
    },
    {
      question: "What if the partner doesn't show up?",
      answer:
        "Contact support immediately. We'll arrange an alternative or process a full refund.",
    },
    {
      question: "How do I reschedule?",
      answer:
        "Go to your booking details and tap Reschedule to select a new time slot.",
    },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: semantic.backgroundSecondary }} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Typography
            type="h6"
            weight="semibold"
            style={[styles.sectionTitle, { color: semantic.textPrimary }]}
          >
            Contact Us
          </Typography>
          <Card variant="default" style={{ padding: 0, overflow: "hidden" }}>
            <HelpItem
              icon="call"
              title="Call Support"
              subtitle="Available 24/7"
              onPress={handleCall}
            />
            <Separator />
            <HelpItem
              icon="mail"
              title="Email Support"
              subtitle="Response within 24 hours"
              onPress={handleEmail}
            />
            <Separator />
            <HelpItem
              icon="logo-whatsapp"
              title="WhatsApp"
              subtitle="Quick chat support"
              onPress={handleWhatsApp}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Typography
            type="h6"
            weight="semibold"
            style={[styles.sectionTitle, { color: semantic.textPrimary }]}
          >
            Frequently Asked Questions
          </Typography>
          <Card variant="default" style={{ padding: 0, overflow: "hidden" }}>
            {faqs.map((faq, idx) => (
              <React.Fragment key={idx}>
                <FAQItem question={faq.question} answer={faq.answer} />
                {idx < faqs.length - 1 && <Separator />}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Typography
            type="h6"
            weight="semibold"
            style={[styles.sectionTitle, { color: semantic.textPrimary }]}
          >
            Legal
          </Typography>
          <Card variant="default" style={{ padding: 0, overflow: "hidden" }}>
            <HelpItem
              icon="document-text"
              title="Terms of Service"
              subtitle="Read our terms"
              onPress={() => openExternalUrl("https://subito.com/terms")}
            />
            <Separator />
            <HelpItem
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() => openExternalUrl("https://subito.com/privacy")}
            />
            <Separator />
            <HelpItem
              icon="card"
              title="Refund Policy"
              subtitle="Cancellation and refunds"
              onPress={() => openExternalUrl("https://subito.com/refunds")}
            />
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setIsOpen(!isOpen)}>
      <View style={styles.faqHeader}>
        <Typography
          type="body"
          weight="medium"
          style={[styles.faqQuestion, { color: semantic.textPrimary }]}
        >
          {question}
        </Typography>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={semantic.textMuted}
        />
      </View>
      {isOpen && (
        <Typography
          type="body"
          color="muted"
          style={styles.faqAnswer}
        >
          {answer}
        </Typography>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
  },
  helpContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  faqItem: {
    padding: spacing[4],
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
  },
  faqAnswer: {
    marginTop: spacing[2],
  },
  bottomPadding: {
    height: spacing[8],
  },
})
