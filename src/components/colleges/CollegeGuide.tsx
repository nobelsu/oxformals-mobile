import { api } from "@/convex/_generated/api";
import { Chip } from "@/src/components/ui/Chip";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxSpinner } from "@/src/components/ui/OxSpinner";
import { OxText } from "@/src/components/ui/OxText";
import { SketchCard } from "@/src/components/ui/SketchCard";
import { CARD_GAP } from "@/src/constants/layout";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

type GuideData = FunctionReturnType<typeof api.collegeGuide.getGuide>;
type Guide = NonNullable<GuideData["guide"]>;
type Gowns = NonNullable<Guide["gowns"]>;
type Dress = NonNullable<Guide["dressCode"]>;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const NIGHTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GOWNS: { id: Gowns; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "sometimes", label: "Sometimes" },
  { id: "no", label: "No" },
];
const DRESS: { id: Dress; label: string }[] = [
  { id: "smart", label: "Smart" },
  { id: "suit", label: "Suit & tie" },
  { id: "blackTie", label: "Black tie" },
  { id: "casual", label: "Casual" },
];
/** Mirrors MAX_TIP_LENGTH in the backend's collegeGuide. */
const MAX_TIP = 140;
const TIP_REASONS: Record<string, string> = {
  tooLong: `Keep it under ${MAX_TIP} characters.`,
  empty: "Write a tip first.",
  flagged: "That tip can't be posted. Try rewording it.",
  unavailable: "Couldn't check that. Try again.",
};

/** A college's guide and tips, written by its own members, who can edit them here. */
export function CollegeGuide({ college }: { college: string }) {
  const { colors } = useOxTheme();
  const data = useQuery(api.collegeGuide.getGuide, { college });
  const deleteTip = useMutation(api.collegeGuide.deleteTip);
  const [editing, setEditing] = useState(false);
  const [tipping, setTipping] = useState(false);
  // Bumped on each open so a form starts from the saved values, not an old draft.
  const [opened, setOpened] = useState(0);
  const open = (which: "guide" | "tip") => {
    setOpened((n) => n + 1);
    if (which === "guide") setEditing(true);
    else setTipping(true);
  };

  if (data === undefined) {
    return (
      <View style={styles.loading}>
        <OxSpinner />
      </View>
    );
  }
  const { guide, tips, canEdit } = data;

  const facts: { icon: IconName; label: string; value: string }[] = guide
    ? [
        {
          icon: "moon-outline",
          label: "Formal nights",
          value: guide.formalNights.length
            ? guide.formalNights.join(", ")
            : "–",
        },
        {
          icon: "school-outline",
          label: "Gowns",
          value: GOWNS.find((g) => g.id === guide.gowns)?.label ?? "–",
        },
        {
          icon: "cash-outline",
          label: "Guest price",
          value: guide.guestPrice !== null ? `~£${guide.guestPrice}` : "–",
        },
        {
          icon: "shirt-outline",
          label: "Dress code",
          value: DRESS.find((d) => d.id === guide.dressCode)?.label ?? "–",
        },
      ]
    : [];

  const confirmRemove = (tipId: GuideData["tips"][number]["id"]) => {
    Alert.alert("Remove your tip?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteTip({ tipId }).catch((error) =>
            Alert.alert("Couldn't remove it", errorMessage(error)),
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      {guide ? (
        <SketchCard seed={17} padding={6} tilt={0.001}>
          <View style={styles.facts}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <View style={styles.factLabel}>
                  <Ionicons name={f.icon} size={14} color={colors.inkMuted} />
                  <OxText style={[styles.small, { color: colors.inkMuted }]}>
                    {f.label}
                  </OxText>
                </View>
                <OxText style={[styles.factValue, { color: colors.ink }]}>
                  {f.value}
                </OxText>
              </View>
            ))}
          </View>
        </SketchCard>
      ) : (
        <OxText style={[styles.empty, { color: colors.inkMuted }]}>
          No guide yet.
        </OxText>
      )}

      {tips.map((tip, i) => (
        <SketchCard key={tip.id} seed={29 + i} padding={10} tilt={0.001}>
          <OxText style={[styles.tip, { color: colors.ink }]}>
            {tip.text}
          </OxText>
          <View style={styles.tipFoot}>
            <OxText style={[styles.small, { color: colors.inkMuted }]}>
              {tip.authorFirstName}
            </OxText>
            {tip.mine ? (
              <OxText
                onPress={() => confirmRemove(tip.id)}
                accessibilityRole="button"
                suppressHighlighting
                style={[
                  styles.small,
                  styles.remove,
                  { color: colors.inkMuted },
                ]}
              >
                Remove
              </OxText>
            ) : null}
          </View>
        </SketchCard>
      ))}

      {canEdit ? (
        <View style={styles.actions}>
          <OxButton
            title={guide ? "Edit guide" : "Start the guide"}
            variant="secondary"
            onPress={() => open("guide")}
            style={styles.action}
          />
          <OxButton
            title="Add a tip"
            variant="secondary"
            onPress={() => open("tip")}
            style={styles.action}
          />
        </View>
      ) : null}

      {canEdit ? (
        <>
          <OxModal
            visible={editing}
            onClose={() => setEditing(false)}
            title={`${college} guide`}
          >
            <GuideForm
              key={opened}
              college={college}
              initial={guide}
              onDone={() => setEditing(false)}
            />
          </OxModal>
          <OxModal
            visible={tipping}
            onClose={() => setTipping(false)}
            title="Add a tip"
          >
            <TipForm
              key={opened}
              college={college}
              onDone={() => setTipping(false)}
            />
          </OxModal>
        </>
      ) : null}
    </View>
  );
}

