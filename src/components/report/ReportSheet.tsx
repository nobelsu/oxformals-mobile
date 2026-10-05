import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export type ReportTarget =
  | { kind: "user"; userId: Id<"users"> }
  | { kind: "listing"; listingId: Id<"listings"> }
  | { kind: "comment"; commentId: Id<"feedComments"> }
  | { kind: "message"; messageId: Id<"messages"> };

type Reason = "spam" | "harassment" | "inappropriate" | "impersonation" | "other";

const REASONS: { id: Reason; label: string }[] = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "inappropriate", label: "Inappropriate or offensive" },
  { id: "spam", label: "Spam or a scam" },
  { id: "impersonation", label: "Pretending to be someone else" },
  { id: "other", label: "Something else" },
];

/** Matches the backend's limit (convex/reports.ts). */
const MAX_REPORT_DETAILS_LENGTH = 500;

type Props = {
  /** What's being reported; null keeps the sheet closed. */
  target: ReportTarget | null;
  /** "Priya", "this comment": completes "Report …". */
  subject: string;
  onClose: () => void;
};

/** Pick a reason, optionally say more, send. The person reported isn't told. */
export function ReportSheet({ target, subject, onClose }: Props) {
  const { colors } = useOxTheme();
  const report = useMutation(api.reports.report);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setReason(null);
    setDetails("");
    setError(null);
    setSent(false);
    onClose();
  }

  async function submit() {
    if (!target || !reason || busy) return;
    setBusy(true);
    setError(null);
    try {
      await report({ target, reason, ...(details.trim() ? { details } : {}) });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, "Couldn't send your report."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <OxModal
      visible={target !== null}
      onClose={close}
      title={sent ? "Report sent" : `Report ${subject}`}
    >
      {sent ? (
        <>
          <OxText style={[styles.body, { color: colors.inkMuted }]}>
            Thanks. They won&apos;t be told.
          </OxText>
          <OxButton title="Done" onPress={close} style={styles.send} />
        </>
      ) : (
        <>
          <OxText style={[styles.label, { color: colors.inkMuted }]}>
            What&apos;s wrong?
          </OxText>
          <View style={styles.reasons} accessibilityRole="radiogroup">
            {REASONS.map((r) => {
              const on = reason === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setReason(r.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[
                    styles.reason,
                    {
                      borderColor: on ? colors.ink : colors.inkSoft,
                      backgroundColor: on ? colors.accent : colors.paper,
                    },
                  ]}
                >
                  <OxText
                    style={[
                      styles.reasonText,
                      { color: on ? colors.accentInk : colors.ink },
                    ]}
                  >
                    {r.label}
                  </OxText>
                </Pressable>
              );
            })}
          </View>
          <OxText style={[styles.label, { color: colors.inkMuted }]}>
            Anything to add? (optional)
          </OxText>
          <OxInput
            value={details}
            onChangeText={setDetails}
            maxLength={MAX_REPORT_DETAILS_LENGTH}
            multiline
            seed={67}
          />
          {error ? (
            <OxText style={[styles.error, { color: colors.danger }]}>{error}</OxText>
          ) : null}
          <OxButton
            title="Send report"
            onPress={() => void submit()}
            loading={busy}
            disabled={!reason}
            style={styles.send}
          />
        </>
      )}
    </OxModal>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 14, marginBottom: 6 },
  reasons: { gap: 8, marginBottom: 16 },
  reason: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 46,
    justifyContent: "center",
  },
  reasonText: { fontSize: 16 },
  error: { fontSize: 14, marginTop: 10 },
  send: { marginTop: 16 },
});
