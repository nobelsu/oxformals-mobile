import type { NotificationData, NotificationKind } from "./notificationKinds";

/**
 * The words for every notification, in one place: the bell row (segments,
 * with names and colleges in bold), the push (title + body), and — for the
 * kinds that email — the email copy. Pure, so the client can import it too.
 */

/** Your formals live in the feed now. */
export const FORMALS_URL = "/";
export const BROWSE_URL = "/?tab=browse";

export type NotificationView = {
  kind: NotificationKind;
  /** First name of whoever caused it; null when nobody did (payouts, reminders). */
  actorName: string | null;
  actorId?: string;
  listingId?: string;
  requestId?: string;
  data: NotificationData;
};

export type Segment = { text: string; bold?: boolean };

export type RenderedNotification = {
  segments: Segment[];
  /** Push title. */
  title: string;
  /** Push body: the segments as plain text. */
  body: string;
  /** Where tapping it goes: a path on the web app. */
  url: string;
};

const b = (text: string): Segment => ({ text, bold: true });
const t = (text: string): Segment => ({ text });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Thu 15 Oct", in Oxford time. */
export function formalDay(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(d);
}

/** "7:30pm", or "7pm" on the hour, in Oxford time (as in emails). */
export function formalTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = parts.find((p) => p.type === "minute")?.value ?? "00";
  const suffix = hour >= 12 ? "pm" : "am";
  const h = hour % 12 || 12;
  return minutes === "00" ? `${h}${suffix}` : `${h}:${minutes}${suffix}`;
}

/** "Thu 15 Oct · 7:30pm", in Oxford time. */
export function formalWhen(iso: string | undefined): string {
  const day = formalDay(iso);
  if (!day || !iso) return day;
  return `${day} · ${formalTime(iso)}`;
}

