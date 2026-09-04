import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { AuthGate } from "@/src/components/auth-gate"

function TabBarIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
}) {
  return (
    <Ionicons name={name} size={24} color={focused ? "#2a9cff" : "#9ea2ad"} />
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
            title: "Jobs",
            tabBarIcon: ({ focused }) => (
              <TabBarIcon
                name={focused ? "briefcase" : "briefcase-outline"}
                focused={focused}
              />
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
