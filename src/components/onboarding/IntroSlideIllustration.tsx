import { useOxTheme } from "@/src/contexts/ThemeContext";
import { STROKE_DASH, STROKE_WIDTH, seededOffset } from "@/src/lib/ui/sketchStroke";
import { Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";

export type IntroIllustrationVariant = "welcome" | "browse" | "chat";

type Props = {
  variant: IntroIllustrationVariant;
};

function IllustrationCanvas({ children }: { children: ReactNode }) {
  const { colors } = useOxTheme();
  return (
    <View style={[styles.fill, styles.svgCenter, { backgroundColor: colors.bg }]}>
      <Svg width="90%" height="70%" viewBox="0 0 280 200" preserveAspectRatio="xMidYMid meet">
        {children}
      </Svg>
    </View>
  );
}

function CollegeShield({
  cx,
  cy,
  seed,
  stroke,
  fill,
}: {
  cx: number;
  cy: number;
  seed: number;
  stroke: string;
  fill: string;
}) {
  const w = (i: number) => seededOffset(seed, i) * 1.5;
  const d = `M ${cx + w(0)} ${cy + 14}
    Q ${cx - 16 + w(1)} ${cy + 2} ${cx - 13 + w(2)} ${cy - 10}
    L ${cx + w(3)} ${cy - 18}
    L ${cx + 13 + w(4)} ${cy - 10}
    Q ${cx + 16 + w(5)} ${cy + 2} ${cx + w(6)} ${cy + 14}
    Z`;
  return (
    <>
      <Path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        opacity={0.85}
      />
      <Line
        x1={cx + w(7)}
        y1={cy - 4}
        x2={cx + w(8)}
        y2={cy + 6}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        opacity={0.5}
      />
      <Line
        x1={cx - 6 + w(9)}
        y1={cy + 2}
        x2={cx + 6 + w(10)}
        y2={cy + 2}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        opacity={0.5}
      />
    </>
  );
}

function WelcomeIllustration() {
  const { colors } = useOxTheme();
  const stroke = colors.ink;
  const accent = colors.accent;
  const muted = colors.inkMuted;
  const plate = colors.bg;

  const tableSeed = 12;
  const w = (i: number) => seededOffset(tableSeed, i) * 2;
  const topY = 94;
  const bottomY = 156;
  const tablePath = `M ${88 + w(0)} ${topY + w(1)}
    L ${192 + w(2)} ${topY + w(3)}
    L ${224 + w(4)} ${bottomY + w(5)}
    L ${56 + w(6)} ${bottomY + w(7)} Z`;

  const seatTs = [0.14, 0.32, 0.5, 0.68, 0.86];
  const highlightSide: "left" | "right" = "left";
  const highlightIndex = 2;

  type Seat = { x: number; y: number; side: "left" | "right"; index: number };

  const seats: Seat[] = seatTs.flatMap((t, index) => {
    const leftX = 88 + (56 - 88) * t;
    const rightX = 192 + (224 - 192) * t;
    const y = topY + (bottomY - topY) * t;
    const offset = 22;
    return [
      { x: leftX - offset, y, side: "left" as const, index },
      { x: rightX + offset, y, side: "right" as const, index },
    ];
  });

  const innerPlateAt = (t: number) => {
    const leftEdgeX = 88 + (56 - 88) * t;
    const rightEdgeX = 192 + (224 - 192) * t;
    const y = topY + (bottomY - topY) * t;
    return {
      leftX: leftEdgeX + 32,
      rightX: rightEdgeX - 32,
      y,
    };
  };

  return (
    <IllustrationCanvas>
      <CollegeShield cx={140} cy={42} seed={3} stroke={stroke} fill={plate} />
      <CollegeShield cx={140} cy={186} seed={17} stroke={stroke} fill={plate} />

      <Path
        d={tablePath}
        fill={colors.paper}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
      />

      <Path
        d={`M ${140 + w(8)} ${topY + 8} L ${140 + w(9)} ${bottomY - 8}`}
        fill="none"
        stroke={muted}
        strokeWidth={STROKE_WIDTH}
        strokeDasharray={STROKE_DASH}
        strokeLinecap="round"
        opacity={0.7}
      />

      {seatTs.map((t) => {
        const { leftX, rightX, y } = innerPlateAt(t);
        return (
          <Fragment key={`inner-${t}`}>
            <Circle
              cx={leftX}
              cy={y}
              r={4}
              fill={plate}
              stroke={muted}
              strokeWidth={STROKE_WIDTH}
              opacity={0.8}
            />
            <Circle
              cx={rightX}
              cy={y}
              r={4}
              fill={plate}
              stroke={muted}
              strokeWidth={STROKE_WIDTH}
              opacity={0.8}
            />
          </Fragment>
        );
      })}

      {seats.map((seat) => {
        const isHighlight =
          seat.side === highlightSide && seat.index === highlightIndex;
        const glassSeed = seat.side === "left" ? seat.index : seat.index + 10;
        return (
          <Fragment key={`${seat.side}-${seat.index}`}>
            <Circle
              cx={seat.x}
              cy={seat.y}
              r={isHighlight ? 9 : 7}
              fill={isHighlight ? accent : plate}
              stroke={stroke}
              strokeWidth={STROKE_WIDTH}
              opacity={isHighlight ? 0.95 : 1}
            />
            <Circle
              cx={seat.x + seededOffset(40, glassSeed) * 3}
              cy={seat.y - 10 + seededOffset(41, glassSeed)}
              r={2.5}
              fill={plate}
              stroke={stroke}
              strokeWidth={STROKE_WIDTH}
              opacity={0.6}
            />
          </Fragment>
        );
      })}

      <Ellipse
        cx={140}
        cy={126}
        rx={10}
        ry={6}
        fill={plate}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        opacity={0.9}
      />
      <Line
        x1={134}
        y1={124}
        x2={146}
        y2={124}
        stroke={muted}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </IllustrationCanvas>
  );
}

function BrowseIllustration() {
  const { colors } = useOxTheme();
  const stroke = colors.ink;
  const fill = colors.accent;
  const muted = colors.inkMuted;

  return (
    <IllustrationCanvas>
        <Circle
          cx={44}
          cy={56}
          r={32}
          fill={colors.bg}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={STROKE_DASH}
        />
        <Line x1={44} y1={28} x2={44} y2={68} stroke={stroke} strokeWidth={STROKE_WIDTH} />
        <Path
          d="M 44 56 L 66 72"
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <Ellipse
          cx={44}
          cy={56}
          rx={6}
          ry={6}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />

        {[0, 1, 2].map((i) => {
          const x = 88 + i * 62 + seededOffset(12, i);
          const y = 36 + seededOffset(12, i + 3);
          return (
            <Path
              key={i}
              d={`M ${x} ${y} L ${x + 52 + seededOffset(12, i + 6)} ${y} L ${x + 50 + seededOffset(12, i + 7)} ${y + 88} L ${x - 2 + seededOffset(12, i + 8)} ${y + 90} Z`}
              fill={i === 1 ? fill : colors.bg}
              stroke={stroke}
              strokeWidth={STROKE_WIDTH}
            />
          );
        })}
        {[0, 1, 2].map((i) => (
          <Line
            key={`line-${i}`}
            x1={96 + i * 62}
            y1={56}
            x2={132 + i * 62}
            y2={56}
            stroke={muted}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={STROKE_DASH}
          />
        ))}
        {[0, 1].map((i) => (
          <Line
            key={`line2-${i}`}
            x1={96 + i * 62}
            y1={72}
            x2={124 + i * 62}
            y2={72}
            stroke={muted}
            strokeWidth={STROKE_WIDTH}
          />
        ))}
    </IllustrationCanvas>
  );
}

function ChatIllustration() {
  const { colors } = useOxTheme();
  const stroke = colors.ink;
  const fill = colors.accent;

  return (
    <IllustrationCanvas>
        <Circle
          cx={72}
          cy={100}
          r={36}
          fill={colors.bg}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />
        <Circle
          cx={208}
          cy={84}
          r={36}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          opacity={0.85}
        />
        <Path
          d="M 50 122 L 36 148 L 58 134 Z"
          fill={colors.bg}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />
        <Path
          d="M 230 104 L 250 132 L 222 118 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          opacity={0.85}
        />
        <Line
          x1={56}
          y1={92}
          x2={90}
          y2={92}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <Line
          x1={56}
          y1={106}
          x2={80}
          y2={106}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <Line
          x1={192}
          y1={76}
          x2={226}
          y2={76}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <Line
          x1={192}
          y1={90}
          x2={216}
          y2={90}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        <Path
          d="M 112 92 C 136 56 156 56 180 92"
          fill="none"
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={STROKE_DASH}
          strokeLinecap="round"
        />
        <Path
          d="M 176 92 L 198 72 L 198 92 L 176 92"
          fill={colors.bg}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />
        <Path
          d="M 116 92 L 94 112 L 94 92 L 116 92"
          fill={colors.bg}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />
        <Rect
          x={118}
          y={148}
          width={44}
          height={32}
          rx={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
          opacity={0.7}
        />
        <Line
          x1={128}
          y1={164}
          x2={152}
          y2={164}
          stroke={stroke}
          strokeWidth={STROKE_WIDTH}
        />
    </IllustrationCanvas>
  );
}

export function IntroSlideIllustration({ variant }: Props) {
  switch (variant) {
    case "welcome":
      return <WelcomeIllustration />;
    case "browse":
      return <BrowseIllustration />;
    case "chat":
      return <ChatIllustration />;
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: "100%",
  },
  svgCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
});
