import { DEFAULT_UI_FONT, type UiFontId } from "@/src/lib/uiFont";
import { getOxColors, type OxColors } from "@/src/constants/oxTheme";
import { useAuth } from "@/src/components/auth/useAuth";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";

type ThemeContextValue = {
  colors: OxColors;
  uiFont: UiFontId;
  colorScheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colorScheme: "light" | "dark" = scheme === "dark" ? "dark" : "light";
  const { user } = useAuth();
  const uiFont = user?.uiFont ?? DEFAULT_UI_FONT;

  const colors = useMemo(
    () => getOxColors(uiFont, colorScheme),
    [uiFont, colorScheme],
  );

  const value = useMemo(
    () => ({ colors, uiFont, colorScheme }),
    [colors, uiFont, colorScheme],
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
