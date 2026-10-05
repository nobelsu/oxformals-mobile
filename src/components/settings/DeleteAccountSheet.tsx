import { useAuth } from "@/src/components/auth/useAuth";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { formatListingDate } from "@/src/lib/data/format";
import { useMutation, useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

// This repo's convex/ folder is a stale copy of the web backend, so these
// functions are referenced by name rather than through the generated api.
type Impact = null | {
  email: string;
  hosting: {
    listingId: string;
    college: string;
    dateTime: string;
    guestCount: number;
  }[];
  joined: { listingId: string; college: string; dateTime: string }[];
  pendingRequests: number;
};
const getDeletionImpact = makeFunctionReference<
  "query",
  Record<string, never>,
  Impact
>("accountDeletion:getDeletionImpact");
const deleteMyAccountRef = makeFunctionReference<
  "mutation",
  { confirmEmail: string },
  null
>("accountDeletion:deleteMyAccount");

type Props = {
  visible: boolean;
  onClose: () => void;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function DeleteAccountSheet({ visible, onClose }: Props) {
  const { signOut } = useAuth();
  const { colors } = useOxTheme();
  const router = useRouter();
  const impact = useQuery(getDeletionImpact, visible ? {} : "skip");
  const deleteMyAccount = useMutation(deleteMyAccountRef);
  const [confirmInput, setConfirmInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches =
    !!impact &&
    confirmInput.trim().toLowerCase() === impact.email.toLowerCase();

  function handleClose() {
    if (busy) return;
    setConfirmInput("");
    setError(null);
    onClose();
  }

  async function onDelete() {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({ confirmEmail: confirmInput });
      await signOut();
      onClose();
      router.replace("/login");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("doesn't match")
          ? "That email doesn't match your account."
          : "Could not delete your account — try again in a moment.",
      );
      setBusy(false);
    }
  }

  const affected = impact
    ? [
        ...impact.hosting.map(
          (h) =>
            `You're hosting ${h.college} on ${formatListingDate(h.dateTime)}${
              h.guestCount > 0 ? ` with ${plural(h.guestCount, "guest")}` : ""
            }. It will be cancelled.`,
        ),
        ...impact.joined.map(
          (j) =>
            `You're a guest at ${j.college} on ${formatListingDate(j.dateTime)}. Your seat will be freed.`,
        ),
        ...(impact.pendingRequests > 0
          ? [
              `${plural(impact.pendingRequests, "pending request")} will be declined.`,
            ]
          : []),
      ]
    : [];

  return (
    <OxModal visible={visible} onClose={handleClose} title="Delete account">
      {impact === undefined ? (
        <OxText style={{ color: colors.inkMuted }}>Loading…</OxText>
      ) : impact === null ? (
        <OxText style={{ color: colors.inkMuted }}>
          You need to be signed in to delete your account.
        </OxText>
      ) : (
        <View style={styles.body}>
          {affected.length > 0 ? (
            <View style={styles.section}>
              <OxText style={{ color: colors.ink, fontWeight: "600" }}>
                This affects:
              </OxText>
              {affected.map((line) => (
                <OxText key={line} style={{ color: colors.ink }}>
                  • {line}
                </OxText>
              ))}
              <OxText style={{ color: colors.inkMuted }}>
                We&apos;ll email the people affected.
              </OxText>
            </View>
          ) : null}

          <OxText style={{ color: colors.ink }}>
            Your profile and data go. Reviews and messages stay as &ldquo;Deleted user&rdquo;. This can&apos;t be undone.
          </OxText>

          <View style={styles.section}>
            <OxText style={{ color: colors.inkMuted }}>
              Type {impact.email} to confirm
            </OxText>
            <OxInput
              value={confirmInput}
              onChangeText={setConfirmInput}
              placeholder={impact.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
            />
          </View>

          {error ? (
            <OxText style={{ color: colors.danger }} accessibilityRole="alert">
              {error}
            </OxText>
          ) : null}

          <OxButton
            title={busy ? "Deleting…" : "Delete account"}
            variant="danger"
            loading={busy}
            disabled={!matches || busy}
            onPress={() => void onDelete()}
          />
          <OxButton
            title="Cancel"
            variant="ghost"
            disabled={busy}
            onPress={handleClose}
          />
        </View>
      )}
    </OxModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space[4],
  },
  section: {
    gap: space[2],
  },
});
