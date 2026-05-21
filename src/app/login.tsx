import { useAuth } from "@/src/components/auth/useAuth";
import { AuthFormBlock } from "@/src/components/auth/AuthFormBlock";
import { AuthScreenLayout } from "@/src/components/auth/AuthScreenLayout";
import type { AuthStep } from "@/src/components/auth/AuthProgress";
import {
  SignupProfileForm,
  type SignupProfileFormValues,
} from "@/src/components/auth/SignupProfileForm";
import { authTypography } from "@/src/components/auth/authStyles";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { focusInputSoon } from "@/src/components/auth/profileFieldFocus";
import { useSplashDone } from "@/src/contexts/SplashContext";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { normalizeCollegeName } from "@/src/lib/data/colleges";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useIntroOnboarding } from "@/src/hooks/useIntroOnboarding";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

function isOxfordEmail(email: string): boolean {
  return (
    email.endsWith("@ox.ac.uk") ||
    email.endsWith("@oxford.said.edu") ||
    email.endsWith("@said.ox.ac.uk") ||
    email.endsWith("@said.oxford.edu")
  );
}

function formatVerifyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("could not verify") || lower.includes("invalid")) {
    return "That code doesn't match or has expired. Try again or request a new code.";
  }
  if (lower.includes("expired")) {
    return "That code has expired. Request a new one.";
  }
  return "Could not verify the code — try again or request a new code.";
}

type Step = AuthStep;

