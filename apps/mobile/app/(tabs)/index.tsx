import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Badge, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius, shadows } from '../../src/theme/spacing';
import { useAuthStore, useUserStore, useListingsStore, useLocationStore, useAppStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';
import { Category, Listing, Bundle } from '../../src/types/api';

const { width } = Dimensions.get('window');

const serviceImages: Record<string, number> = {
  'room cleaning': require('../../assets/images/room clieaning.png'),
  'toilet cleaning': require('../../assets/images/toilet cleaning.png'),
  'windows cleaning': require('../../assets/images/windows cleaning.png'),
  'clothes iron': require('../../assets/images/clothes iron.png'),
  'dish washer': require('../../assets/images/dish waher.png'),
  'after party cleaning': require('../../assets/images/After party cleaning.png'),
  default: require('../../assets/images/room clieaning.png'),
};

function getServiceImage(name: string) {
  const lowercaseName = name.toLowerCase();
  for (const key of Object.keys(serviceImages)) {
    if (lowercaseName.includes(key)) {
      return serviceImages[key];
    }
  }
  return serviceImages.default;
}

function AddressSelector() {
  const { selectedAddress } = useUserStore();

  return (
    <TouchableOpacity
      style={styles.addressSelector}
      onPress={() => router.push('/(screens)/addresses')}
    >
      <View style={styles.addressContent}>
        <Ionicons name="location" size={20} color={semantic.primary} />
        <View style={styles.addressText}>
          <Text variant="captionMedium" color="textMuted">
            Deliver to
          </Text>
          <View style={styles.addressRow}>
            <Text variant="bodySmall" color="textPrimary" weight="600" numberOfLines={1}>
              {selectedAddress?.name || 'Add Address'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={semantic.textSecondary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SearchBar() {
  return (
    <TouchableOpacity
      style={styles.searchBar}
      onPress={() => router.push('/(screens)/search')}
    >
      <Ionicons name="search" size={20} color={semantic.textMuted} />
      <Text variant="bodySmall" color="textMuted" style={styles.searchText}>
        Search for services...
      </Text>
    </TouchableOpacity>
  );
}

function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress}>
      <View style={styles.categoryIcon}>
        {category.image ? (
          <Image source={{ uri: category.image }} style={styles.categoryImage} contentFit="cover" />
        ) : (
          <Ionicons name="sparkles" size={24} color={semantic.primary} />
        )}
      </View>
      <Text variant="captionLarge" color="textPrimary" align="center" numberOfLines={2}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

function ServiceCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const imageSource = listing.image ? { uri: listing.image } : getServiceImage(listing.name);
  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice;

  return (
    <Card style={styles.serviceCard} onPress={onPress} variant="elevated" shadow="sm">
      <Image source={imageSource} style={styles.serviceImage} contentFit="cover" />
      <View style={styles.serviceContent}>
        <Text variant="bodySmall" color="textPrimary" weight="600" numberOfLines={2}>
          {listing.name}
        </Text>
        {listing.shortDescription && (
          <Text variant="captionMedium" color="textMuted" numberOfLines={1} style={styles.serviceDesc}>
            {listing.shortDescription}
          </Text>
        )}
        <View style={styles.serviceFooter}>
          {startingPrice && (
            <Text variant="bodySmall" color="primary" weight="700">
              ₹{startingPrice}
            </Text>
          )}
          {listing.duration && (
            <View style={styles.duration}>
              <Ionicons name="time-outline" size={12} color={semantic.textMuted} />
              <Text variant="captionMedium" color="textMuted">
                {listing.duration} min
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

function BundleCard({ bundle, onPress }: { bundle: Bundle; onPress: () => void }) {
  const discount = bundle.discountPercentage;
  
  return (
    <Card style={styles.bundleCard} onPress={onPress} variant="elevated" shadow="md">
      {bundle.image && (
        <Image source={{ uri: bundle.image }} style={styles.bundleImage} contentFit="cover" />
      )}
      <View style={styles.bundleContent}>
        {discount && (
          <Badge variant="success" size="sm">
            {discount}% OFF
          </Badge>
        )}
        <Text variant="bodyMedium" color="textPrimary" weight="700" style={styles.bundleTitle}>
          {bundle.name}
        </Text>
        {bundle.description && (
          <Text variant="captionMedium" color="textMuted" numberOfLines={2}>
            {bundle.description}
          </Text>
        )}
        <View style={styles.bundlePricing}>
          <Text variant="bodyMedium" color="primary" weight="700">
            ₹{bundle.bundlePrice}
          </Text>
          <Text variant="captionLarge" color="textMuted" style={styles.originalPrice}>
            ₹{bundle.originalPrice}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function PromoBanner() {
  const { bestCoupon } = useAppStore();
  
  if (!bestCoupon) return null;
  
  return (
    <Card style={styles.promoBanner} variant="filled">
      <View style={styles.promoContent}>
        <View style={styles.promoIcon}>
          <Ionicons name="gift" size={24} color={colors.white} />
        </View>
        <View style={styles.promoText}>
          <Text variant="bodySmall" color="textPrimary" weight="700">
            {bestCoupon.code}
          </Text>
          <Text variant="captionMedium" color="textSecondary">
            {bestCoupon.description || `Get ${bestCoupon.discountValue}% off`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { selectedAddress, fetchAddresses } = useUserStore();
  const { categories, bundles, fetchListings, isLoading } = useListingsStore();
  const { currentLocation, getCurrentLocation, checkServiceability } = useLocationStore();
  const { fetchBestCoupon } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    let lat = selectedAddress?.latitude || currentLocation?.latitude;
    let lng = selectedAddress?.longitude || currentLocation?.longitude;

    if (!lat || !lng) {
      const location = await getCurrentLocation();
      if (location) {
        lat = location.latitude;
        lng = location.longitude;
      }
    }

    await Promise.all([
      fetchListings(lat, lng),
      fetchAddresses(lat, lng),
      lat && lng ? checkServiceability(lat, lng) : null,
      lat && lng ? fetchBestCoupon(lat, lng) : null,
    ]);
  }, [selectedAddress, currentLocation, fetchListings, fetchAddresses, getCurrentLocation, checkServiceability, fetchBestCoupon]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: '/(screens)/category/[id]',
      params: { id: category.id, name: category.name },
    });
  };

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: '/(screens)/service/[id]',
      params: { id: listing.id },
    });
  };

  const handleBundlePress = (bundle: Bundle) => {
    router.push({
      pathname: '/(screens)/bundle/[id]',
      params: { id: bundle.id },
    });
  };

  if (isLoading && categories.length === 0) {
    return <Spinner fullScreen message="Loading services..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AddressSelector />
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/(screens)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[semantic.primary]} />
        }
      >
        <View style={styles.greeting}>
          <Text variant="h4" color="textPrimary" weight="700">
            Hello, {user?.firstName || 'there'} 👋
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={styles.greetingSubtitle}>
            What service do you need today?
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <SearchBar />
        </View>

        <PromoBanner />

        {categories.length > 0 && (
          <View style={styles.section}>
            <Text variant="h5" color="textPrimary" weight="700" style={styles.sectionTitle}>
              Categories
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {categories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onPress={() => handleCategoryPress(cat)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {bundles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="h5" color="textPrimary" weight="700">
                Popular Bundles
              </Text>
              <TouchableOpacity onPress={() => router.push('/(screens)/bundles')}>
                <Text variant="bodySmall" color="primary" weight="600">
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bundlesScroll}>
              {bundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  bundle={bundle}
                  onPress={() => handleBundlePress(bundle)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {categories.map((category) => (
          category.listings && category.listings.length > 0 && (
            <View key={category.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text variant="h5" color="textPrimary" weight="700">
                  {category.name}
                </Text>
                <TouchableOpacity onPress={() => handleCategoryPress(category)}>
                  <Text variant="bodySmall" color="primary" weight="600">
                    See All
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {category.listings.slice(0, 5).map((listing) => (
                  <ServiceCard
                    key={listing.id}
                    listing={listing}
                    onPress={() => handleServicePress(listing)}
                  />
                ))}
              </ScrollView>
            </View>
          )
        ))}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  addressSelector: {
    flex: 1,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: spacing[2],
  },
  scroll: {
    flex: 1,
  },
  greeting: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  greetingSubtitle: {
    marginTop: spacing[1],
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.backgroundSecondary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  searchText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  promoBanner: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: colors.blue[1],
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoText: {
    marginLeft: spacing[3],
    flex: 1,
  },
  section: {
    paddingVertical: spacing[3],
  },
  sectionTitle: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  categoriesScroll: {
    paddingLeft: spacing[4],
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    marginRight: spacing[3],
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  bundlesScroll: {
    paddingLeft: spacing[4],
  },
  bundleCard: {
    width: width * 0.75,
    marginRight: spacing[3],
  },
  bundleImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  bundleContent: {
    padding: spacing[3],
  },
  bundleTitle: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  bundlePricing: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  originalPrice: {
    marginLeft: spacing[2],
    textDecorationLine: 'line-through',
  },
  serviceCard: {
    width: 160,
    marginRight: spacing[3],
    marginLeft: spacing[4],
    marginBottom: spacing[1],
  },
  serviceImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  serviceContent: {
    padding: spacing[3],
  },
  serviceDesc: {
    marginTop: spacing[1],
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bottomPadding: {
    height: spacing[8],
  },
});
