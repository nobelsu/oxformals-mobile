import type { SwapRequest } from "./types";

/** Seats a request asks for, not counting named friends who said "Not me". */
export function requestSeatCount(request: Pick<SwapRequest, "party">): number {
  return 1 + (request.party ?? []).filter((p) => p.response !== "out").length;
}

/** "+ 2 guests" / "+ Priya and 1 guest" style suffix; "" for a solo request. */
export function partySuffix(
  request: Pick<SwapRequest, "party">,
  nameOf: (userId: string) => string | undefined = () => undefined,
): string {
  const party = (request.party ?? []).filter((p) => p.response !== "out");
  if (party.length === 0) return "";
  const friends = party
    .filter((p) => p.kind === "friend" && p.userId)
    .map((p) => nameOf(p.userId!)?.split(" ")[0] ?? "a friend");
  const guests = party.filter((p) => p.kind === "guest").length;
  const invited = party.filter((p) => p.kind === "link").length;
  const parts = [
    ...friends,
    ...(guests > 0 ? [`${guests} guest${guests === 1 ? "" : "s"}`] : []),
    ...(invited > 0 ? [`${invited} invited`] : []),
  ];
  const joined =
    parts.length <= 1
      ? parts.join("")
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `+ ${joined}`;
}

/** "1 swap seat · 2 credits · £25" across every seat still in the request. */
export function paymentSummary(
  request: Pick<SwapRequest, "party" | "requestType">,
  price?: number,
): string {
  const methods = [
    request.requestType,
    ...(request.party ?? []).filter((p) => p.response !== "out").map((p) => p.method),
  ];
  const n = (m: string) => methods.filter((x) => x === m).length;
  return [
    n("swap") ? `${n("swap")} swap seat${n("swap") === 1 ? "" : "s"}` : null,
    n("credit") ? `${n("credit")} credit${n("credit") === 1 ? "" : "s"}` : null,
    n("pay") ? (price !== undefined ? `£${price * n("pay")}` : `${n("pay")} paid`) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Named friends paying their own way who haven't said "I'm in" yet. */
export function unconfirmedPayers(request: Pick<SwapRequest, "party">): string[] {
  return (request.party ?? [])
    .filter(
      (p) =>
        p.kind === "friend" &&
        p.userId &&
        p.payerId === p.userId &&
        p.response !== "in" &&
        p.response !== "out",
    )
    .map((p) => p.userId!);
}

/** People invited by link who haven't joined yet (the host can't accept until they do). */
export function unjoinedLinks(request: Pick<SwapRequest, "party">): number {
  return (request.party ?? []).filter((p) => p.kind === "link" && p.response !== "out").length;
}
