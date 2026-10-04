import { v } from "convex/values";
import { Resend as ResendAPI } from "resend";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { getReviewEligibility } from "./collegeReviewHelpers";
import { hasConfirmedAttendance } from "./formalAttendance";
import { emailNotificationsEnabled } from "./emailNotifications";
import { listingIsPast } from "./listingHelpers";
import { normalizeCollegeName } from "../lib/data/colleges";
import {
  EMAIL_SITE_URL,
  renderEmail,
  renderEmailText,
  type EmailContent,
} from "./emailTemplate";
import { notificationEmail } from "./notificationCopy";
import { loadView } from "./notifications";

function resolveRequestType(req: Doc<"requests">): "swap" | "pay" | "credit" {
  return (
    req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay")
  );
}

function siteUrl(): string {
  return EMAIL_SITE_URL;
}

const FROM = "Oxformals <team@oxformals.com>";

/** Formals happen in Oxford, so emails show Oxford time. */
const OXFORD_TIME_ZONE = "Europe/London";

/** `Thu 9 Oct` */
export function formatFormalDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** `Thu 9 Oct · 7:15pm`, or `· 7pm` on the hour. */
export function formatFormalWhen(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OXFORD_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  let hours = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minutes = parts.find((p) => p.type === "minute")?.value ?? "00";
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const time = minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
  return `${formatFormalDay(iso)} · ${time}`;
}

function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

function truncateMessage(message: string, maxLen = 200): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function firstNameOf(name: string | undefined, fallback: string): string {
  return name?.trim().split(/\s+/)[0] || fallback;
}

/** Send one templated email. Logs (never throws) on failure. */
async function sendEmail(
  label: string,
  to: string,
  subject: string,
  content: EmailContent,
): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.error(`${label}: AUTH_RESEND_KEY is not set`);
    return;
  }
  const { error } = await new ResendAPI(apiKey).emails.send({
    from: FROM,
    to: [to],
    subject,
    html: renderEmail(content),
    text: renderEmailText(content),
  });
  if (error) console.error(`${label}: Resend error`, error);
}

const newRequestEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    requesterName: v.string(),
    seats: v.number(),
    college: v.string(),
    when: v.string(),
    tag: v.string(),
    detail: v.string(),
    message: v.string(),
    reviewUrl: v.string(),
  }),
);

export type NewRequestEmailPayload = {
  requesterName: string;
  /** Seats asked for, the requester's included. */
  seats: number;
  college: string;
  when: string;
  tag: string;
  /** One line under the headline ("" for none). */
  detail: string;
  message: string;
  reviewUrl: string;
};

export const getNewRequestEmailPayload = internalQuery({
  args: { requestId: v.id("requests") },
  returns: newRequestEmailPayloadValidator,
  handler: async (ctx, args) => {
    const req = await ctx.db.get(args.requestId);
    if (!req || req.status !== "pending") {
      return null;
    }

    const toUser = await ctx.db.get(req.toUserId);
    const fromUser = await ctx.db.get(req.fromUserId);
    const targetListing = await ctx.db.get(req.targetListingId);
    if (!toUser?.email || !targetListing) {
      return null;
    }

    const requestType = resolveRequestType(req);
    let tag: string;
    let detail = "";
    if (requestType === "credit") {
      tag = "Credit";
      detail = "You earn a credit when they come.";
    } else if (requestType === "pay") {
      tag =
        targetListing.price !== undefined
          ? `Pay ${formatPrice(targetListing.price)}`
          : "Pay";
    } else {
      tag = "Swap";
      const offering = req.offeringListingId
        ? await ctx.db.get(req.offeringListingId)
        : null;
      if (offering) {
        detail = `In return: ${offering.college}, ${formatFormalWhen(offering.dateTime)}.`;
      }
    }

    const extraSeats = (req.party ?? []).filter((p) => p.response !== "out").length;

    return {
      toEmail: toUser.email.trim().toLowerCase(),
      subject: `New request for your ${targetListing.college} formal`,
      requesterName: firstNameOf(fromUser?.name, "Someone"),
      seats: extraSeats + 1,
      college: targetListing.college,
      when: formatFormalWhen(targetListing.dateTime),
      tag,
      detail,
      message: truncateMessage(req.message),
      reviewUrl: `${siteUrl()}/requests/${req.targetListingId}`,
    };
  },
});

