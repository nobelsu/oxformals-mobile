import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/src/components/auth/useAuth";
import { ProfileView } from "@/src/components/profile/ProfileView";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { colors } = useOxTheme();
  const { user: currentUser } = useAuth();

  const isOwnProfile = !!(currentUser && userId === currentUser.id);

  // Your own profile lives on its tab.
  useEffect(() => {
    if (isOwnProfile) {
      router.dismissTo("/(tabs)/mine");
    }
  }, [isOwnProfile, router]);

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      {isOwnProfile || !userId ? (
        <OxLoadingView fill />
      ) : (
        <ScrollView
          style={[styles.root, { backgroundColor: colors.bg }]}
          contentContainerStyle={styles.content}
        >
          <ProfileView userId={userId as Id<"users">} />
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SCREEN_PADDING, paddingBottom: 40 },
});
