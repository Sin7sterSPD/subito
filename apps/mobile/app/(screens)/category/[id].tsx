import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Badge, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useListingsStore } from '../../src/store';
import { Listing } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';

function ServiceCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const startingPrice = listing.catalogs?.[0]?.price || listing.basePrice;

  return (
    <Card style={styles.serviceCard} onPress={onPress} variant="outlined">
      <View style={styles.cardContent}>
        {listing.image ? (
          <Image source={{ uri: listing.image }} style={styles.serviceImage} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="sparkles" size={24} color={semantic.textMuted} />
          </View>
        )}
        <View style={styles.serviceInfo}>
          <Text variant="bodyMedium" color="textPrimary" weight="600" numberOfLines={2}>
            {listing.name}
          </Text>
          {listing.shortDescription && (
            <Text variant="captionMedium" color="textMuted" numberOfLines={2} style={styles.serviceDesc}>
              {listing.shortDescription}
            </Text>
          )}
          <View style={styles.serviceFooter}>
            {startingPrice && (
              <Text variant="bodyMedium" color="primary" weight="700">
                From ₹{startingPrice}
              </Text>
            )}
            {listing.duration && (
              <View style={styles.duration}>
                <Ionicons name="time-outline" size={14} color={semantic.textMuted} />
                <Text variant="captionMedium" color="textMuted">
                  {listing.duration} min
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
      </View>
    </Card>
  );
}

export default function CategoryScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { categories, isLoading } = useListingsStore();

  const category = categories.find((c) => c.id === id);
  const listings = category?.listings || [];

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: '/(screens)/service/[id]',
      params: { id: listing.id },
    });
  };

  if (isLoading) {
    return <Spinner fullScreen message="Loading..." />;
  }

  return (
    <>
      <Stack.Screen options={{ title: name || 'Category' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {category?.description && (
          <View style={styles.header}>
            <Text variant="bodySmall" color="textSecondary">
              {category.description}
            </Text>
          </View>
        )}

        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard listing={item} onPress={() => handleServicePress(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="sparkles-outline" size={48} color={semantic.textMuted} />
              <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
                No services found
              </Text>
              <Text variant="bodySmall" color="textMuted" align="center">
                Check back later for new services
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: semantic.backgroundSecondary,
  },
  header: {
    padding: spacing[4],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  list: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  serviceCard: {
    marginBottom: spacing[3],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  serviceDesc: {
    marginTop: spacing[1],
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
  emptyTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
});
