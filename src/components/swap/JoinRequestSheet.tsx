import { api } from "@/convex/_generated/api";
import { MAX_GUESTS } from "@/convex/seats";
import { useData } from "@/src/components/data/useData";
import { Avatar } from "@/src/components/ui/Avatar";
import { OxButton } from "@/src/components/ui/OxButton";
import { OxInput } from "@/src/components/ui/OxInput";
import { OxModal } from "@/src/components/ui/OxModal";
import { OxText } from "@/src/components/ui/OxText";
import { useOxTheme } from "@/src/contexts/ThemeContext";
import type { AvatarSource } from "@/src/lib/auth/types";
import { formatListingDate, formatPrice } from "@/src/lib/data/format";
import { listingSupportsSwap } from "@/src/lib/data/listingType";
import type { Listing, RequestType } from "@/src/lib/data/types";
import { errorMessage } from "@/src/lib/errorMessage";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useState } from "react";
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from "react-native";

type Props = {
  target: Listing;
  /** Your own active formals that can be offered in a swap. */
  myListings: Listing[];
  onClose: () => void;
  onListFormal: () => void;
  onSent: (result: { accepted: boolean; links: string[] }) => void;
};

type Payer = "you" | "them";
type PlanSeat = {
  key: string;
  kind: "you" | "friend" | "guest" | "link";
  label: string;
  userId?: string;
  payer: Payer;
  method: RequestType;
};
type FriendOption = { _id: string; name?: string; avatar?: AvatarSource };
type Choice = { payer: Payer; method: RequestType; label: string };

/** A short list of choices: an action sheet on iOS, an alert elsewhere. */
function pickFrom(title: string, labels: string[], onPick: (index: number) => void) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...labels, "Cancel"], cancelButtonIndex: labels.length },
      (index) => {
        if (index < labels.length) onPick(index);
      },
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...labels.map((text, index) => ({ text, onPress: () => onPick(index) })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}

/**
 * The one way to ask for a seat: say who's coming, pick how to pay (swap a
 * seat at your formal, spend a credit, or pay the host), add a message, send.
 * Mirrors the website's request flow.
 */
