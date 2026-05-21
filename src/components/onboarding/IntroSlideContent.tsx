import { IntroSlideIllustration } from "@/src/components/onboarding/IntroSlideIllustration";
import type { IntroIllustrationVariant } from "@/src/components/onboarding/IntroSlideIllustration";
import { OxButton } from "@/src/components/ui/OxButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { SCREEN_PADDING } from "@/src/constants/layout";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { seededOffset, STROKE_DASH, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";

type PageProps = {
  width: number;
  illustration: IntroIllustrationVariant;
  title: string;
  body: string;
};

export function IntroSlidePage({
  width,
  illustration,
  title,
  body,
}: PageProps) {
  const { colors } = useOxTheme();

  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.illustrationArea}>
        <IntroSlideIllustration variant={illustration} />
      </View>
      <View style={styles.textBlock}>
        <Text
          style={[styles.title, { color: colors.ink, fontFamily: FONT_DISPLAY }]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.body,
            { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
          ]}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

type FooterProps = {
  slideIndex: number;
  slideCount: number;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
};

export function IntroSlideFooter({
  slideIndex,
  slideCount,
  onNext,
  onBack,
  nextLabel = "Next",
}: FooterProps) {
  const { colors } = useOxTheme();
  const showBack = onBack != null && slideIndex > 0;

  return (
    <View style={[styles.footer, { backgroundColor: colors.bg }]}>
      <View style={styles.dots}>
        {Array.from({ length: slideCount }, (_, i) => (
          <Svg key={i} width={14} height={14}>
            <Circle
              cx={7 + seededOffset(99, i)}
              cy={7 + seededOffset(99, i + 4)}
              r={5}
              fill={i <= slideIndex ? colors.accent : colors.bg}
              stroke={colors.ink}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={i === slideIndex ? undefined : STROKE_DASH}
            />
          </Svg>
        ))}
      </View>

      <View style={styles.actions}>
        {showBack ? (
          <OxButton
            title="Back"
            variant="secondary"
            onPress={onBack}
            style={styles.actionBtn}
          />
        ) : null}
        <OxButton
          title={nextLabel}
          onPress={onNext}
          style={showBack ? styles.actionBtn : styles.actionBtnFull}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  illustrationArea: {
    flex: 1,
    minHeight: 200,
  },
  textBlock: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    textTransform: "uppercase",
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  actionBtnFull: {
    flex: 1,
    alignSelf: "stretch",
  },
});