export function renderNotification(n: NotificationView): RenderedNotification {
  const who = n.actorName ?? "Someone";
  const college = n.data.college ?? "a formal";
  const day = formalDay(n.data.dateTime);
  const count = n.data.count ?? 1;
  const profileUrl = n.actorId ? `/profile/${n.actorId}` : "/";

  let title: string;
  let segments: Segment[];
  let url: string;

  switch (n.kind) {
    case "request_received":
      title = "New request";
      segments = [
        b(who),
        t(count > 1 ? ` wants ${count} seats at your ` : " wants a seat at your "),
        b(college),
        t(" formal"),
      ];
      url = n.listingId ? `/requests/${n.listingId}` : FORMALS_URL;
      break;
    case "request_accepted":
      title = "You're going";
      segments = [b(who), t(" said yes. You're going to "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "request_declined":
      title = "Request not accepted";
      segments = [t("Your request for "), b(college), t(" wasn't accepted.")];
      url = BROWSE_URL;
      break;
    case "formal_cancelled":
      title = "Formal cancelled";
      segments = [b(who), t(" cancelled their "), b(college), t(" formal.")];
      url = BROWSE_URL;
      break;
    case "swap_undone":
      title = "Swap undone";
      segments = [
        t("Your swap with "),
        b(who),
        t(" fell through, so your "),
        b(college),
        t(" seat was released."),
      ];
      url = BROWSE_URL;
      break;
    case "party_invite":
      title = "You're invited";
      segments = [
        b(who),
        t(" added you to their group for "),
        b(college),
        ...(day ? [t(`, ${day}`)] : []),
      ];
      url = "/";
      break;
    case "party_response":
      title = n.data.response === "in" ? "They're in" : "Group change";
      segments =
        n.data.response === "in"
          ? [b(who), t(" is in for "), b(college), t(".")]
          : [b(who), t(" can't make "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "seat_link_claimed":
      title = "New in your group";
      segments = [b(who), t(" joined your group for "), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "new_follower":
      title = "New follower";
      segments = [b(who), t(" followed you.")];
      url = profileUrl;
      break;
    case "follow_request":
      title = "Follow request";
      segments = [b(who), t(" wants to follow you.")];
      url = "/?tab=mine";
      break;
    case "now_friends":
      title = "New friend";
      segments = [t("You and "), b(who), t(" are now friends.")];
      url = profileUrl;
      break;
    case "invite_joined":
      title = "Your invite worked";
      segments = [b(who), t(" joined from your invite.")];
      url = profileUrl;
      break;
    case "credit_earned":
      if (n.data.reason === "referral") {
        title = "Credit earned";
        segments = [t("You earned 1 credit. "), b(who), t(" went to their first formal.")];
      } else if (n.data.pending) {
        title = "Credit on the way";
        segments = [
          t(`You'll earn ${plural(count, "credit")} for hosting `),
          b(who),
          t(" at "),
          b(college),
          t("."),
        ];
      } else {
        title = "Credit earned";
        segments = [t(`You earned ${plural(count, "credit")}.`)];
      }
      url = FORMALS_URL;
      break;
    case "credit_paid_out":
      title = "Credits paid";
      segments = [t(`You earned ${plural(count, "credit")} for hosting at `), b(college), t(".")];
      url = FORMALS_URL;
      break;
    case "formal_tomorrow":
      title = "Tomorrow";
      segments = [
        b(college),
        t(n.data.dateTime ? ` is tomorrow at ${formalTime(n.data.dateTime)}.` : " is tomorrow."),
      ];
      url = FORMALS_URL;
      break;
    case "wishlist_listing":
      title = "New formal";
      segments = [b(who), t(" listed a formal at "), b(college), t(day ? `, ${day}.` : ".")];
      url = n.listingId ? `/?tab=browse&listing=${n.listingId}` : BROWSE_URL;
      break;
  }

  return { segments, title, body: segments.map((s) => s.text).join(""), url };
}

export type NotificationEmailCopy = {
  subject: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ticket?: { college: string; when: string; tag?: string };
  cta: { label: string; path: string };
  secondary?: { label: string; path: string };
};

/**
 * Kinds emailed on the shared template. `request_received` and
 * `wishlist_listing` email too, on their own existing templates.
 */
export const EMAIL_NOTICE_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>([
  "party_invite",
  "party_response",
  "formal_cancelled",
  "swap_undone",
  "request_accepted",
]);

export function notificationEmail(n: NotificationView): NotificationEmailCopy | null {
  if (!EMAIL_NOTICE_KINDS.has(n.kind)) return null;
  const who = n.actorName ?? "Someone";
  const college = n.data.college ?? "your formal";
  const ticket = n.data.college
    ? { college: n.data.college, when: formalWhen(n.data.dateTime) }
    : undefined;
  const formals = { label: "See your formals", path: FORMALS_URL };
  const browse = { label: "Find another formal", path: BROWSE_URL };

  switch (n.kind) {
    case "party_invite": {
      const tag = n.data.paysOwn
        ? n.data.method === "credit"
          ? "You pay 1 credit"
          : "You pay the host"
        : `${who} is covering you`;
      return {
        subject: `${who} wants to bring you to ${college}`,
        eyebrow: "Group invite",
        heading: `${who} added you to their group`,
        ...(ticket ? { ticket: { ...ticket, tag } } : {}),
        cta: { label: "I'm in", path: "/" },
        secondary: { label: "Not me", path: "/" },
      };
    }
    case "party_response":
      return n.data.response === "in"
        ? {
            subject: `${who} is in`,
            eyebrow: "Group update",
            heading: `${who} is in`,
            body: `${who} confirmed their seat at ${college}.`,
            ...(ticket ? { ticket } : {}),
            cta: formals,
          }
        : {
            subject: `${who} can't make it`,
            eyebrow: "Group update",
            heading: `${who} can't make it`,
            body: `${who} said "Not me". The rest of your request stands.`,
            ...(ticket ? { ticket } : {}),
            cta: formals,
          };
    case "formal_cancelled":
      return {
        subject: "Your formal has been cancelled",
        eyebrow: "Formal cancelled",
        heading: `${who} cancelled their formal`,
        body: `Your seat at ${college} is gone.`,
        ...(ticket ? { ticket } : {}),
        cta: browse,
      };
    case "swap_undone":
      return {
        subject: "Your swap was undone",
        eyebrow: "Swap undone",
        heading: `Your swap with ${who} fell through`,
        body: `Your seat at ${college} was released too. Swaps are all or nothing.`,
        ...(ticket ? { ticket } : {}),
        cta: browse,
      };
    case "request_accepted":
      return {
        subject: `You're going to ${college}`,
        eyebrow: "Request accepted",
        heading: `${who} said yes`,
        ...(ticket ? { ticket } : {}),
        cta: formals,
      };
    default:
      return null;
  }
}

/** "Now", "4m", "2h", "Yesterday", "3d", then "5 Oct". */
export function relativeTime(ms: number, nowMs: number): string {
  const minutes = Math.floor(Math.max(0, nowMs - ms) / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(ms));
}