export function newRequestEmail(p: NewRequestEmailPayload): EmailContent {
  return {
    eyebrow: "New request",
    heading:
      p.seats > 1
        ? `${p.requesterName} wants ${p.seats} seats at your formal`
        : `${p.requesterName} wants a seat at your formal`,
    body: p.detail || undefined,
    ticket: { college: p.college, when: p.when, tag: p.tag, quote: p.message },
    cta: { href: p.reviewUrl, label: "Review request" },
  };
}

export const sendNewRequestEmail = internalAction({
  args: { requestId: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: (NewRequestEmailPayload & { toEmail: string; subject: string }) | null =
      await ctx.runQuery(internal.emails.getNewRequestEmailPayload, {
        requestId: args.requestId,
      });
    if (!payload) {
      return null;
    }
    await sendEmail("sendNewRequestEmail", payload.toEmail, payload.subject, newRequestEmail(payload));
    return null;
  },
});

const newListingAlertEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    college: v.string(),
    when: v.string(),
    tag: v.string(),
    message: v.string(),
    browseUrl: v.string(),
  }),
);

export type NewListingAlertEmailPayload = {
  college: string;
  when: string;
  tag: string;
  message: string;
  browseUrl: string;
};

function resolveListingType(
  listing: Pick<Doc<"listings">, "listingType">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

function formatListingTypeTag(listing: Doc<"listings">): string {
  const listingType = resolveListingType(listing);
  if (listingType === "pay") {
    return listing.price !== undefined ? `Pay ${formatPrice(listing.price)}` : "Pay";
  }
  return listingType === "both" ? "Swap or pay" : "Swap";
}

function listingBrowseUrl(listingId: string): string {
  return `${siteUrl()}/?listing=${listingId}`;
}

export const getNewListingAlertEmailPayload = internalQuery({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: newListingAlertEmailPayloadValidator,
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      return null;
    }

    const subscription = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_userId_and_college", (q) =>
        q.eq("userId", args.userId).eq("college", listing.college),
      )
      .unique();
    if (!subscription) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user?.email?.trim() || !emailNotificationsEnabled(user)) {
      return null;
    }
    if (args.userId === listing.ownerUserId) {
      return null;
    }

    return {
      toEmail: user.email.trim().toLowerCase(),
      subject: `A seat just opened at ${listing.college}`,
      college: listing.college,
      when: formatFormalWhen(listing.dateTime),
      tag: formatListingTypeTag(listing),
      message: truncateMessage(listing.message),
      browseUrl: listingBrowseUrl(args.listingId),
    };
  },
});

export function newListingAlertEmail(p: NewListingAlertEmailPayload): EmailContent {
  return {
    eyebrow: "Wants to go",
    heading: `A seat just opened at ${p.college}`,
    ticket: { college: p.college, when: p.when, tag: p.tag, quote: p.message },
    cta: { href: p.browseUrl, label: "View formal" },
  };
}

export const sendNewListingAlertEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: (NewListingAlertEmailPayload & { toEmail: string; subject: string }) | null =
      await ctx.runQuery(internal.emails.getNewListingAlertEmailPayload, {
        listingId: args.listingId,
        userId: args.userId,
      });
    if (!payload) {
      return null;
    }
    await sendEmail(
      "sendNewListingAlertEmail",
      payload.toEmail,
      payload.subject,
      newListingAlertEmail(payload),
    );
    return null;
  },
});

function listingReviewUrl(listingId: string): string {
  return `${siteUrl()}/requests/${listingId}`;
}

const reviewReminderRecipientValidator = v.object({
  userId: v.id("users"),
  toEmail: v.string(),
});

const reviewReminderEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    college: v.string(),
    day: v.string(),
    reviewUrl: v.string(),
  }),
);

export type ReviewReminderEmailPayload = {
  college: string;
  day: string;
  reviewUrl: string;
};

async function isReviewReminderEligible(
  ctx: QueryCtx,
  listing: Doc<"listings">,
  userId: Id<"users">,
  nowMs: number,
): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user?.email?.trim() || !emailNotificationsEnabled(user)) {
    return false;
  }
  if (!listing.members.includes(userId)) {
    return false;
  }

  const home = normalizeCollegeName(user.college ?? "");
  const host = normalizeCollegeName(listing.college);
  if (home && host && home === host) {
    return false;
  }

  const confirmed = await hasConfirmedAttendance(ctx, listing._id, userId);
  const eligibility = getReviewEligibility(user, listing, userId, nowMs, {
    hasExistingReview: false,
    hasConfirmedAttendance: confirmed,
  });
  if (!eligibility.canReview) {
    return false;
  }

  return true;
}

