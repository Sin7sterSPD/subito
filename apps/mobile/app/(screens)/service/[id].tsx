import React, { useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams, Stack } from "expo-router"
import { Image } from "expo-image"
import { Typography, Card, Button, Chip, Spinner, Separator } from "heroui-native"
import { colors, semantic } from "../../../src/theme/colors"
import { spacing, borderRadius } from "../../../src/theme/spacing"
import { useListingsStore, useCartStore } from "../../../src/store"
import { Catalog, Listing } from "../../../src/types/api"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

function CatalogItem({
  catalog,
  onAdd,
  isAdding,
}: {
  catalog: Catalog
  onAdd: (catalog: Catalog, quantity: number) => void
  isAdding: boolean
}) {
  const [quantity, setQuantity] = useState(catalog.minQuantity || 1)

  return (
    <Card style={styles.catalogItem} variant="default">
      <View style={styles.catalogContent}>
        <View style={styles.catalogInfo}>
          <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
            {catalog.name}
          </Typography>
          {catalog.description && (
            <Typography
              type="body-sm"
              style={[styles.catalogDesc, { color: semantic.textMuted }]}
            >
              {catalog.description}
            </Typography>
          )}
          <View style={styles.catalogPricing}>
            <Typography type="body" weight="bold" className="text-accent">
              ₹{catalog.discountedPrice || catalog.price}
            </Typography>
            {catalog.discountedPrice && (
              <Typography
                type="body"
                style={[styles.originalPrice, { color: semantic.textMuted }]}
              >
                ₹{catalog.price}
              </Typography>
            )}
            {catalog.unit && (
              <Typography type="body-sm" style={{ color: semantic.textMuted }}>
                / {catalog.displayUnit || catalog.unit}
              </Typography>
            )}
          </View>
        </View>

        <View style={styles.catalogActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setQuantity((q) =>
                  Math.max(
                    catalog.minQuantity || 1,
                    q - (catalog.stepQuantity || 1)
                  )
                )
              }
              disabled={quantity <= (catalog.minQuantity || 1)}
            >
              <Ionicons
                name="remove"
                size={16}
                color={
                  quantity <= (catalog.minQuantity || 1)
                    ? semantic.textMuted
                    : semantic.primary
                }
              />
            </TouchableOpacity>
            <Typography type="body-sm" weight="semibold" style={styles.quantityText}>
              {quantity}
            </Typography>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                setQuantity((q) =>
                  Math.min(
                    catalog.maxQuantity || 99,
                    q + (catalog.stepQuantity || 1)
                  )
                )
              }
              disabled={quantity >= (catalog.maxQuantity || 99)}
            >
              <Ionicons
                name="add"
                size={16}
                color={
                  quantity >= (catalog.maxQuantity || 99)
                    ? semantic.textMuted
                    : semantic.primary
                }
              />
            </TouchableOpacity>
          </View>
          <Button
            variant="primary"
            onPress={() => onAdd(catalog, quantity)}
            isDisabled={isAdding}
          >
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </View>
      </View>
    </Card>
  )
}

