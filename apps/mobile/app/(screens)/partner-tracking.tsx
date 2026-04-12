import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Text, Card, Avatar, Button, Spinner } from '../../src/components/ui';
import { colors, semantic } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useBookingsStore, useUserStore } from '../../src/store';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function PartnerTrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { selectedBooking, fetchBookingById, fetchPartnerLocation, partnerLocation } = useBookingsStore();
  const { selectedAddress } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  const booking = selectedBooking;
  const partner = booking?.partner;
  const address = booking?.address || selectedAddress;

  useEffect(() => {
    const loadData = async () => {
      await fetchBookingById(bookingId);
      await fetchPartnerLocation(bookingId);
      setIsLoading(false);
    };
    loadData();
  }, [bookingId, fetchBookingById, fetchPartnerLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (booking && ['ARRIVING', 'STARTED'].includes(booking.status)) {
        fetchPartnerLocation(bookingId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [booking, bookingId, fetchPartnerLocation]);

  const handleCall = () => {
    if (partner?.phone) {
      Linking.openURL(`tel:${partner.phone}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return <Spinner fullScreen message="Loading..." />;
  }

  const mapRegion = partnerLocation
    ? {
        latitude: partnerLocation.latitude,
        longitude: partnerLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
    : address
    ? {
        latitude: address.latitude,
        longitude: address.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {mapRegion ? (
        <MapView style={styles.map} initialRegion={mapRegion} provider={PROVIDER_GOOGLE}>
          {address && (
            <Marker
              coordinate={{
                latitude: address.latitude,
                longitude: address.longitude,
              }}
              title="Delivery Location"
              description={address.addressLine1}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="home" size={20} color={colors.white} />
              </View>
            </Marker>
          )}
          {partnerLocation && (
            <Marker
              coordinate={{
                latitude: partnerLocation.latitude,
                longitude: partnerLocation.longitude,
              }}
              title={partner?.name || 'Partner'}
            >
              <View style={styles.partnerMarker}>
                <Ionicons name="person" size={20} color={colors.white} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.noMapContainer}>
          <Ionicons name="map-outline" size={48} color={semantic.textMuted} />
          <Text variant="bodyMedium" color="textMuted" style={styles.noMapText}>
            Location not available
          </Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={['top']}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      <SafeAreaView style={styles.bottomSheet} edges={['bottom']}>
        <View style={styles.handle} />

        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={booking?.status === 'ARRIVING' ? 'car' : 'construct'}
              size={20}
              color={colors.white}
            />
          </View>
          <Text variant="bodyMedium" color="textPrimary" weight="600">
            {booking?.status === 'ARRIVING' ? 'Partner is on the way' : 'Service in progress'}
          </Text>
        </View>

        {partner && (
          <Card style={styles.partnerCard} variant="outlined">
            <View style={styles.partnerContent}>
              <Avatar source={partner.profileImage} name={partner.name} size="lg" />
              <View style={styles.partnerInfo}>
                <Text variant="bodyMedium" color="textPrimary" weight="600">
                  {partner.name || 'Service Partner'}
                </Text>
                {partner.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color={colors.orange[8]} />
                    <Text variant="captionMedium" color="textSecondary">
                      {partner.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Ionicons name="call" size={20} color={semantic.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {booking?.status === 'STARTED' && booking.endOtp && (
          <Card style={styles.otpCard} variant="filled">
            <Text variant="captionMedium" color="textMuted" align="center">
              End Service OTP
            </Text>
            <Text variant="h4" color="primary" weight="700" align="center">
              {booking.endOtp}
            </Text>
            <Text variant="captionMedium" color="textMuted" align="center">
              Share this with the partner when service is complete
            </Text>
          </Card>
        )}

        <Button variant="ghost" onPress={() => router.push({ pathname: '/(screens)/booking/[id]', params: { id: bookingId } })}>
          View Booking Details
        </Button>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  map: {
    flex: 1,
  },
  noMapContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: semantic.backgroundSecondary,
  },
  noMapText: {
    marginTop: spacing[4],
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    margin: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[4],
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue[1],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  partnerCard: {
    marginBottom: spacing[4],
  },
  partnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue[1],
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCard: {
    backgroundColor: colors.green[1],
    marginBottom: spacing[4],
  },
  destinationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  partnerMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
