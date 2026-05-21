import {
  IntroSlideFooter,
  IntroSlidePage,
} from "@/src/components/onboarding/IntroSlideContent";
import { INTRO_SLIDES } from "@/src/components/onboarding/introSlides";
import type { IntroSlide } from "@/src/components/onboarding/introSlides";
import { useIntroOnboarding } from "@/src/hooks/useIntroOnboarding";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };

export default function OnboardingScreen() {
  const router = useRouter();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === "1";
  const { colors } = useOxTheme();
  const { width } = useWindowDimensions();
  const { ready, hasSeenIntro, markIntroSeen } = useIntroOnboarding();
  const [slide, setSlide] = useState(0);
  const listRef = useRef<FlatList<IntroSlide>>(null);

  const finish = useCallback(async () => {
    if (isReview) {
      router.back();
      return;
    }
    await markIntroSeen();
    router.replace("/login");
  }, [isReview, markIntroSeen, router]);

  const scrollToSlide = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex({ index, animated: true });
    },
    [],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const index = viewableItems[0]?.index;
      if (index != null) setSlide(index);
    },
    [],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      listRef.current?.scrollToOffset({
        offset: width * info.index,
        animated: true,
      });
    },
    [width],
  );

  if (ready && hasSeenIntro && !isReview) {
    return <Redirect href="/login" />;
  }

  const isLast = slide === INTRO_SLIDES.length - 1;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.content}>
        <FlatList
          ref={listRef}
          style={styles.pager}
          data={INTRO_SLIDES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <IntroSlidePage
              width={width}
              illustration={item.illustration}
              title={item.title}
              body={item.body}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={onScrollToIndexFailed}
        />
        <IntroSlideFooter
          slideIndex={slide}
          slideCount={INTRO_SLIDES.length}
          nextLabel={isLast ? "Get started" : "Next"}
          onNext={() => {
            if (isLast) void finish();
            else scrollToSlide(slide + 1);
          }}
          onBack={() => scrollToSlide(Math.max(0, slide - 1))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  pager: { flex: 1 },
});
