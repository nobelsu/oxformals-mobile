import {
  buildWobblyChatPaths,
  buildWobblyClockPaths,
  buildWobblyPersonPaths,
  buildWobblySearchPaths,
  seededOffset,
  STROKE_WIDTH,
} from "@/src/lib/ui/sketchStroke";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

export type TabBarIconVariant =
  | "feed"
  | "browse"
  | "history"
  | "chats"
  | "profile";

/** A hand-drawn house: roof, walls and a door. */
function buildWobblyHomePaths(
  size: number,
  seed: number,
): { roof: string; walls: string; door: string } {
  const w = (i: number) => seededOffset(seed, i) * 0.9;
  const left = size * 0.14;
  const right = size * 0.86;
  const eaves = size * 0.46;
  const floor = size * 0.88;
  const roof = `M ${left - size * 0.06 + w(0)} ${eaves + w(1)} L ${size / 2 + w(2)} ${size * 0.12 + w(3)} L ${right + size * 0.06 + w(4)} ${eaves + w(5)}`;
  const walls = `M ${left + w(6)} ${eaves - size * 0.04 + w(7)} L ${left + w(8)} ${floor + w(9)} L ${right + w(10)} ${floor + w(11)} L ${right + w(12)} ${eaves - size * 0.04 + w(13)}`;
  const door = `M ${size * 0.42 + w(14)} ${floor} L ${size * 0.42 + w(15)} ${size * 0.62 + w(16)} L ${size * 0.58 + w(17)} ${size * 0.62 + w(18)} L ${size * 0.58 + w(19)} ${floor}`;
  return { roof, walls, door };
}

const TAB_ICON_SEEDS: Record<TabBarIconVariant, number> = {
  feed: 7,
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

  const homePaths = useMemo(
    () => (variant === "feed" ? buildWobblyHomePaths(size, seed) : null),
    [variant, size, seed],
  );
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
        {homePaths && (
          <>
            <Path d={homePaths.roof} {...strokeProps} />
            <Path d={homePaths.walls} {...strokeProps} />
            <Path d={homePaths.door} {...strokeProps} />
          </>
        )}
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
