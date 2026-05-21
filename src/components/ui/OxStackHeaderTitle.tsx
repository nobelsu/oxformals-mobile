import { FONT_DISPLAY } from "@/src/constants/fonts";
import { STACK_HEADER_BACK_RESERVE } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Text, useWindowDimensions, View } from "react-native";

type Props = {
  children: string;
};

/**
 * Android native-stack titles sit left-adjacent to custom headerLeft.
 * Reserve space for OxBackButton so long titles do not crowd the back control.
 */
export function OxStackHeaderTitle({ children }: Props) {
  const { colors } = useOxTheme();
  const { width: screenWidth } = useWindowDimensions();

  return (
    <View
      style={{
        width: screenWidth - STACK_HEADER_BACK_RESERVE,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 20,
          color: colors.ink,
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {children}
      </Text>
    </View>
  );
}
