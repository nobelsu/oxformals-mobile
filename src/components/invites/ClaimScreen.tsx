import { useAuth } from "@/src/components/auth/useAuth";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  title: string;
  /** Runs the claim once the person is signed in; resolves to the line to show. */
  claim: () => Promise<string>;
};

/** Shared by invite links (/i/<code>) and seat links (/s/<token>) opened in the app. */
export function ClaimScreen({ title, claim }: Props) {
  const { colors } = useOxTheme();
  const router = useRouter();
  const { status, isAuthenticated, needsRulesAgreement } = useAuth();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const started = useRef(false);
  const ready = status === "ready" && isAuthenticated && !needsRulesAgreement;

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    claim()
      .then((text) => setResult({ ok: true, text }))
      .catch((error) => setResult({ ok: false, text: errorMessage(error) }));
  }, [ready, claim]);

  if (status === "ready" && !isAuthenticated) return <Redirect href="/login" />;
  if (status === "ready" && needsRulesAgreement) return <Redirect href="/house-rules" />;

  return (
    <>
      <Stack.Screen options={{ title, headerShown: true }} />
      {!result ? (
        <OxLoadingView fill />
      ) : (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <OxText style={[styles.heading, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
            {result.ok ? "Done" : "That didn't work"}
          </OxText>
          <OxText style={[styles.body, { color: colors.inkMuted }]}>{result.text}</OxText>
          <OxButton title="Continue" onPress={() => router.replace("/(tabs)/feed")} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  heading: { fontSize: 28, textTransform: "uppercase" },
  body: { fontSize: 16, lineHeight: 22, textAlign: "center" },
});
