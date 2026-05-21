import { createContext, useContext, type ReactNode } from "react";

type SplashContextValue = {
  /** Handwriting splash animation has finished and overlay is removed. */
  splashDone: boolean;
};

const SplashContext = createContext<SplashContextValue | null>(null);

export function SplashProvider({
  splashDone,
  children,
}: {
  splashDone: boolean;
  children: ReactNode;
}) {
  return (
    <SplashContext.Provider value={{ splashDone }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplashDone(): boolean {
  const ctx = useContext(SplashContext);
  if (!ctx) {
    throw new Error("useSplashDone must be used within SplashProvider");
  }
  return ctx.splashDone;
}