export const getReviewReminderRecipients = internalQuery({
  args: { listingId: v.id("listings") },
  returns: v.array(reviewReminderRecipientValidator),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return [];
    }

    const nowMs = Date.now();
    if (!listingIsPast(listing.dateTime, nowMs)) {
      return [];
    }

    const recipients: { userId: Id<"users">; toEmail: string }[] = [];
    const seen = new Set<string>();

    for (const memberId of listing.members) {
      if (seen.has(memberId)) continue;
      seen.add(memberId);

      const eligible = await isReviewReminderEligible(
        ctx,
        listing,
        memberId,
        nowMs,
      );
      if (!eligible) continue;

      const user = await ctx.db.get(memberId);
      if (!user?.email?.trim()) continue;

      const existing = await ctx.db
        .query("collegeReviews")
        .withIndex("by_listingId_and_userId", (q) =>
          q.eq("listingId", listing._id).eq("userId", memberId),
        )
        .unique();
      if (existing) continue;

      recipients.push({
        userId: memberId,
        toEmail: user.email.trim().toLowerCase(),
      });
    }

    return recipients;
  },
});

export const getReviewReminderEmailPayload = internalQuery({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: reviewReminderEmailPayloadValidator,
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return null;
    }

    const nowMs = Date.now();
    const eligible = await isReviewReminderEligible(
      ctx,
      listing,
      args.userId,
      nowMs,
    );
    if (!eligible) {
      return null;
    }

    const existing = await ctx.db
      .query("collegeReviews")
      .withIndex("by_listingId_and_userId", (q) =>
        q.eq("listingId", listing._id).eq("userId", args.userId),
      )
      .unique();
    if (existing) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user?.email?.trim()) {
      return null;
    }

    return {
      toEmail: user.email.trim().toLowerCase(),
      subject: `How was ${listing.college}?`,
      college: listing.college,
      day: formatFormalDay(listing.dateTime),
      reviewUrl: listingReviewUrl(args.listingId),
    };
  },
});

export function reviewReminderEmail(p: ReviewReminderEmailPayload): EmailContent {
  return {
    eyebrow: "After dinner",
    heading: `How was ${p.college}?`,
    body: "Your review helps people pick their next formal.",
    ticket: { college: p.college, when: p.day },
    cta: { href: p.reviewUrl, label: "Rate formal" },
  };
}

export const notifyReviewReminderForListing = internalAction({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipients: { userId: Id<"users">; toEmail: string }[] =
      await ctx.runQuery(internal.emails.getReviewReminderRecipients, {
        listingId: args.listingId,
      });

    for (const recipient of recipients) {
      await ctx.scheduler.runAfter(0, internal.emails.sendReviewReminderEmail, {
        listingId: args.listingId,
        userId: recipient.userId,
      });
    }

    return null;
  },
});

export const sendReviewReminderEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: (ReviewReminderEmailPayload & { toEmail: string; subject: string }) | null =
      await ctx.runQuery(internal.emails.getReviewReminderEmailPayload, {
        listingId: args.listingId,
        userId: args.userId,
      });
    if (!payload) {
      return null;
    }
    await sendEmail(
      "sendReviewReminderEmail",
      payload.toEmail,
      payload.subject,
      reviewReminderEmail(payload),
    );
    return null;
  },
});

// ── Account deletion notices ────────────────────────────────────────────────

const accountDeletionNoticeValidator = v.object({
  kind: v.union(v.literal("hostLeft"), v.literal("guestLeft")),
  toEmail: v.string(),
  college: v.string(),
  dateTime: v.string(),
});

export type AccountDeletionNoticeCopy = {
  kind: "hostLeft" | "guestLeft";
  college: string;
  /** e.g. "Sat 12 Oct · 7pm" */
  when: string;
};

export function accountDeletionEmail({ kind, college, when }: AccountDeletionNoticeCopy): EmailContent {
  const ticket = { college, when };
  return kind === "hostLeft"
    ? {
        eyebrow: "Cancelled",
        heading: "Your formal was cancelled",
        body: "The host left Oxformals, so this formal is off.",
        ticket,
        cta: { href: `${siteUrl()}/?tab=browse`, label: "Find another formal" },
      }
    : {
        eyebrow: "Seat free",
        heading: "A seat is free at your formal",
        body: "A guest left Oxformals, so their seat is open again.",
        ticket,
        cta: { href: `${siteUrl()}/`, label: "See your formal" },
      };
}

