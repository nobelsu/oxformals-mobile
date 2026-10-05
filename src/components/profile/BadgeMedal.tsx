import {
  medalTone,
  stampLabel,
  type BadgeDefinition,
  type BadgeIconId,
  type MedalTone,
} from "@/lib/data/badges";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<BadgeIconId, IconName> = {
  glass: "wine-outline",
  cap: "school-outline",
  candle: "flame-outline",
  crown: "diamond-outline",
  star: "star-outline",
  pen: "create-outline",
  trophy: "trophy-outline",
  college: "shield-outline",
  canape: "restaurant-outline",
};

/** The medal's metal, as on the website: bronze, silver, gold, ruby; specials are ink. */
const TONES: Record<Exclude<MedalTone, "ink">, string> = {
  bronze: "#b87a4b",
  silver: "#a7adb4",
  gold: "#d2a73c",
  ruby: "#b8423e",
};

type Props = {
  def: BadgeDefinition;
  /** Unearned medals are greyed. */
  earned?: boolean;
  size?: number;
};

/** One badge: a ringed medal, or a college's stamp. */
export function BadgeMedal({ def, earned = true, size = 50 }: Props) {
  const { colors } = useOxTheme();
  const tone = medalTone(def);
  const ring = !earned ? colors.inkSoft : tone === "ink" ? colors.ink : TONES[tone];

  return (
    <View
      style={[
        styles.medal,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
          backgroundColor: colors.paper,
        },
        !earned && styles.unearned,
      ]}
    >
      {def.family === "college" ? (
        <OxText
          style={{ fontSize: size * 0.24, color: earned ? colors.ink : colors.inkSoft }}
        >
          {stampLabel(def.name)}
        </OxText>
      ) : (
        <Ionicons name={ICONS[def.icon]} size={size * 0.44} color={ring} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: { borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  unearned: { borderStyle: "dashed", borderWidth: 2 },
});
