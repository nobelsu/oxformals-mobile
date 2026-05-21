import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { Listing, RequestType } from "@/src/lib/data/types";
import { View } from "react-native";

type Props = {
  visible: boolean;
  listing: Listing | null;
  onClose: () => void;
  onChoose: (type: RequestType) => void;
};

export function RequestTypeChooserModal({
  visible,
  listing,
  onClose,
  onChoose,
}: Props) {
  const { colors } = useOxTheme();
  const sheetVisible = visible && !!listing;

  return (
    <OxModal
      visible={sheetVisible}
      onClose={onClose}
      title="How would you like to join?"
      scrollable={false}
    >
      {listing ? (
        <>
          <OxText style={{ color: colors.inkMuted, marginBottom: 20 }}>
            {listing.college} offers both swap and pay options.
          </OxText>
          <View style={{ gap: 12 }}>
            <OxButton title="Offer a swap" onPress={() => onChoose("swap")} />
            <OxButton
              title="Pay to join"
              variant="secondary"
              onPress={() => onChoose("pay")}
            />
          </View>
        </>
      ) : null}
    </OxModal>
  );
}
