import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Button, Badge, Spinner, BottomSheet, Divider } from '../../../src/components/ui';
import { colors, semantic } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { useListingsStore, useCartStore } from '../../../src/store';
import { Catalog, Listing } from '../../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

function CatalogItem({
  catalog,
  onAdd,
  isAdding,
}: {
  catalog: Catalog;
  onAdd: (catalog: Catalog, quantity: number) => void;
  isAdding: boolean;
}) {
  const [quantity, setQuantity] = useState(catalog.minQuantity || 1);

  return (
    <Card style={styles.catalogItem} variant="outlined">
      <View style={styles.catalogContent}>
        <View style={styles.catalogInfo}>
          <Text variant="bodyMedium" color="textPrimary" weight="600">
            {catalog.name}
          </Text>
          {catalog.description && (
            <Text variant="captionMedium" color="textMuted" style={styles.catalogDesc}>
              {catalog.description}
            </Text>
          )}
          <View style={styles.catalogPricing}>
            <Text variant="bodyMedium" color="primary" weight="700">
              ₹{catalog.discountedPrice || catalog.price}
            </Text>
            {catalog.discountedPrice && (
              <Text variant="captionLarge" color="textMuted" style={styles.originalPrice}>
                ₹{catalog.price}
              </Text>
            )}
            {catalog.unit && (
              <Text variant="captionMedium" color="textMuted">
                / {catalog.displayUnit || catalog.unit}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.catalogActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity((q) => Math.max(catalog.minQuantity || 1, q - (catalog.stepQuantity || 1)))}
              disabled={quantity <= (catalog.minQuantity || 1)}
            >
              <Ionicons
                name="remove"
                size={16}
                color={quantity <= (catalog.minQuantity || 1) ? semantic.textMuted : semantic.primary}
              />
            </TouchableOpacity>
            <Text variant="bodySmall" weight="600" style={styles.quantityText}>
              {quantity}
            </Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity((q) => Math.min(catalog.maxQuantity || 99, q + (catalog.stepQuantity || 1)))}
              disabled={quantity >= (catalog.maxQuantity || 99)}
            >
              <Ionicons
                name="add"
                size={16}
                color={quantity >= (catalog.maxQuantity || 99) ? semantic.textMuted : semantic.primary}
              />
            </TouchableOpacity>
          </View>
          <Button
            variant="primary"
            size="sm"
            onPress={() => onAdd(catalog, quantity)}
            isLoading={isAdding}
          >
            Add
          </Button>
        </View>
      </View>
    </Card>
  );
}

