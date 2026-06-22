import React, { useEffect, useState, useRef } from "react"
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
// @ts-ignore
import MapLibreGL from "@maplibre/maplibre-react-native"
import { Typography, Card, Avatar, Button, Spinner } from "heroui-native"
import { colors, semantic } from "../../src/theme/colors"
import { spacing, borderRadius } from "../../src/theme/spacing"
import { useBookingsStore, useUserStore } from "../../src/store"
import { Ionicons } from "@expo/vector-icons"

const { width, height } = Dimensions.get("window")
const ASPECT_RATIO = width / height
const LATITUDE_DELTA = 0.01
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO
const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${process.env.EXPO_PUBLIC_MAPTILER_API_KEY}`

export default function PartnerTrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>()
  const resolvedBookingId =
    typeof bookingId === "string" && bookingId.trim().length > 0
      ? bookingId
      : null
  const {
    selectedBooking,
    fetchBookingById,
    fetchPartnerLocation,
    partnerLocation,
  } = useBookingsStore()
  const { selectedAddress } = useUserStore()
  const [isLoading, setIsLoading] = useState(true)
  const cameraRef = useRef<MapLibreGL.CameraRef>(null)

  const booking = selectedBooking
  const partner = booking?.partner
  const address = booking?.address || selectedAddress

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!resolvedBookingId) return

        await fetchBookingById(resolvedBookingId)
        await fetchPartnerLocation(resolvedBookingId)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [resolvedBookingId, fetchBookingById, fetchPartnerLocation])

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        resolvedBookingId &&
        booking &&
        ["ARRIVING", "STARTED"].includes(booking.status)
      ) {
        fetchPartnerLocation(resolvedBookingId)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [booking, resolvedBookingId, fetchPartnerLocation])

  const handleCall = () => {
    if (partner?.phone) {
      Linking.openURL(`tel:${partner.phone}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const mapCenter = partnerLocation
    ? ([partnerLocation.longitude, partnerLocation.latitude] as [number, number])
    : address
      ? ([address.longitude, address.latitude] as [number, number])
      : undefined

  useEffect(() => {
    if (mapCenter && cameraRef.current) {
      cameraRef.current.flyTo(mapCenter)
    }
  }, [mapCenter])

  if (isLoading) {
    return <Spinner style={{ flex: 1, justifyContent: "center" }} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: semantic.background }}>
      {mapCenter ? (
        <MapLibreGL.MapView
          style={{ flex: 1 }}
          styleURL={MAPTILER_STYLE_URL}
          logoEnabled={false}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            centerCoordinate={mapCenter}
            zoomLevel={15}
          />
          {address && (
            <MapLibreGL.MarkerView
              coordinate={[address.longitude, address.latitude]}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="home" size={20} color={colors.white} />
              </View>
            </MapLibreGL.MarkerView>
          )}
          {partnerLocation && (
            <MapLibreGL.MarkerView
              coordinate={[partnerLocation.longitude, partnerLocation.latitude]}
            >
              <View style={styles.partnerMarker}>
                <Ionicons name="person" size={20} color={colors.white} />
              </View>
            </MapLibreGL.MarkerView>
          )}
        </MapLibreGL.MapView>
      ) : (
        <View style={styles.noMapContainer}>
          <Ionicons name="map-outline" size={48} color={semantic.textMuted} />
          <Typography type="body" style={[styles.noMapText, { color: semantic.textMuted }]}>
            Location not available
          </Typography>
        </View>
      )}

      <SafeAreaView
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
        edges={["top"]}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={semantic.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      <SafeAreaView
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: semantic.background,
          borderTopLeftRadius: borderRadius["2xl"],
          borderTopRightRadius: borderRadius["2xl"],
          padding: spacing[4],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
        edges={["bottom"]}
      >
        <View style={styles.handle} />

        <View style={styles.statusBanner}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={booking?.status === "ARRIVING" ? "car" : "construct"}
              size={20}
              color={colors.white}
            />
          </View>
          <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
            {booking?.status === "ARRIVING"
              ? "Partner is on the way"
              : "Service in progress"}
          </Typography>
        </View>

        {partner && (
          <Card style={styles.partnerCard} variant="default">
            <View style={styles.partnerContent}>
              <Avatar style={{ width: 48, height: 48, borderRadius: 24 }}>
                {partner.profileImage && (
                  <Avatar.Image
                    source={{ uri: partner.profileImage }}
                    style={{ width: "100%", height: "100%", borderRadius: 24 }}
                  />
                )}
                <Avatar.Fallback />
              </Avatar>
              <View style={styles.partnerInfo}>
                <Typography type="body" weight="semibold" style={{ color: semantic.textPrimary }}>
                  {partner.name || "Service Partner"}
                </Typography>
                {partner.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={14} color={colors.orange[8]} />
                    <Typography type="body-sm" style={{ color: semantic.textSecondary }}>
                      {partner.rating.toFixed(1)}
                    </Typography>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Ionicons name="call" size={20} color={semantic.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {booking?.status === "STARTED" && booking.endOtp && (
          <Card style={styles.otpCard} variant="secondary">
            <Typography type="body-sm" style={{ color: semantic.textMuted, textAlign: "center" }}>
              End Service OTP
            </Typography>
            <Typography type="h4" weight="bold" className="text-accent" style={{ textAlign: "center", marginVertical: spacing[1] }}>
              {booking.endOtp}
            </Typography>
            <Typography type="body-sm" style={{ color: semantic.textMuted, textAlign: "center" }}>
              Share this with the partner when service is complete
            </Typography>
          </Card>
        )}

        <Button
          variant="ghost"
          onPress={() =>
            router.push({
              pathname: "/(screens)/booking/[id]",
              params: { id: bookingId },
            })
          }
        >
          View Booking Details
        </Button>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  noMapContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semantic.backgroundSecondary,
  },
  noMapText: {
    marginTop: spacing[4],
  },
  backButton: {
    margin: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semantic.background,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: semantic.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing[4],
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  partnerCard: {
    marginBottom: spacing[4],
  },
  partnerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  partnerInfo: {
    flex: 1,
    marginLeft: spacing[3],
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[1],
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue[1],
    alignItems: "center",
    justifyContent: "center",
  },
  otpCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.green[1],
    borderColor: colors.green[3],
    borderWidth: 1,
  },
  destinationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  partnerMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: semantic.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
})