export function buildAccountDeletionNoticeText(copy: AccountDeletionNoticeCopy): string {
  return renderEmailText(accountDeletionEmail(copy));
}

export const sendAccountDeletionNotices = internalAction({
  args: { notices: v.array(accountDeletionNoticeValidator) },
  returns: v.null(),
  handler: async (_ctx, { notices }) => {
    for (const notice of notices) {
      await sendEmail(
        "sendAccountDeletionNotices",
        notice.toEmail,
        notice.kind === "hostLeft"
          ? "Your formal was cancelled"
          : "A seat is free at your formal",
        accountDeletionEmail({
          kind: notice.kind,
          college: notice.college,
          when: formatFormalWhen(notice.dateTime),
        }),
      );
    }
    return null;
  },
});

// ── Bio reports ─────────────────────────────────────────────────────────────

export function bioReportEmail(p: { bioText: string; reportedUserId: string }): EmailContent {
  return {
    eyebrow: "Report",
    heading: "A bio was reported",
    body: `"${p.bioText}"`,
    cta: { href: `${siteUrl()}/profile/${p.reportedUserId}`, label: "View profile" },
    note: `To remove it: npx convex run --prod bio:clearBio '{"userId":"${p.reportedUserId}"}'`,
  };
}

export const sendBioReportEmail = internalAction({
  args: { reportedUserId: v.id("users"), bioText: v.string() },
  returns: v.null(),
  handler: async (_ctx, { reportedUserId, bioText }) => {
    await sendEmail(
      "sendBioReportEmail",
      "team@oxformals.com",
      "A bio was reported",
      bioReportEmail({ bioText, reportedUserId }),
    );
    return null;
  },
});

export const getReportDetails = internalQuery({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    const report = await ctx.db.get(reportId);
    if (!report) return null;
    const reporter = await ctx.db.get(report.reporterUserId);
    const reported = await ctx.db.get(report.reportedUserId);
    return {
      report,
      reporterName: reporter?.name ?? "Someone",
      reportedName: reported?.name ?? "Someone",
    };
  },
});

/** Tell the team about a report of a person, listing, comment or message. */
export const sendReportEmail = internalAction({
  args: { reportId: v.id("reports") },
  returns: v.null(),
  handler: async (ctx, { reportId }) => {
    const found = await ctx.runQuery(internal.emails.getReportDetails, { reportId });
    if (!found) return null;
    const { report, reporterName, reportedName } = found;
    const what = report.targetKey.split(":")[0];
    const lines = [
      `${reporterName} reported ${what === "user" ? reportedName : `a ${what} by ${reportedName}`} for ${report.reason}.`,
      report.snapshot ? `"${report.snapshot}"` : null,
      report.details ? `Their note: ${report.details}` : null,
    ].filter(Boolean);
    await sendEmail("sendReportEmail", "team@oxformals.com", `Report: ${what} (${report.reason})`, {
      eyebrow: "Report",
      heading: `A ${what === "user" ? "person" : what} was reported`,
      body: lines.join("\n\n"),
      cta: { href: `${siteUrl()}/profile/${report.reportedUserId}`, label: "View profile" },
      note: `Report ${reportId} · ${report.targetKey}`,
    });
    return null;
  },
});

// ── Formal changes (undone swaps, cancellations) ────────────────────────────

const formalNoticeValidator = v.object({
  userId: v.id("users"),
  subject: v.string(),
  body: v.string(),
  cta: v.union(v.literal("formals"), v.literal("browse"), v.literal("invites")),
  /** Small label above the headline; defaults by `cta`. */
  eyebrow: v.optional(v.string()),
  /** The formal to show as a ticket. */
  listingId: v.optional(v.id("listings")),
});

export const getNoticeEmails = internalQuery({
  args: { userIds: v.array(v.id("users")) },
  returns: v.array(
    v.object({ userId: v.id("users"), email: v.union(v.string(), v.null()) }),
  ),
  handler: async (ctx, { userIds }) => {
    const out = [];
    for (const userId of userIds) {
      const user = await ctx.db.get(userId);
      out.push({
        userId,
        email: user && !user.deletedAt && user.email ? user.email : null,
      });
    }
    return out;
  },
});

