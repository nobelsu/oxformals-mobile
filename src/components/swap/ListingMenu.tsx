import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { menuFileLabel } from "@/src/lib/upload/menuFile";
import { Linking, Pressable, StyleSheet, View } from "react-native";

type Props = {
  menu?: string;
  menuPdfUrl?: string;
  menuFileContentType?: string;
  numberOfLines?: number;
};

export function hasListingMenu(menu?: string, menuPdfUrl?: string): boolean {
  return !!(menu?.trim() || menuPdfUrl);
}

export function ListingMenu({
  menu,
  menuPdfUrl,
  menuFileContentType,
  numberOfLines = 4,
}: Props) {
  const { colors } = useOxTheme();
  const menuText = menu?.trim();
  const hasText = !!menuText;
  const hasFile = !!menuPdfUrl;

  if (!hasText && !hasFile) return null;

  async function openMenu() {
    if (!menuPdfUrl) return;
    try {
      await Linking.openURL(menuPdfUrl);
    } catch {
      // ignore — device may not handle URL
    }
  }

  return (
    <View style={styles.wrap}>
      {hasText ? (
        <OxText
          style={[styles.text, { color: colors.inkMuted }]}
          numberOfLines={numberOfLines}
        >
          {menuText}
        </OxText>
      ) : null}
      {hasFile ? (
        <View style={hasText ? styles.fileBelow : undefined}>
          <Pressable onPress={openMenu} accessibilityRole="link">
            <OxText style={[styles.link, { color: colors.ink }]}>
              View menu ({menuFileLabel(menuFileContentType)})
            </OxText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  fileBelow: {
    marginTop: 4,
  },
  link: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