function GuideForm({
  college,
  initial,
  onDone,
}: {
  college: string;
  initial: Guide | null;
  onDone: () => void;
}) {
  const { colors } = useOxTheme();
  const save = useMutation(api.collegeGuide.updateGuide);
  const [nights, setNights] = useState<string[]>(initial?.formalNights ?? []);
  const [gowns, setGowns] = useState<Gowns | null>(initial?.gowns ?? null);
  const [price, setPrice] = useState(
    initial?.guestPrice !== null && initial?.guestPrice !== undefined
      ? String(initial.guestPrice)
      : "",
  );
  const [dress, setDress] = useState<Dress | null>(initial?.dressCode ?? null);
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setBusy(true);
    try {
      await save({
        college,
        formalNights: nights,
        ...(gowns ? { gowns } : {}),
        ...(price ? { guestPrice: Number(price) } : {}),
        ...(dress ? { dressCode: dress } : {}),
      });
      onDone();
    } catch (error) {
      Alert.alert("Couldn't save the guide", errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <View>
        <OxText style={[styles.fieldLabel, { color: colors.inkMuted }]}>
          Formal nights
        </OxText>
        <View style={styles.chips}>
          {NIGHTS.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={nights.includes(n)}
              onPress={() =>
                setNights((cur) =>
                  cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n],
                )
              }
            />
          ))}
        </View>
      </View>
      <View>
        <OxText style={[styles.fieldLabel, { color: colors.inkMuted }]}>
          Gowns
        </OxText>
        <View style={styles.chips}>
          {GOWNS.map((g) => (
            <Chip
              key={g.id}
              label={g.label}
              selected={gowns === g.id}
              onPress={() => setGowns(g.id)}
            />
          ))}
        </View>
      </View>
      <View>
        <OxText style={[styles.fieldLabel, { color: colors.inkMuted }]}>
          Guest price (£)
        </OxText>
        <OxInput
          value={price}
          onChangeText={(t) => setPrice(t.replace(/\D/g, "").slice(0, 3))}
          placeholder="14"
          keyboardType="number-pad"
          accessibilityLabel="Guest price in pounds"
          wrapperStyle={styles.priceInput}
          seed={53}
        />
      </View>
      <View>
        <OxText style={[styles.fieldLabel, { color: colors.inkMuted }]}>
          Dress code
        </OxText>
        <View style={styles.chips}>
          {DRESS.map((d) => (
            <Chip
              key={d.id}
              label={d.label}
              selected={dress === d.id}
              onPress={() => setDress(d.id)}
            />
          ))}
        </View>
      </View>
      <OxButton title="Save" loading={busy} onPress={onSave} />
    </View>
  );
}

function TipForm({ college, onDone }: { college: string; onDone: () => void }) {
  const { colors } = useOxTheme();
  const addTip = useAction(api.collegeGuide.addTip);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const onPost = async () => {
    setBusy(true);
    try {
      const res = await addTip({ college, text });
      if (res.ok) onDone();
      else Alert.alert("Couldn't post that", TIP_REASONS[res.reason]);
    } catch (error) {
      Alert.alert("Couldn't post that", errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <View>
        <OxInput
          value={text}
          onChangeText={setText}
          maxLength={MAX_TIP}
          multiline
          placeholder="Sunday is the one to get."
          accessibilityLabel="Your tip"
          style={styles.tipInput}
          seed={61}
        />
        <OxText style={[styles.counter, { color: colors.inkMuted }]}>
          {text.length} / {MAX_TIP}
        </OxText>
      </View>
      <OxButton title="Post tip" loading={busy} onPress={onPost} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: CARD_GAP },
  loading: { paddingVertical: 24, alignItems: "center" },
  empty: { fontSize: 15 },
  facts: { flexDirection: "row", flexWrap: "wrap" },
  fact: { width: "50%", paddingHorizontal: 8, paddingVertical: 8, gap: 2 },
  factLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  factValue: { fontSize: 17 },
  small: { fontSize: 13 },
  tip: { fontSize: 16, lineHeight: 21 },
  tipFoot: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  remove: { textDecorationLine: "underline", paddingVertical: 4 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  form: { gap: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  priceInput: { width: 110 },
  tipInput: { minHeight: 88, textAlignVertical: "top" },
  counter: { fontSize: 12, textAlign: "right", marginTop: 4 },
});