export function JoinRequestSheet({
  target,
  myListings,
  onClose,
  onListFormal,
  onSent,
}: Props) {
  const { colors } = useOxTheme();
  const { sendRequest } = useData();
  const credits = useQuery(api.credits.getMyCredits, {});
  const allFriends = useQuery(api.follows.listMyFriends, {}) as
    | FriendOption[]
    | undefined;
  // The host and anyone already in the group can't be brought along.
  const friendsList = allFriends?.filter(
    (f) => !target || !target.members.includes(f._id),
  );
  const balance = credits?.balance ?? 0;

  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [guests, setGuests] = useState(0);
  const [newPeople, setNewPeople] = useState(0);
  const maxExtra = Math.max(0, Math.min(MAX_GUESTS, target.seatsAvailable - 1));
  const extra = friendIds.length + guests + newPeople;
  const seats = 1 + extra;

  const allowsSwap = listingSupportsSwap(target.listingType);
  const allowsPay = target.listingType === "pay" || target.listingType === "both";

  // The method for your seat and every seat you cover (unless edited per seat).
  const [picked, setPicked] = useState<RequestType | null>(null);
  const [customPlan, setCustomPlan] = useState<PlanSeat[] | null>(null);
  const editingPlan = customPlan !== null;

  const friendName = (id: string) =>
    (friendsList ?? []).find((f) => f._id === id)?.name?.split(" ")[0] ?? "Friend";

  // Default plan: you cover yourself and your guests; each named friend and
  // each new person pays their own seat with a credit.
  const coveredSeats = 1 + guests;
  const swapListingsFor = (n: number) => myListings.filter((l) => l.seatsAvailable >= n);
  const canSwapBase = allowsSwap && swapListingsFor(coveredSeats).length > 0;
  const canCreditBase = balance >= coveredSeats;
  const defaultMethod: RequestType = canSwapBase
    ? "swap"
    : canCreditBase || !allowsPay
      ? "credit"
      : "pay";
  const baseMethod = picked ?? defaultMethod;

  const defaultPlan: PlanSeat[] = [
    { key: "you", kind: "you", label: "You", payer: "you", method: baseMethod },
    ...friendIds.map((id) => ({
      key: `friend:${id}`,
      kind: "friend" as const,
      label: friendName(id),
      userId: id,
      payer: "them" as const,
      method: "credit" as const,
    })),
    ...Array.from({ length: newPeople }, (_, i) => ({
      key: `link:${i}`,
      kind: "link" as const,
      label: `New person ${i + 1}`,
      payer: "them" as const,
      method: "credit" as const,
    })),
    ...Array.from({ length: guests }, (_, i) => ({
      key: `guest:${i}`,
      kind: "guest" as const,
      label: `Guest ${i + 1}`,
      payer: "you" as const,
      method: baseMethod,
    })),
  ];
  const plan = customPlan ?? defaultPlan;

  // Changing who's coming resets any per-seat edits.
  const changePeople = (fn: () => void) => {
    fn();
    setCustomPlan(null);
  };

  const yourCredits = plan.filter((p) => p.payer === "you" && p.method === "credit").length;
  const creditSeats = plan.filter((p) => p.method === "credit").length;
  const swapSeats = plan.filter((p) => p.method === "swap").length;
  const cashSeats = plan.filter((p) => p.method === "pay").length;
  const swapListings = swapListingsFor(Math.max(1, swapSeats));

  const [offeringId, setOfferingId] = useState("");
  const effectiveOfferingId =
    offeringId && swapListings.some((l) => l.id === offeringId)
      ? offeringId
      : (swapListings[0]?.id ?? "");
  const offering = swapListings.find((l) => l.id === effectiveOfferingId);

  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const problem =
    swapSeats > 0 && !allowsSwap
      ? "This listing doesn't take swaps."
      : swapSeats > 0 && swapListings.length === 0
        ? myListings.length === 0
          ? "You need an upcoming formal to swap."
          : "Not enough free seats at your formal."
        : cashSeats > 0 && !allowsPay
          ? "This listing doesn't take cash."
          : yourCredits > balance
            ? `Needs ${yourCredits} credits. You have ${balance}.`
            : null;
  const ready = credits !== undefined && problem === null;

  async function handleSubmit() {
    if (!ready || submitting) return;
    setError(null);
    setSubmitting(true);
    const you = plan[0];
    try {
      const result = await sendRequest({
        requestType: you.method,
        targetListingId: target.id,
        ...(swapSeats > 0 ? { offeringListingId: effectiveOfferingId } : {}),
        message,
        targetOwnerUserId: target.ownerUserId,
        ...(guests > 0
          ? {
              guests,
              guestMethods: plan.filter((p) => p.kind === "guest").map((p) => p.method),
            }
          : {}),
        ...(friendIds.length > 0
          ? {
              friends: plan
                .filter((p) => p.kind === "friend")
                .map((p) => ({
                  userId: p.userId!,
                  paysOwn: p.payer === "them",
                  method: p.method,
                })),
            }
          : {}),
        ...(newPeople > 0
          ? {
              links: plan
                .filter((p) => p.kind === "link")
                .map((p) => ({ paysOwn: p.payer === "them", method: p.method })),
            }
          : {}),
      });
      if (!result) throw new Error("Could not send request.");
      onSent({ accepted: result.status === "accepted", links: result.links ?? [] });
    } catch (err) {
      setError(errorMessage(err, "Could not send request."));
    } finally {
      setSubmitting(false);
    }
  }

  const cash = target.price !== undefined ? formatPrice(target.price) : "cash";
  function choicesFor(seat: PlanSeat): Choice[] {
    const other = seat.kind === "friend" || seat.kind === "link";
    const out: Choice[] = [];
    if (allowsSwap) {
      out.push({
        payer: "you",
        method: "swap",
        label: other ? "You cover: swap a seat" : "Swap a seat",
      });
    }
    out.push({
      payer: "you",
      method: "credit",
      label: other ? "You cover: 1 credit" : "1 of your credits",
    });
    if (allowsPay) {
      out.push({ payer: "you", method: "pay", label: other ? `You cover: ${cash}` : cash });
    }
    if (seat.kind === "friend") {
      out.push({ payer: "them", method: "credit", label: "They pay: 1 credit" });
      if (allowsPay) out.push({ payer: "them", method: "pay", label: `They pay: ${cash}` });
    }
    if (seat.kind === "link") {
      out.push({ payer: "them", method: "credit", label: "They pay: their 1 credit" });
    }
    return out;
  }
  const choiceLabel = (seat: PlanSeat) =>
    choicesFor(seat).find((c) => c.payer === seat.payer && c.method === seat.method)?.label ??
    "Choose";

  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const summary = [
    count(seats, "seat"),
    swapSeats > 0 ? count(swapSeats, "swap seat") : null,
    creditSeats > 0 ? count(creditSeats, "credit") : null,
    cashSeats > 0 && target.price !== undefined ? formatPrice(target.price * cashSeats) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const border = { borderColor: colors.inkSoft };

  return (
    <OxModal visible onClose={onClose} title={`Request a seat at ${target.college}`}>
      <OxText style={[styles.sub, { color: colors.inkMuted }]}>
        {formatListingDate(target.dateTime)} · {count(target.seatsAvailable, "seat")} left
      </OxText>

      {maxExtra > 0 ? (
        <View style={[styles.box, border, { backgroundColor: colors.paper }]}>
          <OxText style={[styles.boxTitle, { color: colors.ink }]}>Who&apos;s coming?</OxText>
          <OxText style={[styles.hint, { color: colors.inkMuted }]}>
            {extra === 0
              ? "Just you"
              : `You + ${extra} · ${seats} seats${extra >= maxExtra ? " (max)" : ""}`}
          </OxText>

          {friendsList && friendsList.length > 0 ? (
            <View style={styles.friends}>
              {friendsList.map((f) => {
                const on = friendIds.includes(f._id);
                const disabled = !on && extra >= maxExtra;
                return (
                  <Pressable
                    key={f._id}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled }}
                    onPress={() =>
                      changePeople(() =>
                        setFriendIds((ids) =>
                          on ? ids.filter((x) => x !== f._id) : [...ids, f._id],
                        ),
                      )
                    }
                    style={[
                      styles.friend,
                      {
                        borderColor: on ? colors.ink : colors.inkSoft,
                        backgroundColor: on ? colors.accent : "transparent",
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Avatar avatar={f.avatar} name={f.name ?? "Friend"} size={22} />
                    <OxText
                      style={[styles.friendName, { color: on ? colors.accentInk : colors.ink }]}
                    >
                      {f.name?.split(" ")[0] ?? "Friend"}
                    </OxText>
                  </Pressable>
                );
              })}
            </View>
          ) : friendsList ? (
            <OxText style={[styles.hint, { color: colors.inkMuted, marginTop: 8 }]}>
              Mutual follows show up here.
            </OxText>
          ) : null}

          <Stepper
            label="Unnamed guests"
            value={guests}
            canAdd={extra < maxExtra}
            onChange={(n) => changePeople(() => setGuests(n))}
          />
          <Stepper
            label="Someone not on here yet"
            value={newPeople}
            canAdd={extra < maxExtra}
            onChange={(n) => changePeople(() => setNewPeople(n))}
          />
        </View>
      ) : null}

      {!editingPlan ? (
        <View style={styles.methods} accessibilityRole="radiogroup">
          <OxText style={[styles.label, { color: colors.inkMuted }]}>
            {coveredSeats > 1 || friendIds.length > 0
              ? `How do you want to pay for ${coveredSeats === 1 ? "your seat" : `your ${coveredSeats} seats`}?`
              : "How do you want to pay?"}
          </OxText>
          {allowsSwap ? (
            <MethodOption
              selected={baseMethod === "swap"}
              disabled={!canSwapBase}
              onSelect={() => setPicked("swap")}
              title="Swap"
              detail={
                canSwapBase
                  ? coveredSeats === 1
                    ? "Trade them a seat at your formal"
                    : `Trade them ${coveredSeats} seats at your formal`
                  : myListings.length > 0
                    ? `Needs ${coveredSeats} free seats at your formal`
                    : "Needs a listing of your own"
              }
              actionLabel={
                canSwapBase || myListings.length > 0 ? undefined : "List your formal"
              }
              onAction={onListFormal}
            />
          ) : null}
          <MethodOption
            selected={baseMethod === "credit"}
            disabled={!canCreditBase}
            onSelect={() => setPicked("credit")}
            title="Credit"
            detail={
              credits === undefined
                ? "Checking your credits…"
                : canCreditBase
                  ? `Spend ${count(coveredSeats, "credit")} · you have ${balance}`
                  : balance === 0
                    ? "Host a guest to earn one"
                    : `Needs ${coveredSeats} credits · you have ${balance}`
            }
          />
          {allowsPay ? (
            <MethodOption
              selected={baseMethod === "pay"}
              onSelect={() => setPicked("pay")}
              title={
                target.price !== undefined
                  ? `Pay ${formatPrice(target.price * coveredSeats)}`
                  : "Pay"
              }
              detail={
                coveredSeats > 1 && target.price !== undefined
                  ? `${formatPrice(target.price)} × ${coveredSeats}, paid to the host`
                  : "Paid to the host"
              }
            />
          ) : null}
          {friendIds.length > 0 ? (
            <OxText style={[styles.hint, { color: colors.inkMuted }]}>
              {friendIds.length === 1
                ? `${friendName(friendIds[0])} pays their own credit.`
                : "Friends pay their own credits."}
            </OxText>
          ) : null}
          {newPeople > 0 ? (
            <OxText style={[styles.hint, { color: colors.inkMuted }]}>
              You&apos;ll get a link to send them.
            </OxText>
          ) : null}
        </View>
      ) : (
        <View style={styles.methods}>
          <OxText style={[styles.label, { color: colors.inkMuted }]}>
            Who pays for each seat?
          </OxText>
          {plan.map((seat, i) => (
            <Pressable
              key={seat.key}
              accessibilityRole="button"
              accessibilityLabel={`${seat.label}: ${choiceLabel(seat)}. Change`}
              onPress={() => {
                const choices = choicesFor(seat);
                pickFrom(
                  seat.kind === "you" ? "Your seat" : `${seat.label}'s seat`,
                  choices.map((c) => c.label),
                  (index) => {
                    const next = [...plan];
                    next[i] = { ...seat, payer: choices[index].payer, method: choices[index].method };
                    setCustomPlan(next);
                  },
                );
              }}
              style={[styles.seatRow, border, { backgroundColor: colors.paper }]}
            >
              <OxText numberOfLines={1} style={[styles.seatName, { color: colors.ink }]}>
                {seat.label}
              </OxText>
              <OxText numberOfLines={1} style={[styles.seatChoice, { color: colors.inkMuted }]}>
                {choiceLabel(seat)}
              </OxText>
              <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
            </Pressable>
          ))}
        </View>
      )}

      {seats > 1 ? (
        <View style={styles.summaryRow}>
          <OxText style={[styles.summary, { color: colors.ink }]}>{summary}</OxText>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => setCustomPlan(editingPlan ? null : plan)}
          >
            <OxText style={[styles.link, { color: colors.ink }]}>
              {editingPlan ? "Reset payment" : "Edit payment"}
            </OxText>
          </Pressable>
        </View>
      ) : null}

      {swapSeats > 0 && offering ? (
        <View style={styles.field}>
          <OxText style={[styles.label, { color: colors.inkMuted }]}>
            Your formal to offer
          </OxText>
          <Pressable
            accessibilityRole="button"
            disabled={swapListings.length < 2}
            onPress={() =>
              pickFrom(
                "Your formal to offer",
                swapListings.map((l) => `${l.college} · ${formatListingDate(l.dateTime)}`),
                (index) => {
                  setOfferingId(swapListings[index].id);
                  setError(null);
                },
              )
            }
            style={[styles.seatRow, border, { backgroundColor: colors.paper }]}
          >
            <OxText numberOfLines={1} style={[styles.seatName, { color: colors.ink }]}>
              {offering.college} · {formatListingDate(offering.dateTime)}
            </OxText>
            {swapListings.length > 1 ? (
              <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.field}>
        <OxText style={[styles.label, { color: colors.inkMuted }]}>Message (optional)</OxText>
        <OxInput
          value={message}
          onChangeText={setMessage}
          placeholder="Say hi!"
          multiline
          seed={41}
        />
      </View>

      {problem && editingPlan ? (
        <OxText style={[styles.error, { color: colors.danger }]}>{problem}</OxText>
      ) : null}
      {error ? <OxText style={[styles.error, { color: colors.danger }]}>{error}</OxText> : null}

      <OxButton
        title="Send request!"
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!ready}
      />
    </OxModal>
  );
}

function Stepper({
  label,
  value,
  canAdd,
  onChange,
}: {
  label: string;
  value: number;
  canAdd: boolean;
  onChange: (next: number) => void;
}) {
  const { colors } = useOxTheme();
  const button = (icon: "remove" | "add", enabled: boolean, next: number, a11y: string) => (
    <Pressable
      disabled={!enabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => onChange(next)}
      style={[styles.step, { borderColor: colors.ink, opacity: enabled ? 1 : 0.3 }]}
    >
      <Ionicons name={icon} size={18} color={colors.ink} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <OxText style={[styles.hint, { color: colors.inkMuted, flex: 1 }]}>{label}</OxText>
      {button("remove", value > 0, Math.max(0, value - 1), `One fewer: ${label}`)}
      <OxText style={[styles.stepValue, { color: colors.ink }]}>{value}</OxText>
      {button("add", canAdd, value + 1, `One more: ${label}`)}
    </View>
  );
}

function MethodOption({
  selected,
  disabled = false,
  onSelect,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useOxTheme();
  const on = selected && !disabled;
  return (
    <View
      style={[
        styles.method,
        {
          borderColor: on ? colors.ink : colors.inkSoft,
          backgroundColor: on ? colors.accent : colors.paper,
        },
      ]}
    >
      <Pressable
        disabled={disabled}
        onPress={onSelect}
        accessibilityRole="radio"
        accessibilityState={{ checked: on, disabled }}
        style={styles.methodMain}
      >
        <View style={[styles.radio, { borderColor: disabled ? colors.inkSoft : colors.ink }]}>
          {on ? <View style={[styles.radioDot, { backgroundColor: colors.ink }]} /> : null}
        </View>
        <View style={styles.methodText}>
          <OxText
            style={[
              styles.methodTitle,
              { color: on ? colors.accentInk : colors.ink, opacity: disabled ? 0.5 : 1 },
            ]}
          >
            {title}
          </OxText>
          <OxText style={[styles.hint, { color: on ? colors.accentInk : colors.inkMuted }]}>
            {detail}
          </OxText>
        </View>
      </Pressable>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <OxText style={[styles.link, { color: colors.ink }]}>{actionLabel}</OxText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 15, marginBottom: 14 },
  box: { borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 16 },
  boxTitle: { fontSize: 17 },
  hint: { fontSize: 13, lineHeight: 17 },
  friends: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  friend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
  },
  friendName: { fontSize: 15 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 17, width: 20, textAlign: "center" },
  methods: { gap: 8, marginBottom: 14 },
  label: { fontSize: 14, marginBottom: 2 },
  method: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  methodMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  methodText: { flex: 1 },
  methodTitle: { fontSize: 17 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  seatName: { fontSize: 16, flex: 1 },
  seatChoice: { fontSize: 14, flexShrink: 1 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  summary: { fontSize: 14, flexShrink: 1 },
  link: { fontSize: 14, textDecorationLine: "underline" },
  field: { gap: 4, marginBottom: 14 },
  error: { fontSize: 14, marginBottom: 10 },
});
