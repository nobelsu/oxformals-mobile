import * as Haptics from "expo-haptics";

/** Light impact when available; no-op on simulator / web / missing native module. */
export function lightImpact(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // UnavailabilityError when ExpoHaptics native module is not linked.
  });
}
