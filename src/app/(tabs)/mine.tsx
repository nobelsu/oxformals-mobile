import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/src/components/auth/useAuth";
import { ProfileView } from "@/src/components/profile/ProfileView";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  SCREEN_PADDING,
  TAB_SCREEN_EDGES,
  TAB_SCREEN_TITLE_PADDING_TOP,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { space } from "@/src/constants/spacing";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ProfileTabScreen() {
  const { colors } = useOxTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={styles.screen}>
      <SafeAreaView
        style={[styles.fill, { backgroundColor: colors.bg }]}
        edges={TAB_SCREEN_EDGES}
      >
        {user ? (
          <ScrollView
            style={styles.fill}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: TAB_SCREEN_TITLE_PADDING_TOP + space[2],
                paddingBottom:
                  tabBarHeight + insets.bottom + TAB_SCROLL_EXTRA_BOTTOM,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ProfileView userId={user.id as Id<"users">} />
          </ScrollView>
        ) : (
          <OxLoadingView fill />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_PADDING,
  },
});
