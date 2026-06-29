import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { View } from "react-native"
import { useCartStore } from "../../src/store"
import { Text } from "../../src/components/ui"
import { AuthGate } from "@/src/components/auth-gate"

function TabBarIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
}) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? "#2a9cff" : "#9ea2ad"}
    />
  )
}

function CartBadge() {
  const { cart } = useCartStore()
  const itemCount = cart?.items?.length || 0

  if (itemCount === 0) return null

  return (
    <View className="absolute -top-1 -right-2 bg-red-08 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
      <Text variant="tiny" color="#ffffff" weight="700">
        {itemCount > 9 ? "9+" : itemCount}
      </Text>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <AuthGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#2a9cff",
          tabBarInactiveTintColor: "#9ea2ad",
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#e9eaec",
            paddingTop: 8,
            height: 85,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
            marginBottom: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                name={focused ? "home" : "home-outline"}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: "Bookings",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                name={focused ? "calendar" : "calendar-outline"}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: "Cart",
            tabBarIcon: ({ focused }) => (
              <View>
                <TabBarIcon
                  name={focused ? "cart" : "cart-outline"}
                  focused={focused}
                />
                <CartBadge />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                name={focused ? "person" : "person-outline"}
                focused={focused}
              />
            ),
          }}
        />
      </Tabs>
    </AuthGate>
  )
}
