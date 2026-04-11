"use client"

import { Ionicons } from "@expo/vector-icons"
import { Accordion, useThemeColor } from "heroui-native"
import { ScrollView, Text, View } from "react-native"

type FAQItem = {
  id: string
  question: string
  answer: string
  icon: keyof typeof Ionicons.glyphMap
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "1",
    question: "How do I create an account?",
    answer:
      "You can create an account by signing up with your email or using Google authentication. Once registered, verify your email to activate your account.",
    icon: "person-outline",
  },
  {
    id: "2",
    question: "What payment methods are supported?",
    answer:
      "We support UPI, credit/debit cards, net banking, and popular wallets. All transactions are securely processed.",
    icon: "card-outline",
  },
  {
    id: "3",
    question: "Can I track my order?",
    answer:
      "Yes, once your order is shipped, you will receive a tracking link via SMS and email to monitor delivery status in real-time.",
    icon: "cube-outline",
  },
  {
    id: "4",
    question: "How do I contact support?",
    answer:
      "You can contact our support team via live chat in the app or email us at support@example.com. We’re available 24/7.",
    icon: "help-circle-outline",
  },
]

export default function FAQAccordionScreen() {
  const muted = useThemeColor("muted")
  const foreground = useThemeColor("foreground")

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 12,
      }}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 24,
          fontWeight: "600",
          marginBottom: 8,
          color: foreground,
        }}
      >
        Frequently Asked Questions
      </Text>

      {/* Accordion */}
      <Accordion
        selectionMode="single"
        variant="surface"
        defaultValue="1"
        className="rounded-xl"
        classNames={{
          container: "bg-surface",
          separator: "bg-border/40",
        }}
      >
        {FAQ_DATA.map((item) => (
          <Accordion.Item key={item.id} value={item.id}>
            {/* Trigger */}
            <Accordion.Trigger>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  flex: 1,
                }}
              >
                <Ionicons name={item.icon} size={18} color={muted} />

                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "500",
                    color: foreground,
                  }}
                >
                  {item.question}
                </Text>
              </View>

              {/* Chevron */}
              <Accordion.Indicator />
            </Accordion.Trigger>

            {/* Content */}
            <Accordion.Content>
              <Text
                style={{
                  paddingHorizontal: 30,
                  paddingTop: 4,
                  paddingBottom: 12,
                  fontSize: 14,
                  lineHeight: 20,
                  color: muted,
                }}
              >
                {item.answer}
              </Text>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </ScrollView>
  )
}
