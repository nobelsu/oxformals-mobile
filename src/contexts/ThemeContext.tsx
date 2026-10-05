import { DEFAULT_UI_FONT, type UiFontId } from "@/src/lib/uiFont";
import { getOxColors, type OxColors } from "@/src/constants/oxTheme";
import { useAuth } from "@/src/components/auth/useAuth";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme } from "react-native";

/** Light or dark, or whatever the device is set to. */
export type AppearanceMode = "system" | "light" | "dark";

const APPEARANCE_KEY = "oxformals.appearance";

function readStoredAppearance(): AppearanceMode {
  try {
    const stored = SecureStore.getItem(APPEARANCE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

type ThemeContextValue = {
  colors: OxColors;
  uiFont: UiFontId;
  colorScheme: "light" | "dark";
  /** The person's choice, kept on this device. */
  appearance: AppearanceMode;
  setAppearance: (mode: AppearanceMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [appearance, setAppearanceState] = useState(readStoredAppearance);
  const colorScheme: "light" | "dark" =
    appearance === "system" ? (scheme === "dark" ? "dark" : "light") : appearance;
  const { user } = useAuth();
  const uiFont = user?.uiFont ?? DEFAULT_UI_FONT;

  // Native pieces (status bar, keyboard, alerts, switches) follow the choice too.
  useEffect(() => {
    Appearance.setColorScheme(appearance === "system" ? "unspecified" : appearance);
  }, [appearance]);

  const setAppearance = useCallback((mode: AppearanceMode) => {
    setAppearanceState(mode);
    try {
      SecureStore.setItem(APPEARANCE_KEY, mode);
    } catch {
      // Still applies until the app restarts.
    }
  }, []);

  const colors = useMemo(
    () => getOxColors(uiFont, colorScheme),
    [uiFont, colorScheme],
  );

  const value = useMemo(
    () => ({ colors, uiFont, colorScheme, appearance, setAppearance }),
    [colors, uiFont, colorScheme, appearance, setAppearance],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useOxTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useOxTheme must be used within ThemeProvider");
  return ctx;
}
