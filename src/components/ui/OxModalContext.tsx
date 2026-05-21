import { createContext, useContext, type ReactNode } from "react";

const OxModalContext = createContext(false);

export function OxModalProvider({ children }: { children: ReactNode }) {
  return (
    <OxModalContext.Provider value={true}>{children}</OxModalContext.Provider>
  );
}

/** True when rendered inside {@link OxModal} (use BottomSheetTextInput). */
export function useInOxModal(): boolean {
  return useContext(OxModalContext);
}
