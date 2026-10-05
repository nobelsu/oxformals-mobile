import { Chip } from "@/src/components/ui/Chip";
import { DoodleOutline } from "@/src/components/ui/DoodleOutline";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { space } from "@/src/constants/spacing";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import {
  EMPTY_BROWSE_FILTERS,
  FORMAL_TYPES,
  guestsLabel,
  HOW_OPTIONS,
  WHEN_PRESETS,
  type BrowseFilters,
  type HowOption,
  type WhenPreset,
} from "@/src/lib/data/browseFilters";
import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BrowseDateCalendar } from "./BrowseDateCalendar";
import { FORMAL_TYPE_LABELS } from "./FormalTypeTag";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The filters in force; the sheet edits a copy until "Show". */
  value: BrowseFilters;
  onApply: (next: BrowseFilters) => void;
  /** How many formals a set of filters would show. */
  countFor: (filters: BrowseFilters) => number;
  /** Colleges with open listings, most first. */
  colleges: string[];
  /** Offer the "Want to go" chip (signed in with a non-empty list). */
  showWantToGo: boolean;
  maxGuests: number;
};

const WHEN_LABELS: Record<WhenPreset, string> = {
  tonight: "Tonight",
  week: "This week",
  weekend: "Weekend",
  dates: "Pick dates",
};

const HOW_LABELS: Record<HowOption, string> = { swap: "Swap", pay: "Pay" };

const STEP_SIZE = 40;

function toggle<T>(xs: T[], x: T): T[] {
  return xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useOxTheme();
  return (
    <View style={styles.section} accessibilityLabel={title}>
      <OxText
        style={[styles.sectionTitle, { color: colors.inkSoft }]}
        accessibilityRole="header"
      >
        {title}
      </OxText>
      {children}
    </View>
  );
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: "remove-outline" | "add-outline";
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useOxTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      <DoodleOutline
        seed={icon === "add-outline" ? 61 : 67}
        fill={colors.paper}
        stroke={colors.ink}
        contentStyle={styles.stepBtn}
      >
        <Ionicons name={icon} size={20} color={colors.ink} />
      </DoodleOutline>
    </Pressable>
  );
}

export function BrowseFiltersSheet({
  visible,
  onClose,
  value,
  onApply,
  countFor,
  colleges,
  showWantToGo,
  maxGuests,
}: Props) {
  const { colors } = useOxTheme();
  const [draft, setDraft] = useState<BrowseFilters>(value);
  const [wasVisible, setWasVisible] = useState(visible);

  // Each opening starts from the filters in force.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const set = (patch: Partial<BrowseFilters>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const count = countFor(draft);
  // A picked college stays listed even once its listings have gone.
  const collegeOptions = [
    ...colleges,
    ...draft.colleges.filter((c) => !colleges.includes(c)),
  ];

  function pickWhen(when: WhenPreset) {
    if (draft.when === when) set({ when: null, dates: [] });
    else set({ when, dates: when === "dates" ? draft.dates : [] });
  }

  return (
    <OxModal visible={visible} onClose={onClose} title="Filters">
      <Section title="When">
        <View style={styles.chips}>
          {WHEN_PRESETS.map((w) => (
            <Chip
              key={w}
              label={WHEN_LABELS[w]}
              selected={draft.when === w}
              onPress={() => pickWhen(w)}
            />
          ))}
        </View>
        {draft.when === "dates" ? (
          <View style={styles.calendar}>
            <BrowseDateCalendar
              embedded
              value={draft.dates}
              onChange={(dates) => set({ dates })}
            />
          </View>
        ) : null}
      </Section>

      {showWantToGo || collegeOptions.length > 0 ? (
        <Section title="Where">
          <View style={styles.chips}>
            {showWantToGo ? (
              <Chip
                label="Want to go"
                selected={draft.wantToGo}
                onPress={() => set({ wantToGo: !draft.wantToGo })}
              />
            ) : null}
            {collegeOptions.map((c) => (
              <Chip
                key={c}
                label={c}
                selected={draft.colleges.includes(c)}
                onPress={() => set({ colleges: toggle(draft.colleges, c) })}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title="How">
        <View style={styles.chips}>
          {HOW_OPTIONS.map((h) => (
            <Chip
              key={h}
              label={HOW_LABELS[h]}
              selected={draft.how.includes(h)}
              onPress={() => set({ how: toggle(draft.how, h) })}
            />
          ))}
        </View>
      </Section>

      <Section title="Seats">
        <View style={styles.stepper}>
          <StepButton
            icon="remove-outline"
            label="Fewer"
            disabled={draft.guests <= 0}
            onPress={() => set({ guests: Math.max(0, draft.guests - 1) })}
          />
          <OxText
            style={[styles.stepLabel, { color: colors.ink }]}
            accessibilityLiveRegion="polite"
          >
            {guestsLabel(draft.guests)}
          </OxText>
          <StepButton
            icon="add-outline"
            label="More"
            disabled={draft.guests >= maxGuests}
            onPress={() =>
              set({ guests: Math.min(maxGuests, draft.guests + 1) })
            }
          />
        </View>
      </Section>

      <Section title="Type">
        <View style={styles.chips}>
          {FORMAL_TYPES.map((t) => (
            <Chip
              key={t}
              label={FORMAL_TYPE_LABELS[t]}
              selected={draft.types.includes(t)}
              onPress={() => set({ types: toggle(draft.types, t) })}
            />
          ))}
        </View>
      </Section>

      <OxButton
        title={`Show ${count} ${count === 1 ? "formal" : "formals"}`}
        onPress={() => {
          onApply(draft);
          onClose();
        }}
        style={styles.apply}
      />
      <OxButton
        title="Clear"
        variant="ghost"
        onPress={() => setDraft(EMPTY_BROWSE_FILTERS)}
        style={styles.clear}
      />
    </OxModal>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: space[3] },
  sectionTitle: {
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: space[2],
  },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  calendar: { marginTop: space[1], marginBottom: space[2] },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[4],
    marginBottom: space[2],
  },
  stepBtn: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 17, minWidth: 76, textAlign: "center" },
  apply: { marginTop: space[2] },
  clear: { marginTop: space[2] },
});