function AddOnItem({
  addOn,
  onAdd,
}: {
  addOn: { id: string; name: string; price: string; description?: string }
  onAdd: () => void
}) {
  return (
    <TouchableOpacity style={styles.addOnItem} onPress={onAdd}>
      <View style={styles.addOnInfo}>
        <Typography type="body-sm" weight="medium" style={{ color: semantic.textPrimary }}>
          {addOn.name}
        </Typography>
        <Typography type="body-sm" weight="semibold" className="text-accent">
          +₹{addOn.price}
        </Typography>
      </View>
      <Ionicons name="add-circle" size={24} color={semantic.primary} />
    </TouchableOpacity>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setIsOpen(!isOpen)}>
      <View style={styles.faqHeader}>
        <Typography
          type="body-sm"
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
          type="body-sm"
          style={[styles.faqAnswer, { color: semantic.textSecondary }]}
        >
          {answer}
        </Typography>
      )}
    </TouchableOpacity>
  )
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { selectedListing, fetchServiceById, isLoading } = useListingsStore()
  const { addItem, isLoading: isCartLoading, cart } = useCartStore()
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchServiceById(id)
    }
  }, [id, fetchServiceById])

  const handleAddToCart = async (catalog: Catalog, quantity: number) => {
    setAddingCatalogId(catalog.id)
    await addItem(catalog.id, quantity)
    setAddingCatalogId(null)
  }

  const handleViewCart = () => {
    router.push("/(tabs)/cart")
  }

  if (isLoading) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }
  if (!selectedListing || selectedListing.id !== id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }} edges={["bottom"]}>
        <View style={styles.content}>
          <Typography type="h6" style={{ color: semantic.textSecondary }}>
            Service not found
          </Typography>
        </View>
      </SafeAreaView>
    )
  }

  const listing = selectedListing
  const hasItemsInCart = (cart?.items?.length || 0) > 0

  const resolveImage = (img: string) => {
    if (!img) return require("../../../assets/home/main/vaccum-floor.jpg")
    
    const serviceImages: Record<string, number> = {
      "floor.png": require("../../../assets/home/main/floor-cleaning.jpg"),
      "bathroom.png": require("../../../assets/home/main/vaccum-floor.jpg"),
      "cupboard-cleaning.png": require("../../../assets/home/preview/cupboard-cleaning.png"),
      "utensils.png": require("../../../assets/home/main/cook-preview.jpg"),
      "roomclieaning.png": require("../../../assets/home/main/vaccum-floor.jpg"),
      "plumbing.jpg": require("../../../assets/home/main/plumbing.jpg"),
      "toilet-clean.jpg": require("../../../assets/home/main/vaccum-floor.jpg"),
      "ac-repair.jpg": require("../../../assets/home/main/ac-repair.jpg"),
      "painting.jpg": require("../../../assets/home/main/painting.jpg"),
      "bundle-clean.png": require("../../../assets/home/main/bundle-clean.png"),
      "bundle-cook.png": require("../../../assets/home/main/bundle-cook.png"),
    }
    
    const filename = img.substring(img.lastIndexOf("/") + 1)
    if (serviceImages[filename]) return serviceImages[filename]
    if (serviceImages[img]) return serviceImages[img]
    if (img.startsWith("http")) return { uri: img }
    
    const lowercaseImg = img.toLowerCase()
    if (lowercaseImg.includes("floor")) return require("../../../assets/home/main/floor-cleaning.jpg")
    if (lowercaseImg.includes("bathroom") || lowercaseImg.includes("toilet")) return require("../../../assets/home/main/vaccum-floor.jpg")
    if (lowercaseImg.includes("cupboard")) return require("../../../assets/home/preview/cupboard-cleaning.png")
    if (lowercaseImg.includes("utensils") || lowercaseImg.includes("cook")) return require("../../../assets/home/main/cook-preview.jpg")
    if (lowercaseImg.includes("plumbing")) return require("../../../assets/home/main/plumbing.jpg")
    if (lowercaseImg.includes("ac") || lowercaseImg.includes("repair") || lowercaseImg.includes("appliance")) return require("../../../assets/home/main/ac-repair.jpg")
    if (lowercaseImg.includes("paint")) return require("../../../assets/home/main/painting.jpg")
    
    return require("../../../assets/home/main/vaccum-floor.jpg")
  }

  return (
    <>
      <Stack.Screen options={{ title: listing.name }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: semantic.background }} edges={["bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {listing.images && listing.images.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
            >
              {listing.images.map((img, idx) => (
                <Image
                  key={idx}
                  source={img.startsWith("http") ? { uri: img } : resolveImage(img)}
                  style={styles.headerImage}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.content}>
            <View style={styles.titleSection}>
              <Typography
                type="h4"
                weight="bold"
                style={{ color: semantic.textPrimary }}
              >
                {listing.name}
              </Typography>
              {listing.duration && (
                <View style={styles.duration}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={semantic.textMuted}
                  />
                  <Typography type="body" style={{ color: semantic.textMuted }}>
                    {listing.duration} min
                  </Typography>
                </View>
              )}
            </View>

            {listing.shortDescription && (
              <Typography
                type="body-sm"
                style={[styles.description, { color: semantic.textSecondary }]}
              >
                {listing.shortDescription}
              </Typography>
            )}

            {listing.tags && listing.tags.length > 0 && (
              <View style={styles.tags}>
                {listing.tags.map((tag, idx) => (
                  <Chip key={idx} variant="soft" color="default">
                    {tag}
                  </Chip>
                ))}
              </View>
            )}

            {listing.highlights && listing.highlights.length > 0 && (
              <View style={styles.section}>
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  Highlights
                </Typography>
                {listing.highlights.map((highlight, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={semantic.success}
                    />
                    <Typography
                      type="body-sm"
                      style={[styles.highlightText, { color: semantic.textSecondary }]}
                    >
                      {highlight}
                    </Typography>
                  </View>
                ))}
              </View>
            )}

            {listing.catalogs && listing.catalogs.length > 0 && (
              <View style={styles.section}>
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  Select Service
                </Typography>
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
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  Add-ons
                </Typography>
                <Card variant="default" style={{ padding: 0 }}>
                  {listing.addOns.map((addOn, idx) => (
                    <React.Fragment key={addOn.id}>
                      <AddOnItem
                        addOn={addOn}
                        onAdd={() => handleAddToCart(addOn as Catalog, 1)}
                      />
                      {idx < listing.addOns!.length - 1 && (
                        <Separator />
                      )}
                    </React.Fragment>
                  ))}
                </Card>
              </View>
            )}

            {listing.howItWorks && listing.howItWorks.length > 0 && (
              <View style={styles.section}>
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  How It Works
                </Typography>
                {listing.howItWorks.map((step, idx) => (
                  <View key={idx} style={styles.stepItem}>
                    <View style={styles.stepNumber}>
                      <Typography
                        type="body"
                        weight="bold"
                        style={{ color: colors.white }}
                      >
                        {idx + 1}
                      </Typography>
                    </View>
                    <Typography
                      type="body-sm"
                      style={[styles.stepText, { color: semantic.textSecondary }]}
                    >
                      {step}
                    </Typography>
                  </View>
                ))}
              </View>
            )}

            {listing.faqs && listing.faqs.length > 0 && (
              <View style={styles.section}>
                <Typography
                  type="body"
                  weight="semibold"
                  style={[styles.sectionTitle, { color: semantic.textPrimary }]}
                >
                  FAQs
                </Typography>
                <Card variant="default" style={{ padding: 0 }}>
                  {listing.faqs.map((faq, idx) => (
                    <React.Fragment key={idx}>
                      <FAQItem question={faq.question} answer={faq.answer} />
                      {idx < listing.faqs!.length - 1 && (
                        <Separator />
                      )}
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
              <Typography type="body" style={{ color: semantic.textMuted }}>
                {cart?.items?.length} items in cart
              </Typography>
              <Typography type="h5" weight="bold" className="text-accent">
                ₹{cart?.finalTotalAmount}
              </Typography>
            </View>
            <Button onPress={handleViewCart}>
              View Cart
            </Button>
          </View>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  description: {
    marginBottom: spacing[3],
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    flexDirection: "row",
  },
  catalogInfo: {
    flex: 1,
  },
  catalogDesc: {
    marginTop: spacing[1],
  },
  catalogPricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[2],
  },
  originalPrice: {
    textDecorationLine: "line-through",
  },
  catalogActions: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
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
    textAlign: "center",
  },
  addOnItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
  },
  addOnInfo: {
    flex: 1,
  },
  highlightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing[2],
  },
  highlightText: {
    flex: 1,
    marginLeft: spacing[2],
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing[3],
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: semantic.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  faqItem: {
    padding: spacing[3],
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
    backgroundColor: semantic.background,
  },
  footerInfo: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing[4],
  },
})
