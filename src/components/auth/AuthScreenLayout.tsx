import { AuthProgress, type AuthStep } from "@/src/components/auth/AuthProgress";
import { authLayout, authTypography } from "@/src/components/auth/authStyles";
import { OxformalsWordmark } from "@/src/components/auth/OxformalsWordmark";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky footer — use only when action is not inside `children`. */
  footer?: ReactNode;
  step?: AuthStep;
  onStepPress?: (step: AuthStep) => void;
  showWordmark?: boolean;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  footer,
  step,
  onStepPress,
  showWordmark = true,
  scrollable = false,
  contentStyle,
}: Props) {
  const { colors } = useOxTheme();

  const body = (
    <>
      <View style={authLayout.brand}>
        {showWordmark ? <OxformalsWordmark width={112} /> : null}
        {step != null ? (
          <AuthProgress current={step} onStepPress={onStepPress} />
        ) : null}
      </View>

      <View style={authLayout.copy}>
        <Text
          style={[
            authTypography.title,
            { color: colors.ink, fontFamily: FONT_DISPLAY },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              authTypography.subtitle,
              { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[authLayout.form, contentStyle]}>{children}</View>
    </>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? space[2] : 0}
      >
        <View style={styles.page}>
          {scrollable ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.scrollContent,
                footer ? styles.scrollContentWithFooter : undefined,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <Pressable
                accessible={false}
                onPress={Keyboard.dismiss}
                style={styles.dismissTap}
              >
                {body}
              </Pressable>
            </ScrollView>
          ) : (
            <Pressable
              accessible={false}
              onPress={Keyboard.dismiss}
              style={styles.stack}
            >
              {body}
            </Pressable>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  page: {
    flex: 1,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    ...authLayout.page,
  },
  stack: {
    flex: 1,
  },
  dismissTap: {
    flexGrow: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: space[2],
  },
  scrollContentWithFooter: {
    paddingBottom: space[4],
  },
  footer: {
    paddingTop: space[2],
    gap: space[2],
  },
});
