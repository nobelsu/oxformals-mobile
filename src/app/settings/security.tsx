import { api } from "@/convex/_generated/api";
import { useAuth } from "@/src/components/auth/useAuth";
import {
  SettingsGroup,
  SettingsRow,
  SettingsScreen,
} from "@/src/components/settings/SettingsUi";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxLoadingView } from "@/src/components/ui/OxLoadingView";
import { OxText } from "@/src/components/ui/OxText";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

/** Matches MIN_PASSWORD_LENGTH on the backend. */
const MIN_PASSWORD_LENGTH = 8;

type Mode = "menu" | "set" | "change" | "reset" | "remove";

const HEADING: Record<Exclude<Mode, "menu">, string> = {
  set: "Set a password",
  change: "Change password",
  reset: "Reset password",
  remove: "Remove password",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function SecuritySettingsScreen() {
  const { user, requestCode, verifyCode } = useAuth();
  const { colors } = useOxTheme();
  const hasPassword = useQuery(api.password.hasPassword, user ? {} : "skip");
  const setPassword = useAction(api.password.setPassword);
  const changePassword = useAction(api.password.changePassword);
  const resetPassword = useAction(api.password.resetPassword);
  const removePassword = useAction(api.password.removePassword);
  const signOutOthers = useAction(api.account.signOutOtherDevices);

  const [mode, setMode] = useState<Mode>("menu");
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  if (!user || hasPassword === undefined) {
    return (
      <SettingsScreen title="Security">
        <OxLoadingView />
      </SettingsScreen>
    );
  }
  const email = user.email;

  function open(target: Mode) {
    setCurrent("");
    setCode("");
    setNext("");
    setConfirm("");
    setDone(null);
    setMode(target);
  }

  function finish(message: string) {
    open("menu");
    setDone(message);
  }

  /** Emails a sign-in code; entering it proves it's you without the old password. */
  async function startReset() {
    if (sendingCode) return;
    setSendingCode(true);
    try {
      await requestCode(email);
      open("reset");
    } catch (error) {
      Alert.alert("Couldn't send the code", errorMessage(error));
    } finally {
      setSendingCode(false);
    }
  }

  async function run() {
    setBusy(true);
    try {
      if (mode === "set") {
        await setPassword({ password: next });
        finish("Password set.");
      } else if (mode === "change") {
        if ((await changePassword({ current, next })) === "wrong_password") {
          Alert.alert("That isn't your current password");
          return;
        }
        finish("Password changed. Other devices signed out.");
      } else if (mode === "remove") {
        if ((await removePassword({ current })) === "wrong_password") {
          Alert.alert("That isn't your current password");
          return;
        }
        finish("Password removed.");
      } else if (mode === "reset") {
        try {
          await verifyCode(email, code);
        } catch {
          Alert.alert("That code didn't work", "Check it, or send a new one.");
          return;
        }
        // A reset needs a session under ten minutes old; the one the code just
        // started can take a moment to reach the server.
        let result = await resetPassword({ next });
        for (let i = 0; i < 3 && result === "stale_session"; i++) {
          await sleep(500);
          result = await resetPassword({ next });
        }
        if (result !== "ok") {
          Alert.alert("Couldn't reset your password", "Send a new code and try again.");
          return;
        }
        finish("Password reset. Other devices signed out.");
      }
    } catch (error) {
      Alert.alert("Couldn't save that", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (busy) return;
    if (mode === "remove") {
      if (!current) {
        Alert.alert("Enter your current password");
        return;
      }
      Alert.alert("Remove password?", "You'll sign in with an email code.", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => void run() },
      ]);
      return;
    }
    if (mode === "change" && !current) {
      Alert.alert("Enter your current password");
      return;
    }
    if (mode === "reset" && !code.trim()) {
      Alert.alert("Enter the code from the email");
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      Alert.alert(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (next !== confirm) {
      Alert.alert("Passwords don't match");
      return;
    }
    void run();
  }

  function confirmSignOutOthers() {
    Alert.alert("Sign out other devices?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          setSigningOutOthers(true);
          setDone(null);
          signOutOthers({})
            .then(() => setDone("Signed out everywhere else."))
            .catch((error) =>
              Alert.alert("Couldn't sign them out", errorMessage(error)),
            )
            .finally(() => setSigningOutOthers(false));
        },
      },
    ]);
  }

  if (mode === "menu") {
    return (
      <SettingsScreen title="Security">
        {done ? (
          <OxText style={[styles.note, { color: colors.inkMuted }]}>{done}</OxText>
        ) : null}
        <SettingsGroup seed={51}>
          {hasPassword ? (
            <SettingsRow
              icon="key-outline"
              label="Change password"
              onPress={() => open("change")}
            />
          ) : (
            <SettingsRow
              icon="key-outline"
              label="Set a password"
              onPress={() => open("set")}
            />
          )}
          {hasPassword ? (
            <SettingsRow
              icon="mail-outline"
              label="Forgot your password?"
              value={`Code to ${email}`}
              loading={sendingCode}
              onPress={() => void startReset()}
            />
          ) : null}
          {hasPassword ? (
            <SettingsRow
              icon="close-circle-outline"
              label="Remove password"
              danger
              onPress={() => open("remove")}
            />
          ) : null}
        </SettingsGroup>
        <SettingsGroup seed={52}>
          <SettingsRow
            icon="phone-portrait-outline"
            label="Sign out other devices"
            chevron={false}
            loading={signingOutOthers}
            onPress={confirmSignOutOthers}
          />
        </SettingsGroup>
      </SettingsScreen>
    );
  }

  const needsCurrent = mode === "change" || mode === "remove";
  const needsNew = mode !== "remove";

  return (
    <SettingsScreen title="Security">
      <OxText style={[styles.heading, { color: colors.ink, fontFamily: FONT_DISPLAY }]}>
        {HEADING[mode]}
      </OxText>
      {mode === "reset" ? (
        <>
          <OxText style={[styles.note, { color: colors.inkMuted }]}>
            Code sent to {email}
          </OxText>
          <OxInput
            value={code}
            onChangeText={setCode}
            placeholder="Code"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!busy}
          />
        </>
      ) : null}
      {needsCurrent ? (
        <OxInput
          value={current}
          onChangeText={setCurrent}
          placeholder="Current password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          editable={!busy}
        />
      ) : null}
      {needsNew ? (
        <>
          <OxInput
            value={next}
            onChangeText={setNext}
            placeholder={`New password (${MIN_PASSWORD_LENGTH}+ characters)`}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!busy}
          />
          <OxInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Confirm new password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!busy}
          />
        </>
      ) : null}
      <View style={styles.actions}>
        <OxButton
          title="Cancel"
          variant="secondary"
          disabled={busy}
          onPress={() => open("menu")}
          style={styles.grow}
        />
        <OxButton
          title={mode === "remove" ? "Remove" : "Save"}
          variant={mode === "remove" ? "danger" : "primary"}
          loading={busy}
          onPress={submit}
          style={styles.grow}
        />
      </View>
      {mode === "reset" ? (
        <OxButton
          title="Send a new code"
          variant="ghost"
          loading={sendingCode}
          disabled={busy}
          onPress={() => void startReset()}
        />
      ) : null}
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, textTransform: "uppercase" },
  note: { fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  grow: { flex: 1 },
});
