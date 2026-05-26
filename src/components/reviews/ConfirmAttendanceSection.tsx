import {
  AttendanceChoiceStep,
  AttendanceReasonStep,
  AttendanceRemoveStep,
  AttendanceSketchCard,
} from "@/src/components/reviews/AttendanceConfirmSteps";
import { useNowMs } from "@/src/lib/hooks/useNowMs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ATTENDANCE_DECLINE_PRESET_OTHER,
  ATTENDANCE_DECLINE_PRESETS,
  validateDeclineReason,
} from "@/lib/data/formalAttendance";
import { useMutation } from "convex/react";
import { useState } from "react";

type Props = {
  listingId: string;
  college: string;
};

type Step = "choice" | "reason" | "remove";

export function ConfirmAttendanceSection({ listingId, college }: Props) {
  const nowMs = useNowMs();
  const confirmAttendance = useMutation(api.formalAttendance.confirmAttendance);
  const declineAttendance = useMutation(api.formalAttendance.declineAttendance);

  const [step, setStep] = useState<Step>("choice");
  const [reasonPreset, setReasonPreset] = useState<string>(
    ATTENDANCE_DECLINE_PRESETS[0],
  );
  const [reasonOther, setReasonOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await confirmAttendance({
        listingId: listingId as Id<"listings">,
        nowMs,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function goToRemoveStep() {
    const validated = validateDeclineReason(reasonPreset, reasonOther);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }
    setError(null);
    setStep("remove");
  }

  async function handleDecline(removeFromHistory: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      await declineAttendance({
        listingId: listingId as Id<"listings">,
        nowMs,
        reasonPreset,
        reasonOther:
          reasonPreset === ATTENDANCE_DECLINE_PRESET_OTHER
            ? reasonOther.trim()
            : undefined,
        removeFromHistory,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AttendanceSketchCard>
      {step === "reason" ? (
        <AttendanceReasonStep
          reasonPreset={reasonPreset}
          reasonOther={reasonOther}
          error={error}
          submitting={submitting}
          onPresetChange={(preset) => {
            setReasonPreset(preset);
            setError(null);
          }}
          onOtherChange={(text) => {
            setReasonOther(text);
            setError(null);
          }}
          onBack={() => {
            setStep("choice");
            setError(null);
          }}
          onContinue={goToRemoveStep}
        />
      ) : step === "remove" ? (
        <AttendanceRemoveStep
          college={college}
          error={error}
          submitting={submitting}
          onRemove={() => void handleDecline(true)}
          onKeep={() => void handleDecline(false)}
          onBack={() => {
            setStep("reason");
            setError(null);
          }}
        />
      ) : (
        <AttendanceChoiceStep
          college={college}
          error={error}
          submitting={submitting}
          onConfirm={() => void handleConfirm()}
          onDecline={() => {
            setStep("reason");
            setError(null);
          }}
        />
      )}
    </AttendanceSketchCard>
  );
}
