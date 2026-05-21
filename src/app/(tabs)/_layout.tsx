import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/src/components/auth/useAuth";
import {
  ListFormalModalProvider,
  useListFormalModal,
} from "@/src/components/listing/ListFormalModalProvider";
import { CreateTabBarButton } from "@/src/components/ui/CreateTabBarButton";
import { TabBarIcon } from "@/src/components/ui/TabBarIcon";
import { Redirect, Tabs } from "expo-router";
import { useQuery } from "convex/react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { buildWavyLinePath, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";

function DoodleTabBarTop({ color }: { color: string }) {
  return (
    <View style={{ height: 10, width: "100%" }} pointerEvents="none">
      <Svg width="100%" height={10} viewBox="0 0 400 10" preserveAspectRatio="none">
        <Path
          d={buildWavyLinePath(400, 3)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

export default function TabsLayout() {
  const { status, isAuthenticated, needsRulesAgreement } = useAuth();

  if (status === "ready" && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (status === "ready" && needsRulesAgreement) {
    return <Redirect href="/house-rules" />;
  }

  return (
    <ListFormalModalProvider>
      <TabsNavigator />
    </ListFormalModalProvider>
  );
}

function TabsNavigator() {
  const { colors } = useOxTheme();
  const { isAuthenticated } = useAuth();
  const { openListFormal } = useListFormalModal();
  const unread = useQuery(
    api.chat.getTotalUnreadCount,
    isAuthenticated ? {} : "skip",
  );

  return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: colors.paper,
            borderTopWidth: 0,
            elevation: 0,
            paddingTop: 6,
          },
          tabBarItemStyle: {
            paddingTop: 4,
          },
          tabBarBackground: () => (
            <View style={{ flex: 1, backgroundColor: colors.paper }}>
              <DoodleTabBarTop color={colors.ink} />
            </View>
          ),
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarIconStyle: {
            marginTop: 2,
          },
          tabBarBadgeStyle: {
            backgroundColor: colors.danger,
            fontFamily: FONT_DISPLAY,
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="browse"
          options={{
            title: "Browse",
            tabBarAccessibilityLabel: "Browse",
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                variant="browse"
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="listings"
          options={{
            title: "History",
            tabBarAccessibilityLabel: "History",
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                variant="history"
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: "",
            tabBarAccessibilityLabel: "List a formal",
            tabBarIcon: () => null,
            tabBarButton: (props) => <CreateTabBarButton {...props} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openListFormal();
            },
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarAccessibilityLabel: "Chats",
            tabBarBadge:
              unread && unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                variant="chats"
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="mine"
          options={{
            title: "Profile",
            tabBarAccessibilityLabel: "Profile",
            tabBarIcon: ({ color, size, focused }) => (
              <TabBarIcon
                variant="profile"
                focused={focused}
                color={color}
                size={size}
              />
            ),
          }}
        />
      </Tabs>
  );
}
