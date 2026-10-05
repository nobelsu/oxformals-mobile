import { HouseRulesCard } from "@/src/components/auth/HouseRulesCard";
import { AuthScreenLayout } from "@/src/components/auth/AuthScreenLayout";
import { useAuth } from "@/src/components/auth/useAuth";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { OxText } from "@/src/components/ui/OxText";
import { WEB_ORIGIN } from "@/src/lib/webOrigin";
import { Linking, StyleSheet, View } from "react-native";

export default function HouseRulesScreen() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const { status, isAuthenticated, needsRulesAgreement, agreeToRules } =
    useAuth();
  const [agreeing, setAgreeing] = useState(false);

  if (status === "ready" && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (status === "ready" && isAuthenticated && !needsRulesAgreement) {
    return <Redirect href="/(tabs)/feed" />;
  }

  if (status !== "ready") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <OxLoadingView fill />
      </View>
    );
  }

  return (
    <AuthScreenLayout
      title="House rules"
      showWordmark={false}
      scrollable
      footer={
        <OxButton
          title="I agree — let's go"
          loading={agreeing}
          onPress={async () => {
            setAgreeing(true);
            await agreeToRules();
            setAgreeing(false);
            router.replace("/(tabs)/feed");
          }}
        />
      }
    >
      <HouseRulesCard />
      <OxText style={[styles.legal, { color: colors.inkMuted }]}>
        By continuing you agree to the{" "}
        <OxText
          style={styles.link}
          onPress={() => void Linking.openURL(`${WEB_ORIGIN}/terms`)}
          accessibilityRole="link"
        >
          Terms
        </OxText>{" "}
        and{" "}
        <OxText
          style={styles.link}
          onPress={() => void Linking.openURL(`${WEB_ORIGIN}/privacy`)}
          accessibilityRole="link"
        >
          Privacy policy
        </OxText>
        .
      </OxText>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  legal: { fontSize: 13, lineHeight: 18, textAlign: "center", marginTop: 16 },
  link: { textDecorationLine: "underline" },
});