export const getNoticeFormals = internalQuery({
  args: { listingIds: v.array(v.id("listings")) },
  returns: v.array(
    v.object({ listingId: v.id("listings"), college: v.string(), dateTime: v.string() }),
  ),
  handler: async (ctx, { listingIds }) => {
    const out = [];
    for (const listingId of new Set(listingIds)) {
      const listing = await ctx.db.get(listingId);
      if (listing) out.push({ listingId, college: listing.college, dateTime: listing.dateTime });
    }
    return out;
  },
});

export type FormalNoticeEmailInput = {
  subject: string;
  body: string;
  cta: "formals" | "browse" | "invites";
  eyebrow?: string;
  formal?: { college: string; when: string };
};

export function formalNoticeEmail(n: FormalNoticeEmailInput): EmailContent {
  const home = `${siteUrl()}/`;
  const buttons: Pick<EmailContent, "cta" | "secondary"> =
    n.cta === "invites"
      ? { cta: { href: home, label: "I'm in" }, secondary: { href: home, label: "Not me" } }
      : n.cta === "browse"
        ? { cta: { href: `${siteUrl()}/?tab=browse`, label: "Find another formal" } }
        : { cta: { href: `${siteUrl()}/`, label: "See your formals" } };
  return {
    eyebrow:
      n.eyebrow ?? (n.cta === "invites" ? "Group invite" : n.cta === "browse" ? "Change of plans" : "Your formal"),
    heading: n.subject,
    body: n.body,
    ticket: n.formal,
    ...buttons,
  };
}

/** Transactional: sent whatever the user's notification setting. */
export const sendFormalNotices = internalAction({
  args: { notices: v.array(formalNoticeValidator) },
  returns: v.null(),
  handler: async (ctx, { notices }) => {
    const emails: Array<{ userId: Id<"users">; email: string | null }> =
      await ctx.runQuery(internal.emails.getNoticeEmails, {
        userIds: notices.map((n) => n.userId),
      });
    const byId = new Map(emails.map((e) => [e.userId, e.email]));
    const listingIds = notices.flatMap((n) => (n.listingId ? [n.listingId] : []));
    const formals: Array<{ listingId: Id<"listings">; college: string; dateTime: string }> =
      listingIds.length > 0
        ? await ctx.runQuery(internal.emails.getNoticeFormals, { listingIds })
        : [];
    const formalById = new Map(formals.map((f) => [f.listingId, f]));
    for (const notice of notices) {
      const to = byId.get(notice.userId);
      if (!to) continue;
      const formal = notice.listingId ? formalById.get(notice.listingId) : undefined;
      await sendEmail(
        "sendFormalNotices",
        to,
        notice.subject,
        formalNoticeEmail({
          ...notice,
          formal: formal
            ? { college: formal.college, when: formatFormalWhen(formal.dateTime) }
            : undefined,
        }),
      );
    }
    return null;
  },
});

export const getSwapBreakNames = internalQuery({
  args: { brokenByUserId: v.id("users"), wrongedUserId: v.id("users") },
  returns: v.object({ brokenBy: v.string(), wronged: v.string() }),
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.brokenByUserId);
    const b = await ctx.db.get(args.wrongedUserId);
    return {
      brokenBy: `${a?.name ?? "Unknown"} <${a?.email ?? "?"}>`,
      wronged: `${b?.name ?? "Unknown"} <${b?.email ?? "?"}>`,
    };
  },
});

export const sendSwapBreakReport = internalAction({
  args: {
    requestId: v.id("requests"),
    brokenByUserId: v.id("users"),
    wrongedUserId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const names: { brokenBy: string; wronged: string } = await ctx.runQuery(
      internal.emails.getSwapBreakNames,
      {
        brokenByUserId: args.brokenByUserId,
        wrongedUserId: args.wrongedUserId,
      },
    );
    await sendEmail(
      "sendSwapBreakReport",
      "team@oxformals.com",
      "A swap was broken",
      swapBreakEmail({ ...names, requestId: args.requestId, brokenByUserId: args.brokenByUserId }),
    );
    return null;
  },
});

export function swapBreakEmail(p: {
  brokenBy: string;
  wronged: string;
  requestId: string;
  brokenByUserId: string;
}): EmailContent {
  return {
    eyebrow: "Report",
    heading: "A swap was broken",
    body: `${p.brokenBy} broke a swap with ${p.wronged} after already going to ${p.wronged.split(" <")[0]}'s formal. Their seat couldn't be taken back.`,
    cta: { href: `${siteUrl()}/profile/${p.brokenByUserId}`, label: "View profile" },
    note: `Request ${p.requestId}`,
  };
}

