import { useOxTheme } from "@/src/contexts/ThemeContext";
import { RefreshControl, type RefreshControlProps } from "react-native";

/** Pull-to-refresh control with the native spinner hidden (use OxSpinner overlay). */
export function OxRefreshControl(props: RefreshControlProps) {
  const { colors } = useOxTheme();

  return (
    <RefreshControl
      tintColor="transparent"
      colors={["transparent"]}
      progressBackgroundColor={colors.bg}
      {...props}
    />
  );
}
