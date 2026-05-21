import {
  buildWobblyChatPaths,
  buildWobblyClockPaths,
  buildWobblyPersonPaths,
  buildWobblySearchPaths,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type TabBarIconVariant = "browse" | "history" | "chats" | "profile";

const TAB_ICON_SEEDS: Record<TabBarIconVariant, number> = {
  browse: 3,
  history: 11,
  chats: 19,
  profile: 27,
};

type Props = {
  variant: TabBarIconVariant;
  focused: boolean;
  color: string;
  size: number;
};

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: "none";
};

/** Hand-drawn tab icon — matches sketchbook / doodle UI. */
export function TabBarIcon({ variant, focused, color, size }: Props) {
  const seed = TAB_ICON_SEEDS[variant];
  const strokeWidth = focused ? STROKE_WIDTH + 0.5 : STROKE_WIDTH;

  const strokeProps: StrokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  };

  const searchPaths = useMemo(
    () => (variant === "browse" ? buildWobblySearchPaths(size, seed) : null),
    [variant, size, seed],
  );
  const clockPaths = useMemo(
    () =>
      variant === "history" ? buildWobblyClockPaths(size, seed, focused) : null,
    [variant, size, seed, focused],
  );
  const chatPaths = useMemo(
    () => (variant === "chats" ? buildWobblyChatPaths(size, seed) : null),
    [variant, size, seed],
  );
  const personPaths = useMemo(
    () => (variant === "profile" ? buildWobblyPersonPaths(size, seed) : null),
    [variant, size, seed],
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} pointerEvents="none">
        {searchPaths && (
          <>
            <Path d={searchPaths.lens} {...strokeProps} />
            <Path d={searchPaths.handle} {...strokeProps} />
          </>
        )}
        {clockPaths && (
          <>
            <Path d={clockPaths.face} {...strokeProps} />
            <Path d={clockPaths.hour} {...strokeProps} />
            <Path d={clockPaths.minute} {...strokeProps} />
          </>
        )}
        {chatPaths && (
          <>
            <Path d={chatPaths.back} {...strokeProps} />
            <Path d={chatPaths.bubble} {...strokeProps} />
            <Path d={chatPaths.lines} {...strokeProps} />
          </>
        )}
        {personPaths && (
          <>
            <Path d={personPaths.head} {...strokeProps} />
            <Path d={personPaths.body} {...strokeProps} />
          </>
        )}
      </Svg>
    </View>
  );
}
