import { AuthFormBlock } from "@/src/components/auth/AuthFormBlock";
import { authTypography } from "@/src/components/auth/authStyles";
import { OxformalsWordmark } from "@/src/components/auth/OxformalsWordmark";
import { OxButton } from "@/src/components/ui/OxButton";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

type Props = { message?: string };

export function SignInGate({ message = "Sign in to continue" }: Props) {
  const router = useRouter();
  const { colors } = useOxTheme();

  return (
    <View style={styles.wrap}>
      <OxformalsWordmark width={112} />
      <Text
        style={[
          authTypography.title,
          styles.title,
          { color: colors.ink, fontFamily: FONT_DISPLAY },
        ]}
      >
        {message}
      </Text>
      <Text
        style={[
          authTypography.subtitle,
          { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
        ]}
      >
        Oxford email and a one-time code — under a minute.
      </Text>
      <AuthFormBlock
        action={
          <OxButton
            bare
            title="Sign in"
            onPress={() => router.push("/login")}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[4],
    paddingVertical: space[5],
    minHeight: 320,
    gap: space[2],
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    textAlign: "center",
    marginTop: space[1],
  },
});
