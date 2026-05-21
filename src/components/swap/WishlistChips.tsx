import { Chip } from "@/src/components/ui/Chip";
import { OxInput } from "@/src/components/ui/OxInput";
import { DISPLAY_SECTION } from "@/src/constants/layout";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { oxText } from "@/src/constants/oxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { OXFORD_COLLEGES } from "@/src/lib/data/colleges";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  selected: string[];
  onSave: (colleges: string[]) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (saveFn: () => Promise<void>) => void;
  registerCancel?: (cancelFn: () => void) => void;
};

export function WishlistChips({
  selected,
  onSave,
  onDirtyChange,
  registerSave,
  registerCancel,
}: Props) {
  const { colors } = useOxTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [draftSelected, setDraftSelected] = useState<string[] | null>(null);
  const effectiveSelected = draftSelected ?? selected;

  const filteredColleges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return OXFORD_COLLEGES;
    return OXFORD_COLLEGES.filter((college) =>
      college.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const hasUnsavedChanges = useMemo(() => {
    if (effectiveSelected.length !== selected.length) return true;
    const selectedSet = new Set(selected);
    return effectiveSelected.some((college) => !selectedSet.has(college));
  }, [effectiveSelected, selected]);

  const resetDraft = useCallback(() => {
    setDraftSelected(null);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    registerSave?.(async () => {
      if (!hasUnsavedChanges) return;
      await onSave(effectiveSelected);
      setDraftSelected(null);
    });
  }, [registerSave, hasUnsavedChanges, onSave, effectiveSelected]);

  useEffect(() => {
    registerCancel?.(resetDraft);
  }, [registerCancel, resetDraft]);

  function toggleDraft(college: string) {
    setDraftSelected((prev) => {
      const source = prev ?? selected;
      const next = source.includes(college)
        ? source.filter((item) => item !== college)
        : [...source, college];
      if (next.length === selected.length) {
        const selectedSet = new Set(selected);
        const isSameAsOriginal = next.every((item) => selectedSet.has(item));
        if (isSameAsOriginal) return null;
      }
      return next;
    });
  }

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.title,
          { color: colors.ink, fontFamily: FONT_DISPLAY },
        ]}
      >
        Formals I want to try
      </Text>
      <Text style={[styles.subtitle, oxText, { color: colors.inkMuted }]}>
        Tap colleges, then save your wishlist.
      </Text>
      <OxInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search colleges"
        wrapperStyle={{ marginTop: space[3] }}
      />
      <View style={styles.chips}>
        {filteredColleges.map((c) => (
          <Chip
            key={c}
            label={c}
            selected={effectiveSelected.includes(c)}
            onPress={() => toggleDraft(c)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: space[8],
  },
  title: {
    fontSize: DISPLAY_SECTION,
    textTransform: "uppercase",
  },
  subtitle: {
    marginTop: space[1],
    fontSize: 15,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[2],
    marginTop: space[4],
  },
});