// ── Credit disputes ─────────────────────────────────────────────────────────

export const getCreditDisputeDetails = internalQuery({
  args: { listingId: v.id("listings"), reporterId: v.id("users") },
  returns: v.object({ reporter: v.string(), host: v.string(), formal: v.string() }),
  handler: async (ctx, { listingId, reporterId }) => {
    const listing = await ctx.db.get(listingId);
    const reporter = await ctx.db.get(reporterId);
    const host = listing ? await ctx.db.get(listing.ownerUserId) : null;
    return {
      reporter: `${reporter?.name ?? "Unknown"} <${reporter?.email ?? "?"}>`,
      host: `${host?.name ?? "Unknown"} <${host?.email ?? "?"}>`,
      formal: listing
        ? `${listing.college} · ${formatFormalWhen(listing.dateTime)}`
        : "a deleted listing",
    };
  },
});

export const sendCreditDisputeEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    reporterId: v.id("users"),
    credits: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const d: { reporter: string; host: string; formal: string } =
      await ctx.runQuery(internal.emails.getCreditDisputeDetails, {
        listingId: args.listingId,
        reporterId: args.reporterId,
      });
    await sendEmail(
      "sendCreditDisputeEmail",
      "team@oxformals.com",
      "A formal was reported as not happening",
      creditDisputeEmail({ ...d, credits: args.credits, listingId: args.listingId }),
    );
    return null;
  },
});

export function creditDisputeEmail(p: {
  reporter: string;
  host: string;
  formal: string;
  credits: number;
  listingId: string;
}): EmailContent {
  return {
    eyebrow: "Credit dispute",
    heading: "A formal was reported as not happening",
    body: `${p.reporter} says ${p.formal} (hosted by ${p.host}) didn't happen, and paid ${p.credits} credit${p.credits === 1 ? "" : "s"} for it. The payout is on hold.`,
    cta: { href: listingBrowseUrl(p.listingId), label: "View listing" },
    note: `Settle each hold: npx convex run --prod credits:resolveDispute '{"holdId":"…","outcome":"refund"}' (or "payHost"). Listing ${p.listingId}.`,
  };
}

// ── Bell notifications that email (see EMAIL_NOTICE_KINDS) ─────────────────

const linkValidator = v.object({ label: v.string(), path: v.string() });

const notificationEmailValidator = v.object({
  to: v.string(),
  subject: v.string(),
  eyebrow: v.string(),
  heading: v.string(),
  body: v.optional(v.string()),
  ticket: v.optional(
    v.object({ college: v.string(), when: v.string(), tag: v.optional(v.string()) }),
  ),
  cta: linkValidator,
  secondary: v.optional(linkValidator),
});

type NotificationEmail = {
  to: string;
  subject: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ticket?: { college: string; when: string; tag?: string };
  cta: { label: string; path: string };
  secondary?: { label: string; path: string };
};

export const getNotificationEmail = internalQuery({
  args: { notificationId: v.id("notifications") },
  returns: v.union(v.null(), notificationEmailValidator),
  handler: async (ctx, { notificationId }) => {
    const n = await ctx.db.get(notificationId);
    if (!n) return null;
    const user = await ctx.db.get(n.userId);
    if (!user || user.deletedAt !== undefined || !user.email?.trim()) return null;
    const copy = notificationEmail(await loadView(ctx, n));
    if (!copy) return null;
    return { to: user.email.trim().toLowerCase(), ...copy };
  },
});

/** Sent by `deliver` only when the recipient's email pref allows it. */
export const sendNotificationEmail = internalAction({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, { notificationId }) => {
    const email: NotificationEmail | null = await ctx.runQuery(
      internal.emails.getNotificationEmail,
      { notificationId },
    );
    if (!email) return null;
    await sendEmail("sendNotificationEmail", email.to, email.subject, {
      title: email.subject,
      eyebrow: email.eyebrow,
      heading: email.heading,
      ...(email.body ? { body: email.body } : {}),
      ...(email.ticket ? { ticket: email.ticket } : {}),
      cta: { href: `${siteUrl()}${email.cta.path}`, label: email.cta.label },
      ...(email.secondary
        ? { secondary: { href: `${siteUrl()}${email.secondary.path}`, label: email.secondary.label } }
        : {}),
    });
    return null;
  },
});