const EMPTY_PROFILE: SignupProfileFormValues = {
  name: "",
  college: "",
  year: "",
  role: "",
  interests: [],
  whatsappPhone: "",
  instagramHandle: "",
};

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useOxTheme();
  const {
    status,
    isAuthenticated,
    needsOnboarding,
    needsRulesAgreement,
    authEmail,
    requestCode,
    verifyCode,
    completeSignup,
  } = useAuth();
  const { ready: introReady, hasSeenIntro } = useIntroOnboarding();
  const splashDone = useSplashDone();

  const [step, setStep] = useState<Step>("email");
  const emailRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState<SignupProfileFormValues>(EMPTY_PROFILE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigateAfterAuth = useCallback(() => {
    if (needsRulesAgreement) {
      router.replace("/house-rules");
    } else {
      router.replace("/(tabs)/browse");
    }
  }, [needsRulesAgreement, router]);

  useEffect(() => {
    if (status === "ready" && isAuthenticated && !needsOnboarding) {
      navigateAfterAuth();
    }
  }, [status, isAuthenticated, needsOnboarding, navigateAfterAuth]);

  useEffect(() => {
    if (status === "ready" && needsOnboarding) {
      setStep("profile");
      if (authEmail) setEmail(authEmail);
    }
  }, [status, needsOnboarding, authEmail]);

  const focusAuthInput = useCallback(() => {
    if (!splashDone) return;
    if (step === "email") focusInputSoon(emailRef);
    if (step === "code") focusInputSoon(codeRef);
  }, [splashDone, step]);

  useFocusEffect(focusAuthInput);

  useEffect(() => {
    focusAuthInput();
  }, [focusAuthInput]);

  if (introReady && !hasSeenIntro) {
    return <Redirect href="/onboarding" />;
  }

  function goToStep(next: Step) {
    setError(null);
    setStep(next);
  }

  function updateProfile<K extends keyof SignupProfileFormValues>(
    key: K,
    value: SignupProfileFormValues[K],
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEmail() {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      setError("That doesn't look like an email.");
      return;
    }
    if (!isOxfordEmail(normalized)) {
      setError("Use your Oxford email address ending in @ox.ac.uk.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestCode(normalized);
      setEmail(normalized);
      setStep("code");
      setCode("");
    } catch {
      setError("Could not send the code — check your email and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCode(submittedCode?: string) {
    if (submitting) return;
    const trimmedCode = (submittedCode ?? code).trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyCode(email, trimmedCode);
      if (needsOnboarding) {
        setStep("profile");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not verify the code.";
      setError(formatVerifyError(msg));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendCode() {
    setSubmitting(true);
    setError(null);
    try {
      await requestCode(email.trim());
      setCode("");
    } catch {
      setError("Could not resend the code — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfile() {
    const { name, college, year, role, whatsappPhone, interests, instagramHandle } =
      profile;
    if (
      !name.trim() ||
      !college.trim() ||
      !year.trim() ||
      !role.trim() ||
      !whatsappPhone.trim()
    ) {
      setError(
        "Add name, college, year, role, and phone number — it only takes a moment.",
      );
      return;
    }
    const normalizedYear = year.trim();
    if (!/^\d+$/.test(normalizedYear)) {
      setError("Year must be a number, e.g. 2.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await completeSignup({
        email: email.trim(),
        name: name.trim(),
        college: normalizeCollegeName(college),
        year: normalizedYear,
        role: role.trim(),
        interests,
        whatsappPhone: whatsappPhone.trim(),
        instagramHandle: instagramHandle.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const titles: Record<Step, string> = {
    email: "Sign in",
    code: "Check inbox",
    profile: "Almost there",
  };

  const subtitles: Record<Step, string | undefined> = {
    email: "Oxford email only. We'll send a one-time code.",
    code: `6-digit code sent to ${email || "your email"}.`,
    profile: "So swap partners know who you are.",
  };

  return (
    <AuthScreenLayout
      title={titles[step]}
      subtitle={subtitles[step]}
      step={step}
      scrollable={step === "profile"}
      onStepPress={(s) => {
        if (s === "email" && step !== "email") goToStep("email");
      }}
    >
      {step === "email" && (
        <AuthFormBlock
          error={error}
          input={
            <OxInput
              ref={emailRef}
              bare
              placeholder="sso@ox.ac.uk"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="go"
              onSubmitEditing={handleEmail}
            />
          }
          action={
            <OxButton
              bare
              title="Send code"
              loading={submitting}
              onPress={handleEmail}
            />
          }
          secondary={
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/onboarding",
                  params: { review: "1" },
                })
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to intro"
            >
              <Text
                style={[
                  authTypography.link,
                  { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
                ]}
              >
                Back to intro
              </Text>
            </Pressable>
          }
        />
      )}

      {step === "code" && (
        <AuthFormBlock
          error={error}
          input={
            <OxInput
              ref={codeRef}
              bare
              placeholder="000000"
              value={code}
              onChangeText={(t) => {
                const next = t.replace(/\D/g, "").slice(0, 6);
                setCode(next);
                if (next.length === 6 && !submitting) {
                  void handleCode(next);
                }
              }}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              style={styles.codeField}
            />
          }
          action={
            <OxButton
              bare
              title="Verify"
              loading={submitting}
              onPress={() => void handleCode()}
            />
          }
          secondary={
            <View style={styles.codeSecondary}>
              <Pressable
                onPress={() => void handleResendCode()}
                disabled={submitting}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    authTypography.link,
                    { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
                  ]}
                >
                  Resend code
                </Text>
              </Pressable>
              <Pressable
                onPress={() => goToStep("email")}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    authTypography.link,
                    { color: colors.inkMuted, fontFamily: FONT_DISPLAY },
                  ]}
                >
                  Use a different email
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.codeHint,
                  { color: colors.inkSoft, fontFamily: FONT_DISPLAY },
                ]}
              >
                Check promotions or spam. Codes expire after 10 minutes.
              </Text>
            </View>
          }
        />
      )}

      {step === "profile" && (
        <View style={styles.profile}>
          <SignupProfileForm
            values={profile}
            onChange={updateProfile}
            seedOffset={0}
          />
          <AuthFormBlock
            error={error}
            action={
              <OxButton
                bare
                title="Continue"
                loading={submitting}
                onPress={handleProfile}
              />
            }
          />
        </View>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  codeSecondary: {
    gap: space[2],
    alignItems: "center",
    width: "100%",
  },
  codeField: {
    fontSize: 22,
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: space[1],
  },
  profile: {
    gap: space[4],
  },
});
