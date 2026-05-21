import {
  getHasSeenIntro,
  setHasSeenIntro,
} from "@/src/lib/onboarding/introStorage";
import { useCallback, useEffect, useState } from "react";

export function useIntroOnboarding() {
  const [ready, setReady] = useState(false);
  const [hasSeenIntro, setHasSeenIntroState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getHasSeenIntro().then((seen) => {
      if (cancelled) return;
      setHasSeenIntroState(seen);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markIntroSeen = useCallback(async () => {
    await setHasSeenIntro();
    setHasSeenIntroState(true);
  }, []);

  return { ready, hasSeenIntro, markIntroSeen };
}
