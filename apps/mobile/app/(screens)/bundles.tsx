import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Badge } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useListingsStore } from '../../src/store';
import { Bundle } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing[4] * 3) / 2;

function BundleCard({ bundle, onPress }: { bundle: Bundle; onPress: () => void }) {
  const discount = bundle.discountPercentage;

  return (
    <Card style={styles.bundleCard} onPress={onPress} variant="elevated" shadow="sm">
      {bundle.image && (
        <Image source={{ uri: bundle.image }} style={styles.bundleImage} contentFit="cover" />
      )}
      <View style={styles.bundleContent}>
        {discount && (
          <Badge variant="success" size="sm">
            {discount}% OFF
          </Badge>
        )}
        <Text variant="bodySmall" color="textPrimary" weight="600" numberOfLines={2} style={styles.bundleTitle}>
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
        <View style={styles.itemsCount}>
          <Ionicons name="list-outline" size={14} color={semantic.textMuted} />
          <Text variant="captionMedium" color="textMuted">
            {bundle.items.length} services included
          </Text>
        </View>
      </View>
    </Card>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="layers-outline" size={48} color={semantic.textMuted} />
      </View>
      <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
        No bundles available
      </Text>
      <Text variant="bodySmall" color="textMuted" align="center">
        Check back later for exciting bundle offers
      </Text>
    </View>
  );
}

export default function BundlesScreen() {
  const { bundles } = useListingsStore();

  const handleBundlePress = (bundle: Bundle) => {
    router.push({
      pathname: '/(screens)/bundle/[id]',
      params: { id: bundle.id },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={bundles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BundleCard bundle={item} onPress={() => handleBundlePress(item)} />
        )}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.backgroundSecondary,
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  bundleCard: {
    width: CARD_WIDTH,
    padding: 0,
  },
  bundleImage: {
    width: '100%',
    height: 100,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  bundleContent: {
    padding: spacing[3],
  },
  bundleTitle: {
    marginTop: spacing[2],
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
  itemsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: semantic.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  emptyTitle: {
    marginBottom: spacing[2],
  },
});
