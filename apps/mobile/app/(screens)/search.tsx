import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Text, Card, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useListingsStore } from '../../src/store';
import { Listing } from '../../src/types/api';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

export default function SearchScreen() {
  const { categories } = useListingsStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const allListings = categories.flatMap((cat) => cat.listings || []);

  const searchListings = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = searchQuery.toLowerCase();
    
    const filtered = allListings.filter(
      (listing) =>
        listing.name.toLowerCase().includes(lowerQuery) ||
        listing.shortDescription?.toLowerCase().includes(lowerQuery) ||
        listing.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
    
    setResults(filtered);
    setIsSearching(false);
  }, [allListings]);

  const debouncedSearch = useCallback(debounce(searchListings, 300), [searchListings]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    debouncedSearch(text);
  };

  const handleServicePress = (listing: Listing) => {
    router.push({
      pathname: '/(screens)/service/[id]',
      params: { id: listing.id },
    });
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  const popularServices = allListings.slice(0, 6);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={semantic.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            placeholderTextColor={semantic.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Ionicons name="close-circle" size={20} color={semantic.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching && <Spinner message="Searching..." />}

      {query.length === 0 ? (
        <View style={styles.content}>
          <Text variant="h6" color="textPrimary" weight="600" style={styles.sectionTitle}>
            Popular Services
          </Text>
          <View style={styles.popularGrid}>
            {popularServices.map((listing) => (
              <TouchableOpacity
                key={listing.id}
                style={styles.popularItem}
                onPress={() => handleServicePress(listing)}
              >
                {listing.image && (
                  <Image
                    source={{ uri: listing.image }}
                    style={styles.popularImage}
                    contentFit="cover"
                  />
                )}
                <Text variant="captionLarge" color="textPrimary" numberOfLines={2} align="center">
                  {listing.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : results.length === 0 && !isSearching ? (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={semantic.textMuted} />
          <Text variant="h6" color="textSecondary" style={styles.emptyTitle}>
            No results found
          </Text>
          <Text variant="bodySmall" color="textMuted" align="center">
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleServicePress(item)}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.resultImage} contentFit="cover" />
              ) : (
                <View style={styles.resultImagePlaceholder}>
                  <Ionicons name="sparkles" size={24} color={semantic.textMuted} />
                </View>
              )}
              <View style={styles.resultContent}>
                <Text variant="bodyMedium" color="textPrimary" weight="500" numberOfLines={1}>
                  {item.name}
                </Text>
                {item.shortDescription && (
                  <Text variant="captionMedium" color="textMuted" numberOfLines={1}>
                    {item.shortDescription}
                  </Text>
                )}
                {item.basePrice && (
                  <Text variant="bodySmall" color="primary" weight="600">
                    From ₹{item.basePrice}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={semantic.textMuted} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  backButton: {
    marginRight: spacing[3],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.backgroundSecondary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 16,
    color: semantic.textPrimary,
  },
  content: {
    padding: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  popularItem: {
    width: '30%',
    alignItems: 'center',
  },
  popularImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    marginBottom: spacing[2],
  },
  resultsList: {
    padding: spacing[4],
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  resultImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: semantic.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
    marginLeft: spacing[3],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  emptyTitle: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
});