function AddOnItem({
  addOn,
  onAdd,
}: {
  addOn: { id: string; name: string; price: string; description?: string };
  onAdd: () => void;
}) {
  return (
    <TouchableOpacity style={styles.addOnItem} onPress={onAdd}>
      <View style={styles.addOnInfo}>
        <Text variant="bodySmall" color="textPrimary" weight="500">
          {addOn.name}
        </Text>
        <Text variant="captionLarge" color="primary" weight="600">
          +₹{addOn.price}
        </Text>
      </View>
      <Ionicons name="add-circle" size={24} color={semantic.primary} />
    </TouchableOpacity>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

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

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedListing, fetchServiceById, isLoading } = useListingsStore();
  const { addItem, isLoading: isCartLoading, cart } = useCartStore();
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchServiceById(id);
    }
  }, [id, fetchServiceById]);

  const handleAddToCart = async (catalog: Catalog, quantity: number) => {
    setAddingCatalogId(catalog.id);
    await addItem(catalog.id, quantity);
    setAddingCatalogId(null);
  };

  const handleViewCart = () => {
    router.push('/(tabs)/cart');
  };

  if (isLoading || !selectedListing) {
    return <Spinner fullScreen message="Loading service..." />;
  }

  const listing = selectedListing;
  const hasItemsInCart = (cart?.items?.length || 0) > 0;

  return (
    <>
      <Stack.Screen options={{ title: listing.name }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {listing.images && listing.images.length > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {listing.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img }}
                  style={styles.headerImage}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.content}>
            <View style={styles.titleSection}>
              <Text variant="h4" color="textPrimary" weight="700">
                {listing.name}
              </Text>
              {listing.duration && (
                <View style={styles.duration}>
                  <Ionicons name="time-outline" size={16} color={semantic.textMuted} />
                  <Text variant="captionLarge" color="textMuted">
                    {listing.duration} min
                  </Text>
                </View>
              )}
            </View>

            {listing.shortDescription && (
              <Text variant="bodySmall" color="textSecondary" style={styles.description}>
                {listing.shortDescription}
              </Text>
            )}

            {listing.tags && listing.tags.length > 0 && (
              <View style={styles.tags}>
                {listing.tags.map((tag, idx) => (
                  <Badge key={idx} variant="neutral" size="sm">
                    {tag}
                  </Badge>
                ))}
              </View>
            )}

            {listing.highlights && listing.highlights.length > 0 && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  Highlights
                </Text>
                {listing.highlights.map((highlight, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <Ionicons name="checkmark-circle" size={18} color={semantic.success} />
                    <Text variant="bodySmall" color="textSecondary" style={styles.highlightText}>
                      {highlight}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {listing.catalogs && listing.catalogs.length > 0 && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  Select Service
                </Text>
                {listing.catalogs.map((catalog) => (
                  <CatalogItem
                    key={catalog.id}
                    catalog={catalog}
                    onAdd={handleAddToCart}
                    isAdding={addingCatalogId === catalog.id}
                  />
                ))}
              </View>
            )}

            {listing.addOns && listing.addOns.length > 0 && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  Add-ons
                </Text>
                <Card variant="outlined" padding={0}>
                  {listing.addOns.map((addOn, idx) => (
                    <React.Fragment key={addOn.id}>
                      <AddOnItem addOn={addOn} onAdd={() => handleAddToCart(addOn as Catalog, 1)} />
                      {idx < listing.addOns!.length - 1 && <Divider marginVertical={0} />}
                    </React.Fragment>
                  ))}
                </Card>
              </View>
            )}

            {listing.howItWorks && listing.howItWorks.length > 0 && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  How It Works
                </Text>
                {listing.howItWorks.map((step, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Text variant="captionLarge" color={colors.white} weight="700">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text variant="bodySmall" color="textSecondary" style={styles.stepText}>
                      {step}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {listing.faqs && listing.faqs.length > 0 && (
              <View style={styles.section}>
                <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
                  FAQs
                </Text>
                <Card variant="outlined" padding={0}>
                  {listing.faqs.map((faq, idx) => (
                    <React.Fragment key={idx}>
                      <FAQItem question={faq.question} answer={faq.answer} />
                      {idx < listing.faqs!.length - 1 && <Divider marginVertical={0} />}
                    </React.Fragment>
                  ))}
                </Card>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </View>
        </ScrollView>

        {hasItemsInCart && (
          <View style={styles.footer}>
            <View style={styles.footerInfo}>
              <Text variant="captionMedium" color="textMuted">
                {cart?.items?.length} items in cart
              </Text>
              <Text variant="h6" color="primary" weight="700">
                ₹{cart?.finalTotalAmount}
              </Text>
            </View>
            <Button variant="primary" size="lg" onPress={handleViewCart}>
              View Cart
            </Button>
          </View>
        )}
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
    width,
    height: 220,
  },
  content: {
    padding: spacing[4],
  },
  titleSection: {
    marginBottom: spacing[2],
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  description: {
    marginBottom: spacing[3],
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  section: {
    marginTop: spacing[6],
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  catalogItem: {
    marginBottom: spacing[3],
  },
  catalogContent: {
    flexDirection: 'row',
  },
  catalogInfo: {
    flex: 1,
  },
  catalogDesc: {
    marginTop: spacing[1],
  },
  catalogPricing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  originalPrice: {
    textDecorationLine: 'line-through',
  },
  catalogActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.backgroundSecondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing[2],
  },
  quantityButton: {
    padding: spacing[2],
  },
  quantityText: {
    paddingHorizontal: spacing[2],
    minWidth: 24,
    textAlign: 'center',
  },
  addOnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
  },
  addOnInfo: {
    flex: 1,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  highlightText: {
    flex: 1,
    marginLeft: spacing[2],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  faqItem: {
    padding: spacing[3],
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: colors.white,
  },
  footerInfo: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
});
