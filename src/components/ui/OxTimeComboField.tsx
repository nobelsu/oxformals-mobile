import { OxInput } from "@/src/components/ui/OxInput";
import { FONT_DISPLAY } from "@/src/constants/fonts";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  applyTimeToDate,
  filterFormalTimeSlots,
  formatFormalTimeForInput,
  parseFormalTimeInput,
  type FormalTimeSlot,
} from "@/src/lib/time/formalTime";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  value: Date;
  onChange: (next: Date) => void;
};

const DROPDOWN_MAX_HEIGHT = 200;

export function OxTimeComboField({ value, onChange }: Props) {
  const { colors } = useOxTheme();
  const committedLabel = formatFormalTimeForInput(value);
  const [draftText, setDraftText] = useState(committedLabel);
  const [open, setOpen] = useState(false);
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraftText(committedLabel);
  }, [committedLabel]);

  const filtered = useMemo(
    () => filterFormalTimeSlots(draftText),
    [draftText],
  );

  function commitSlot(slot: FormalTimeSlot) {
    const next = applyTimeToDate(value, slot.hours, slot.minutes);
    onChange(next);
    setDraftText(formatFormalTimeForInput(next));
    setOpen(false);
  }

  function commitParsed(hours: number, minutes: number) {
    const next = applyTimeToDate(value, hours, minutes);
    onChange(next);
    setDraftText(formatFormalTimeForInput(next));
    setOpen(false);
  }

  function handleBlur() {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    const parsed = parseFormalTimeInput(draftText);
    if (parsed) {
      commitParsed(parsed.hours, parsed.minutes);
    } else {
      setDraftText(committedLabel);
    }
    setOpen(false);
  }

  function handleSelectSlot(slot: FormalTimeSlot) {
    skipBlurCommitRef.current = true;
    commitSlot(slot);
  }

  return (
    <View
      accessibilityRole="combobox"
      accessibilityState={{ expanded: open }}
      accessibilityLabel="Time"
    >
      <View style={styles.inputRow}>
        <View style={styles.inputFlex}>
          <OxInput
            seed={42}
            placeholder="e.g. 7pm"
            value={draftText}
            onChangeText={(text) => {
              setDraftText(text);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Time"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? "Collapse time list" : "Expand time list"}
          onPress={() => setOpen((v) => !v)}
          style={styles.chevronBtn}
          hitSlop={8}
        >
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.inkMuted}
          />
        </Pressable>
      </View>

      {open && filtered.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            { borderColor: colors.inkMuted, backgroundColor: colors.paper },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {filtered.map(({ slot, label }) => (
              <Pressable
                key={`${slot.hours}-${slot.minutes}`}
                onPress={() => handleSelectSlot(slot)}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: colors.bg },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: colors.ink,
                      fontFamily: FONT_DISPLAY,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[2],
  },
  inputFlex: {
    flex: 1,
  },
  chevronBtn: {
    marginTop: space[3],
    padding: space[1],
  },
  dropdown: {
    marginTop: space[2],
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  option: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  optionText: {
    fontSize: 17,
  },
});
