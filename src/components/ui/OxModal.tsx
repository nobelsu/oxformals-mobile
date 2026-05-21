import { DoodleCloseButton } from "@/src/components/ui/DoodleCloseButton";
import { OxModalProvider } from "@/src/components/ui/OxModalContext";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { buildWavyLinePath, STROKE_WIDTH } from "@/src/lib/ui/sketchStroke";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** When false, hides the top-right × control (overlay / Cancel still dismiss). */
  showCloseButton?: boolean;
  /**
   * When false, content is laid out in a non-scrollable sheet body (better for short
   * modals). Tall content should stay scrollable (default).
   */
  scrollable?: boolean;
  children: React.ReactNode;
};

const MAX_SHEET_HEIGHT_RATIO = 0.9;

/** App-wide bottom sheet modal. All sheet UIs should use this component. */
export function OxModal({
  visible,
  onClose,
  title,
  showCloseButton = true,
  scrollable = true,
  children,
}: Props) {
  const { colors } = useOxTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const wasVisibleRef = useRef(false);
  const [headerWidth, setHeaderWidth] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const maxDynamicContentSize = useMemo(
    () => Dimensions.get("window").height * MAX_SHEET_HEIGHT_RATIO,
    [],
  );

  const topLine = useMemo(
    () => buildWavyLinePath(headerWidth, 7),
    [headerWidth],
  );

  const bodyStyle = useMemo<StyleProp<ViewStyle>>(
    () => [
      scrollable ? styles.scrollContent : styles.sheetContent,
      {
        paddingBottom:
          Math.max(insets.bottom, space[4]) +
          (keyboardVisible ? keyboardHeight : 0),
      },
    ],
    [scrollable, insets.bottom, keyboardVisible, keyboardHeight],
  );

  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      wasVisibleRef.current = true;
      const frame = requestAnimationFrame(() => {
        sheetRef.current?.present();
      });
      return () => cancelAnimationFrame(frame);
    }

    if (wasVisibleRef.current) {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    wasVisibleRef.current = false;
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.45}
        pressBehavior={keyboardVisible ? 0 : "close"}
        onPress={keyboardVisible ? Keyboard.dismiss : undefined}
      />
    ),
    [keyboardVisible],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.dismiss();
  }, []);

  const header = (
    <View
      style={styles.headerWrap}
      onLayout={(e) => setHeaderWidth(e.nativeEvent.layout.width)}
    >
      {headerWidth > 0 ? (
        <Svg
          width={headerWidth}
          height={12}
          style={styles.topDoodle}
          pointerEvents="none"
        >
          <Path
            d={topLine}
            fill="none"
            stroke={colors.ink}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
      <View style={styles.header}>
        {title ? (
          <Text
            style={[
              styles.title,
              { color: colors.ink, fontFamily: FONT_DISPLAY },
            ]}
          >
            {title.toUpperCase()}
          </Text>
        ) : null}
        {showCloseButton ? (
          <DoodleCloseButton
            onPress={handleClose}
            accessibilityLabel="Close"
            seed={3}
            size={36}
          />
        ) : null}
      </View>
    </View>
  );

  const scrollProps = {
    keyboardShouldPersistTaps: "handled" as const,
    keyboardDismissMode: "on-drag" as const,
    automaticallyAdjustKeyboardInsets: true,
  };

  const sheetBody = (
    <OxModalProvider>
      <Pressable
        accessible={false}
        onPress={dismissKeyboard}
        style={styles.dismissTap}
      >
        {header}
        {children}
      </Pressable>
    </OxModalProvider>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      maxDynamicContentSize={maxDynamicContentSize}
      handleComponent={null}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.paper },
      ]}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      bottomInset={0}
    >
      {scrollable ? (
        <BottomSheetScrollView
          {...scrollProps}
          contentContainerStyle={bodyStyle}
        >
          {sheetBody}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={bodyStyle}>{sheetBody}</BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: space[5],
    borderTopRightRadius: space[5],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: space[2],
  },
  scrollContent: {
    flexGrow: 0,
    paddingHorizontal: 20,
    paddingTop: space[2],
  },
  dismissTap: {
    flexGrow: 1,
  },
  topDoodle: {
    marginBottom: space[2],
  },
  headerWrap: {
    marginBottom: space[4],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    flex: 1,
  },
});
