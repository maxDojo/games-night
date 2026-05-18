import { Tabs } from "expo-router";
import { Home, Gamepad2, Trophy, User } from "lucide-react-native";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#C9A84C",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          position: "absolute",
          bottom: 24,
          left: 16,
          right: 16,
          height: 62,
          backgroundColor: "#FFFFFF",
          borderRadius: 36,
          borderWidth: 1,
          borderColor: "rgba(232, 213, 163, 0.27)", // #E8D5A344
          shadowColor: "#C9A84C",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.13,
          shadowRadius: 16,
          elevation: 5,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          padding: 4,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.5,
          marginBottom: 8,
        },
        tabBarIconStyle: {
          marginTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "HOME",
          tabBarIcon: ({ color }) => <Home size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "GAMES",
          tabBarIcon: ({ color }) => <Gamepad2 size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scores"
        options={{
          title: "SCORES",
          tabBarIcon: ({ color }) => <Trophy size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "PROFILE",
          tabBarIcon: ({ color }) => <User size={18} color={color} />,
        }}
      />
    </Tabs>
  );
}
