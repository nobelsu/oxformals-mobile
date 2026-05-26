import { useState } from "react";

/** Stable timestamp for the current mount (avoids impure Date.now() during render). */
export function useNowMs(): number {
  const [nowMs] = useState(() => Date.now());
  return nowMs;
}
