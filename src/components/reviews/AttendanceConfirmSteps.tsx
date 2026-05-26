import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import {
  ATTENDANCE_DECLINE_PRESET_OTHER,
  ATTENDANCE_DECLINE_PRESETS,
} from "@/lib/data/formalAttendance";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export function AttendanceSketchCard({ children }: { children: ReactNode }) {
  return <SketchCard padding={20}>{children}</SketchCard>;
}

function AttendanceStepTitle({ children }: { children: ReactNode }) {
  const { colors } = useOxTheme();
  return (
    <OxText
      style={[
        styles.stepTitle,
        { color: colors.ink, fontFamily: FONT_DISPLAY },
      ]}
    >
      {children}
    </OxText>
  );
}

function AttendanceStepBody({ children }: { children: ReactNode }) {
  const { colors } = useOxTheme();
  return (
    <OxText style={[styles.stepBody, { color: colors.inkMuted }]}>
      {children}
    </OxText>
  );
}

function AttendanceStepError({ message }: { message: string }) {
  const { colors } = useOxTheme();
  return (
    <OxText style={[styles.error, { color: colors.accentHover }]} role="alert">
      {message}
    </OxText>
  );
}

export function AttendanceChoiceStep({
  college,
  error,
  submitting,
  onConfirm,
  onDecline,
}: {
  college: string;
  error: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <AttendanceStepTitle>Confirm attendance</AttendanceStepTitle>
      <AttendanceStepBody>
        Before you can rate {college}&apos;s formal, let us know if you went.
        This helps keep college rankings accurate.
      </AttendanceStepBody>
      {error ? <AttendanceStepError message={error} /> : null}
      <View style={styles.actions}>
        <OxButton
          title={submitting ? "Saving…" : "Yes, I attended this formal"}
          onPress={onConfirm}
          disabled={submitting}
        />
        <OxButton
          title="No, I didn't attend"
          variant="secondary"
          onPress={onDecline}
          disabled={submitting}
        />
      </View>
    </>
  );
}

export function AttendanceReasonStep({
  reasonPreset,
  reasonOther,
  error,
  submitting,
  onPresetChange,
  onOtherChange,
  onBack,
  onContinue,
}: {
  reasonPreset: string;
  reasonOther: string;
  error: string | null;
  submitting: boolean;
  onPresetChange: (preset: string) => void;
  onOtherChange: (text: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { colors } = useOxTheme();

  return (
    <>
      <AttendanceStepTitle>Why didn&apos;t you attend?</AttendanceStepTitle>
      <AttendanceStepBody>
        This helps us understand no-shows. Your answer is not shared with the
        host.
      </AttendanceStepBody>
      <OxText style={[styles.radioLabel, { color: colors.inkSoft }]}>
        Reason you did not attend
      </OxText>
      <View style={styles.radioGroup}>
        {ATTENDANCE_DECLINE_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => onPresetChange(preset)}
            disabled={submitting}
            style={styles.radioRow}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.ink },
                reasonPreset === preset && { backgroundColor: colors.ink },
              ]}
            >
              {reasonPreset === preset ? (
                <View
                  style={[styles.radioInner, { backgroundColor: colors.bg }]}
                />
              ) : null}
            </View>
            <OxText style={{ color: colors.ink, flex: 1 }}>{preset}</OxText>
          </Pressable>
        ))}
      </View>
      {reasonPreset === ATTENDANCE_DECLINE_PRESET_OTHER ? (
        <OxInput
          value={reasonOther}
          onChangeText={onOtherChange}
          placeholder="Tell us what happened…"
          multiline
          maxLength={500}
          style={{ marginTop: 12 }}
        />
      ) : null}
      {error ? <AttendanceStepError message={error} /> : null}
      <View style={styles.actionsRow}>
        <OxButton title="Back" variant="secondary" onPress={onBack} disabled={submitting} />
        <OxButton title="Continue" onPress={onContinue} disabled={submitting} />
      </View>
    </>
  );
}

export function AttendanceRemoveStep({
  college,
  error,
  submitting,
  onRemove,
  onKeep,
  onBack,
}: {
  college: string;
  error: string | null;
  submitting: boolean;
  onRemove: () => void;
  onKeep: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <AttendanceStepTitle>Remove from your history?</AttendanceStepTitle>
      <AttendanceStepBody>
        Remove this {college} formal from &ldquo;Formals I attended&rdquo;? You
        can keep it listed if you still want a record of the swap.
      </AttendanceStepBody>
      {error ? <AttendanceStepError message={error} /> : null}
      <View style={styles.actions}>
        <OxButton
          title={submitting ? "Saving…" : "Yes, remove it"}
          onPress={onRemove}
          disabled={submitting}
        />
        <OxButton
          title="No, keep in my list"
          variant="secondary"
          onPress={onKeep}
          disabled={submitting}
        />
        <OxButton title="Back" variant="ghost" onPress={onBack} disabled={submitting} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepBody: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  error: { fontSize: 14, marginTop: 12 },
  actions: { marginTop: 16, gap: 8 },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radioLabel: { fontSize: 12, marginTop: 16, marginBottom: 8 },
  radioGroup: { gap: 10 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
