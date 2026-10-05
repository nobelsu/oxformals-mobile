import { useAuth } from "@/src/components/auth/useAuth";
import { SettingsScreen } from "@/src/components/settings/SettingsUi";
import { Chip } from "@/src/components/ui/Chip";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { type AppearanceMode, useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { UI_FONT_OPTIONS, type UiFontId } from "@/src/lib/uiFont";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

const MODES: { id: AppearanceMode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export default function AppearanceSettingsScreen() {
  const { updateProfile } = useAuth();
  const { colors, uiFont, appearance, setAppearance } = useOxTheme();
  const [busy, setBusy] = useState(false);

  async function pickTheme(id: UiFontId) {
    if (busy || id === uiFont) return;
    setBusy(true);
    try {
      await updateProfile({ uiFont: id });
    } catch (error) {
      Alert.alert("Couldn't save that", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const heading = [styles.heading, { color: colors.ink, fontFamily: FONT_DISPLAY }];

  return (
    <SettingsScreen title="Appearance">
      <OxText style={heading}>Mode</OxText>
      <View style={styles.chips}>
        {MODES.map((mode) => (
          <Chip
            key={mode.id}
            label={mode.label}
            selected={appearance === mode.id}
            onPress={() => setAppearance(mode.id)}
          />
        ))}
      </View>
      <OxText style={[heading, styles.second]}>Theme</OxText>
      <View style={styles.chips}>
        {UI_FONT_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={uiFont === option.id}
            disabled={busy}
            onPress={() => void pickTheme(option.id)}
          />
        ))}
      </View>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, textTransform: "uppercase" },
  second: { marginTop: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
});
