import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, Button, Input, Card, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useUserStore, useLocationStore } from '../../src/store';
import { AddressType, Address } from '../../src/types/api';
import { locationApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

const ADDRESS_TYPES: { key: AddressType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'HOME', label: 'Home', icon: 'home' },
  { key: 'OFFICE', label: 'Office', icon: 'business' },
  { key: 'OTHER', label: 'Other', icon: 'location' },
];

export default function AddAddressScreen() {
  const { addressId } = useLocalSearchParams<{ addressId?: string }>();
  const { addresses, addAddress, updateAddress, isLoading: isSaving } = useUserStore();
  const { getCurrentLocation, reverseGeocode, geocodedAddress, currentLocation, isLoading: locationLoading } = useLocationStore();

  const existingAddress = addressId ? addresses.find((a) => a.id === addressId) : null;

  const [formData, setFormData] = useState({
    name: existingAddress?.name || '',
    addressLine1: existingAddress?.addressLine1 || '',
    addressLine2: existingAddress?.addressLine2 || '',
    area: existingAddress?.area || '',
    city: existingAddress?.city || '',
    state: existingAddress?.state || '',
    pincode: existingAddress?.pincode || '',
    latitude: existingAddress?.latitude || 0,
    longitude: existingAddress?.longitude || 0,
    type: (existingAddress?.type || 'HOME') as AddressType,
    houseNo: existingAddress?.houseNo || '',
    buildingName: existingAddress?.buildingName || '',
    landmark: existingAddress?.landmark || '',
    floor: existingAddress?.floor?.toString() || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ placeId: string; description: string; mainText: string }[]>([]);

  const handleUseCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      const geocoded = await reverseGeocode(location.latitude, location.longitude);
      if (geocoded) {
        setFormData((prev) => ({
          ...prev,
          addressLine1: geocoded.address || '',
          area: geocoded.area || '',
          city: geocoded.city || '',
          state: geocoded.state || '',
          pincode: geocoded.pincode || '',
          latitude: location.latitude,
          longitude: location.longitude,
        }));
      }
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await locationApi.autocomplete(query);
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (placeId: string) => {
    setIsSearching(true);
    try {
      const response = await locationApi.getPlaceDetails(placeId);
      if (response.success && response.data) {
        const { lat, lng } = response.data.geometry.location;
        const geocoded = await reverseGeocode(lat, lng);
        if (geocoded) {
          setFormData((prev) => ({
            ...prev,
            addressLine1: geocoded.address || '',
            area: geocoded.area || '',
            city: geocoded.city || '',
            state: geocoded.state || '',
            pincode: geocoded.pincode || '',
            latitude: lat,
            longitude: lng,
          }));
        }
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSearching(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (formData.latitude === 0 || formData.longitude === 0) {
      newErrors.addressLine1 = 'Please select a location';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      if (existingAddress) {
        const success = await updateAddress({
          id: existingAddress.id,
          ...formData,
          floor: formData.floor ? parseInt(formData.floor) : undefined,
        });
        if (success) {
          Alert.alert('Success', 'Address updated successfully');
          router.back();
        } else {
          Alert.alert('Error', 'Failed to update address');
        }
      } else {
        const address = await addAddress({
          ...formData,
          floor: formData.floor ? parseInt(formData.floor) : undefined,
          isDefault: addresses.length === 0,
        } as Omit<Address, 'id' | 'userId' | 'canDelete'>);
        if (address) {
          Alert.alert('Success', 'Address added successfully');
          router.back();
        } else {
          Alert.alert('Error', 'Failed to add address');
        }
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Input
              placeholder="Search for area, street, locality..."
              value={searchQuery}
              onChangeText={handleSearch}
              leftIcon={<Ionicons name="search" size={20} color={semantic.textMuted} />}
            />
            {isSearching && <Spinner size="small" />}
            {searchResults.length > 0 && (
              <Card style={styles.searchResults} variant="elevated" padding={0}>
                {searchResults.map((result) => (
                  <TouchableOpacity
                    key={result.placeId}
                    style={styles.searchResult}
                    onPress={() => handleSelectPlace(result.placeId)}
                  >
                    <Ionicons name="location-outline" size={18} color={semantic.textMuted} />
                    <Text variant="bodySmall" color="textPrimary" numberOfLines={1} style={styles.searchResultText}>
                      {result.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            <TouchableOpacity style={styles.currentLocation} onPress={handleUseCurrentLocation}>
              <View style={styles.currentLocationIcon}>
                <Ionicons name="navigate" size={18} color={semantic.primary} />
              </View>
              <Text variant="bodySmall" color="primary" weight="600">
                Use current location
              </Text>
              {locationLoading && <Spinner size="small" />}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text variant="bodyMedium" color="textPrimary" weight="600" style={styles.sectionTitle}>
              Save as
            </Text>
            <View style={styles.typeSelector}>
              {ADDRESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.typeButton, formData.type === type.key && styles.typeButtonActive]}
                  onPress={() => setFormData((prev) => ({ ...prev, type: type.key }))}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={formData.type === type.key ? colors.white : semantic.primary}
                  />
                  <Text
                    variant="captionLarge"
                    color={formData.type === type.key ? 'textInverse' : 'primary'}
                    weight="500"
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Input
              label="Name *"
              placeholder="E.g., My Home"
              value={formData.name}
              onChangeText={(text) => {
                setFormData((prev) => ({ ...prev, name: text }));
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              error={errors.name}
            />

            <View style={styles.inputSpacing}>
              <Input
                label="Complete Address *"
                placeholder="House no, Building, Street"
                value={formData.addressLine1}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, addressLine1: text }));
                  if (errors.addressLine1) setErrors({ ...errors, addressLine1: '' });
                }}
                error={errors.addressLine1}
                multiline
              />
            </View>

            <View style={styles.inputSpacing}>
              <Input
                label="Flat / House No"
                placeholder="Optional"
                value={formData.houseNo}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, houseNo: text }))}
              />
            </View>

            <View style={styles.inputSpacing}>
              <Input
                label="Building / Society Name"
                placeholder="Optional"
                value={formData.buildingName}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, buildingName: text }))}
              />
            </View>

            <View style={styles.inputSpacing}>
              <Input
                label="Floor"
                placeholder="Optional"
                value={formData.floor}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, floor: text }))}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputSpacing}>
              <Input
                label="Landmark"
                placeholder="Near school, temple, etc."
                value={formData.landmark}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, landmark: text }))}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.halfInput, styles.inputSpacing]}>
                <Input
                  label="City *"
                  placeholder="City"
                  value={formData.city}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, city: text }));
                    if (errors.city) setErrors({ ...errors, city: '' });
                  }}
                  error={errors.city}
                />
              </View>
              <View style={[styles.halfInput, styles.inputSpacing]}>
                <Input
                  label="Pincode *"
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, pincode: text }));
                    if (errors.pincode) setErrors({ ...errors, pincode: '' });
                  }}
                  error={errors.pincode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onPress={handleSave}
            isLoading={isSaving}
          >
            {existingAddress ? 'Update Address' : 'Save Address'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  section: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  sectionTitle: {
    marginBottom: spacing[3],
  },
  searchResults: {
    marginTop: spacing[2],
    maxHeight: 200,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: semantic.borderLight,
  },
  searchResultText: {
    marginLeft: spacing[2],
    flex: 1,
  },
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    backgroundColor: colors.blue[1],
  },
  typeButtonActive: {
    backgroundColor: semantic.primary,
  },
  inputSpacing: {
    marginTop: spacing[4],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  halfInput: {
    flex: 1,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: semantic.border,
  },
});
