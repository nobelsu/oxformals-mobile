import { useAuth } from "@/src/components/auth/useAuth";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { useIntroOnboarding } from "@/src/hooks/useIntroOnboarding";
import { Redirect } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const { status, isAuthenticated, needsRulesAgreement } = useAuth();
  const { ready: introReady, hasSeenIntro } = useIntroOnboarding();
  const { colors } = useOxTheme();

  if (status !== "ready" || !introReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <OxLoadingView fill />
      </View>
    );
  }

  if (!hasSeenIntro) {
    return <Redirect href="/onboarding" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (needsRulesAgreement) {
    return <Redirect href="/house-rules" />;
  }

  return <Redirect href="/(tabs)/browse" />;
}
