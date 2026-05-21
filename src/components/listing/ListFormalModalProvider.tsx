import { useData } from "@/src/components/data/useData";
import { ListFormalForm } from "@/src/components/swap/ListFormalForm";
import { OxModal } from "@/src/components/ui/OxModal";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ListFormalModalContextValue = {
  openListFormal: () => void;
  closeListFormal: () => void;
};

const ListFormalModalContext =
  createContext<ListFormalModalContextValue | null>(null);

export function useListFormalModal() {
  const ctx = useContext(ListFormalModalContext);
  if (!ctx) {
    throw new Error(
      "useListFormalModal must be used within ListFormalModalProvider",
    );
  }
  return ctx;
}

export function ListFormalModalProvider({ children }: { children: ReactNode }) {
  const { createListing } = useData();
  const [visible, setVisible] = useState(false);

  const openListFormal = useCallback(() => setVisible(true), []);
  const closeListFormal = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ openListFormal, closeListFormal }),
    [openListFormal, closeListFormal],
  );

  return (
    <ListFormalModalContext.Provider value={value}>
      {children}
      <OxModal
        visible={visible}
        onClose={closeListFormal}
        title="List a formal"
        showCloseButton={false}
        scrollable
      >
        <ListFormalForm
          onSubmit={(input) => {
            createListing(input);
            closeListFormal();
          }}
          onCancel={closeListFormal}
        />
      </OxModal>
    </ListFormalModalContext.Provider>
  );
}
