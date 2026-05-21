import { ActiveListingsSection } from "@/src/components/profile/ActiveListingsSection";
import { MyProfileView } from "@/src/components/profile/MyProfileView";
import { SettingsModal } from "@/src/components/settings/SettingsModal";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SCREEN_PADDING,
  TAB_SCREEN_EDGES,
  TAB_SCREEN_TITLE_PADDING_TOP,
  TAB_SCROLL_EXTRA_BOTTOM,
} from "@/src/constants/layout";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ProfileTabScreen() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <SafeAreaView
        style={[styles.fill, { backgroundColor: colors.bg }]}
        edges={TAB_SCREEN_EDGES}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: TAB_SCREEN_TITLE_PADDING_TOP,
              paddingBottom:
                tabBarHeight + insets.bottom + TAB_SCROLL_EXTRA_BOTTOM,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <MyProfileView
            onEditPress={() => router.push("/profile/edit")}
            onSettingsPress={() => setSettingsOpen(true)}
          />
          <ActiveListingsSection />
        </ScrollView>
      </SafeAreaView>
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
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
