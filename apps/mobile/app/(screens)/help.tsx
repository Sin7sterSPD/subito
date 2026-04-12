import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Divider } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useAppStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

interface HelpItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function HelpItem({ icon, title, subtitle, onPress }: HelpItemProps) {
  return (
    <TouchableOpacity style={styles.helpItem} onPress={onPress}>
      <View style={styles.helpIcon}>
        <Ionicons name={icon} size={22} color={semantic.primary} />
      </View>
      <View style={styles.helpContent}>
        <Text variant="bodyMedium" color="textPrimary" weight="500">
          {title}
        </Text>
        <Text variant="captionMedium" color="textMuted">
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const { settings } = useAppStore();

  const handleCall = () => {
    const phone = settings?.supportNumber || '1800-123-4567';
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = () => {
    const email = settings?.supportEmail || 'support@subito.com';
    Linking.openURL(`mailto:${email}`);
  };

  const handleWhatsApp = () => {
    const phone = settings?.supportNumber || '918888888888';
    Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`);
  };

  const faqs = [
    {
      question: 'How do I book a service?',
      answer: 'Browse services on the home screen, add items to cart, select a time slot, and proceed to payment.',
    },
    {
      question: 'How can I cancel my booking?',
      answer: 'Go to My Bookings, select the booking, and tap Cancel. Cancellation policies may apply.',
    },
    {
      question: 'How do refunds work?',
      answer: 'Refunds are processed within 5-7 business days to your original payment method.',
    },
    {
      question: 'What if the partner doesn\'t show up?',
      answer: 'Contact support immediately. We\'ll arrange an alternative or process a full refund.',
    },
    {
      question: 'How do I reschedule?',
      answer: 'Go to your booking details and tap Reschedule to select a new time slot.',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Contact Us
          </Text>
          <Card variant="outlined" padding={0}>
            <HelpItem
              icon="call"
              title="Call Support"
              subtitle="Available 24/7"
              onPress={handleCall}
            />
            <Divider marginVertical={0} />
            <HelpItem
              icon="mail"
              title="Email Support"
              subtitle="Response within 24 hours"
              onPress={handleEmail}
            />
            <Divider marginVertical={0} />
            <HelpItem
              icon="logo-whatsapp"
              title="WhatsApp"
              subtitle="Quick chat support"
              onPress={handleWhatsApp}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Frequently Asked Questions
          </Text>
          <Card variant="outlined" padding={0}>
            {faqs.map((faq, idx) => (
              <React.Fragment key={idx}>
                <FAQItem question={faq.question} answer={faq.answer} />
                {idx < faqs.length - 1 && <Divider marginVertical={0} />}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Legal
          </Text>
          <Card variant="outlined" padding={0}>
            <HelpItem
              icon="document-text"
              title="Terms of Service"
              subtitle="Read our terms"
              onPress={() => Linking.openURL('https://subito.com/terms')}
            />
            <Divider marginVertical={0} />
            <HelpItem
              icon="shield-checkmark"
              title="Privacy Policy"
              subtitle="How we handle your data"
              onPress={() => Linking.openURL('https://subito.com/privacy')}
            />
            <Divider marginVertical={0} />
            <HelpItem
              icon="card"
              title="Refund Policy"
              subtitle="Cancellation and refunds"
              onPress={() => Linking.openURL('https://subito.com/refunds')}
            />
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setIsOpen(!isOpen)}>
      <View style={styles.faqHeader}>
        <Text variant="bodySmall" color="textPrimary" weight="500" style={styles.faqQuestion}>
          {question}
        </Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={semantic.textMuted}
        />
      </View>
      {isOpen && (
        <Text variant="captionLarge" color="textSecondary" style={styles.faqAnswer}>
          {answer}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.backgroundSecondary,
  },
  section: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  faqItem: {
    padding: spacing[4],
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
