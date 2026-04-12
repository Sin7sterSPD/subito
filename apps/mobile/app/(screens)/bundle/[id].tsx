import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Badge, Button, Divider } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useListingsStore, useCartStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

export default function BundleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundles } = useListingsStore();
  const { addItem, isLoading } = useCartStore();

  const bundle = bundles.find((b) => b.id === id);

  const handleAddToCart = async () => {
    if (!bundle) return;
    
    for (const item of bundle.items) {
      await addItem(item.catalogId, item.quantity, { bundleId: bundle.id });
    }
    router.push('/(tabs)/cart');
  };

  if (!bundle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text variant="h6" color="textSecondary">
            Bundle not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const savings = parseFloat(bundle.originalPrice) - parseFloat(bundle.bundlePrice);

  return (
    <>
      <Stack.Screen options={{ title: bundle.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {bundle.image && (
            <Image source={{ uri: bundle.image }} style={styles.headerImage} contentFit="cover" />
          )}

          <View style={styles.content}>
            <View style={styles.header}>
              {bundle.discountPercentage && (
                <Badge variant="success" size="md">
                  {bundle.discountPercentage}% OFF
                </Badge>
              )}
              <Text variant="h4" color="textPrimary" weight="700" style={styles.title}>
                {bundle.name}
              </Text>
              {bundle.description && (
                <Text variant="bodyMedium" color="textSecondary">
                  {bundle.description}
                </Text>
              )}
            </View>

            <Card style={styles.pricingCard} variant="filled">
              <View style={styles.pricingRow}>
                <Text variant="bodyMedium" color="textSecondary">
                  Bundle Price
                </Text>
                <View style={styles.priceValues}>
                  <Text variant="h5" color="primary" weight="700">
                    ₹{bundle.bundlePrice}
                  </Text>
                  <Text variant="bodySmall" color="textMuted" style={styles.strikethrough}>
                    ₹{bundle.originalPrice}
                  </Text>
                </View>
              </View>
              <View style={styles.savingsRow}>
                <Ionicons name="pricetag" size={16} color={semantic.success} />
                <Text variant="bodySmall" color="success" weight="600">
                  You save ₹{savings.toFixed(0)}
                </Text>
              </View>
            </Card>

            <View style={styles.section}>
              <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                Included Services ({bundle.items.length})
              </Text>
              <Card variant="outlined" padding={0}>
                {bundle.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text variant="bodySmall" color="textPrimary" weight="500">
                          {item.catalog?.name || 'Service'}
                        </Text>
                        {item.catalog?.description && (
                          <Text variant="captionMedium" color="textMuted" numberOfLines={1}>
                            {item.catalog.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.serviceQty}>
                        <Text variant="captionLarge" color="textMuted">
                          x{item.quantity}
                        </Text>
                      </View>
                    </View>
                    {idx < bundle.items.length - 1 && <Divider marginVertical={0} />}
                  </React.Fragment>
                ))}
              </Card>
            </View>

            <View style={styles.benefits}>
              <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                Why Choose This Bundle?
              </Text>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="wallet" size={18} color={semantic.success} />
                </View>
                <View style={styles.benefitText}>
                  <Text variant="bodySmall" color="textPrimary" weight="500">
                    Save ₹{savings.toFixed(0)}
                  </Text>
                  <Text variant="captionMedium" color="textMuted">
                    Compared to individual service prices
                  </Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="time" size={18} color={semantic.primary} />
                </View>
                <View style={styles.benefitText}>
                  <Text variant="bodySmall" color="textPrimary" weight="500">
                    Convenient Scheduling
                  </Text>
                  <Text variant="captionMedium" color="textMuted">
                    All services in one appointment
                  </Text>
                </View>
              </View>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Ionicons name="star" size={18} color={colors.orange[8]} />
                </View>
                <View style={styles.benefitText}>
                  <Text variant="bodySmall" color="textPrimary" weight="500">
                    Premium Quality
                  </Text>
                  <Text variant="captionMedium" color="textMuted">
                    Curated combination of services
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text variant="captionMedium" color="textMuted">
              Bundle Price
            </Text>
            <Text variant="h5" color="primary" weight="700">
              ₹{bundle.bundlePrice}
            </Text>
          </View>
          <Button
            variant="primary"
            size="lg"
            onPress={handleAddToCart}
            isLoading={isLoading}
            style={styles.addButton}
          >
            Add to Cart
          </Button>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  title: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  pricingCard: {
    marginBottom: spacing[6],
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  serviceInfo: {
    flex: 1,
  },
  serviceQty: {
    paddingLeft: spacing[3],
  },
  benefits: {
    marginBottom: spacing[4],
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: colors.white,
  },
  footerPrice: {
    marginRight: spacing[4],
  },
  addButton: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
