import { DualTypeBadge } from "@/src/components/swap/DualTypeBadge";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { ListingType } from "@/src/lib/data/types";
import { StyleSheet, View } from "react-native";
import { DoodleOutline } from "./DoodleOutline";

type Props = {
  listingType: ListingType;
};

function typeLabel(t: Exclude<ListingType, "both">): string {
  return t === "pay" ? "Pay" : "Swap";
}

function typeSeed(t: ListingType): number {
  if (t === "pay") return 11;
  if (t === "both") return 22;
  return 33;
}

export function ListingTypeTag({ listingType }: Props) {
  const { colors } = useOxTheme();

  if (listingType === "both") {
    return (
      <View style={styles.wrap}>
        <DualTypeBadge />
      </View>
    );
  }

  const fill = listingType === "pay" ? colors.accent : colors.tag;
  const ink = listingType === "pay" ? colors.accentInk : colors.tagInk;
  const stroke = listingType === "pay" ? colors.accent : colors.tag;

  return (
    <View style={styles.wrap}>
      <DoodleOutline
        seed={typeSeed(listingType)}
        fill={fill}
        stroke={stroke}
        dashed={false}
        contentStyle={styles.inner}
      >
        <OxText style={[styles.label, { color: ink }]}>
          {typeLabel(listingType)}
        </OxText>
      </DoodleOutline>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
  inner: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
