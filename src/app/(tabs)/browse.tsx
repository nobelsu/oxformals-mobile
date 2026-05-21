import { BrowseTab } from "@/src/components/swap/BrowseTab";
import { TAB_SCREEN_EDGES } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BrowseScreen() {
  const { colors } = useOxTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={TAB_SCREEN_EDGES}
    >
      <BrowseTab onSignInRequired={() => router.replace("/login")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
