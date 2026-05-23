export const ATTENDANCE_DECLINE_PRESET_OTHER = "Other" as const;

export const ATTENDANCE_DECLINE_PRESETS = [
  "Plans changed",
  "Could not make it in time",
  "Joined by mistake",
  ATTENDANCE_DECLINE_PRESET_OTHER,
] as const;

export type AttendanceDeclinePreset = (typeof ATTENDANCE_DECLINE_PRESETS)[number];

export const MAX_ATTENDANCE_DECLINE_REASON_LENGTH = 500;

export type AttendanceResponseRow = {
  attended?: boolean;
};

/** Legacy rows without `attended` count as attended. */
export function rowCountsAsAttended(
  row: AttendanceResponseRow | null | undefined,
): boolean {
  if (!row) return false;
  return row.attended !== false;
}

export function validateDeclineReason(
  reasonPreset: string,
  reasonOther?: string,
):
  | { ok: true; reasonPreset: AttendanceDeclinePreset; reasonOther?: string }
  | { ok: false; error: string } {
  const preset = reasonPreset.trim();
  if (!ATTENDANCE_DECLINE_PRESETS.includes(preset as AttendanceDeclinePreset)) {
    return { ok: false, error: "Please select a reason." };
  }

  if (preset === ATTENDANCE_DECLINE_PRESET_OTHER) {
    const other = reasonOther?.trim() ?? "";
    if (!other) {
      return { ok: false, error: "Please describe why you did not attend." };
    }
    if (other.length > MAX_ATTENDANCE_DECLINE_REASON_LENGTH) {
      return {
        ok: false,
        error: `Reason must be at most ${MAX_ATTENDANCE_DECLINE_REASON_LENGTH} characters.`,
      };
    }
    return {
      ok: true,
      reasonPreset: preset,
      reasonOther: other,
    };
  }

  if (reasonOther?.trim()) {
    return {
      ok: false,
      error: "Additional details are only needed when you select Other.",
    };
  }

  return { ok: true, reasonPreset: preset as AttendanceDeclinePreset };
}
