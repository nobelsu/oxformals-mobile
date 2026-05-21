import { HouseRulesCard } from "@/src/components/auth/HouseRulesCard";
import { AuthScreenLayout } from "@/src/components/auth/AuthScreenLayout";
import { useAuth } from "@/src/components/auth/useAuth";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

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
    return <Redirect href="/(tabs)/browse" />;
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
      subtitle="Quick read before you browse — keeps swaps fair for everyone."
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
            router.replace("/(tabs)/browse");
          }}
        />
      }
    >
      <HouseRulesCard />
    </AuthScreenLayout>
  );
}
