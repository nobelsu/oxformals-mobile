import { v } from "convex/values";
import { Resend as ResendAPI } from "resend";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";

function resolveRequestType(req: Doc<"requests">): "swap" | "pay" {
  return (
    req.requestType ?? (req.offeringListingId !== undefined ? "swap" : "pay")
  );
}

const APP_BASE_URL = "https://oxformals.vercel.app";

function siteUrl(): string {
  return APP_BASE_URL;
}

function formatListingDate(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  const time =
    minutes === "00" ? `${hours}${suffix}` : `${hours}:${minutes}${suffix}`;
  return `${day} · ${time}`;
}

function formatPrice(gbp: number): string {
  return `£${gbp}`;
}

function truncateMessage(message: string, maxLen = 200): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const newRequestEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    requesterName: v.string(),
    requestTypeLabel: v.string(),
    formalLabel: v.string(),
    message: v.string(),
    reviewUrl: v.string(),
  }),
);

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
    const requesterName = fromUser?.name?.trim() || "Someone";
    const formalDate = formatListingDate(targetListing.dateTime);

    let requestTypeLabel: string;
    if (requestType === "pay") {
      requestTypeLabel =
        targetListing.price !== undefined
          ? `Pay request · ${formatPrice(targetListing.price)}`
          : "Pay request";
    } else if (req.offeringListingId) {
      const offering = await ctx.db.get(req.offeringListingId);
      requestTypeLabel = offering
        ? `Swap request · offering ${offering.college} · ${formatListingDate(offering.dateTime)}`
        : "Swap request";
    } else {
      requestTypeLabel = "Swap request";
    }

    const formalLabel = `${targetListing.college} · ${formalDate}`;
    const reviewUrl = `${siteUrl()}/requests/${req.targetListingId}`;

    return {
      toEmail: toUser.email.trim().toLowerCase(),
      subject: `New request for your ${targetListing.college} formal`,
      requesterName,
      requestTypeLabel,
      formalLabel,
      message: truncateMessage(req.message),
      reviewUrl,
    };
  },
});

function buildNewRequestEmailHtml(payload: {
  requesterName: string;
  requestTypeLabel: string;
  formalLabel: string;
  message: string;
  reviewUrl: string;
}): string {
  const messageBlock = payload.message
    ? `<p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#1a140f;font-style:italic;">&ldquo;${escapeHtml(payload.message)}&rdquo;</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New formal request</title>
  </head>
  <body style="margin:0;padding:0;background:#f2ead8;color:#1a140f;font-family:'Schoolbell','Comic Sans MS','Chalkboard SE','Marker Felt',cursive,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2ead8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#f6efe0;border:2px solid #1a140f;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 10px 24px;text-align:center;">
                <div style="font-size:34px;line-height:1.05;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">Oxformals</div>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#5a4d40;">Find your next formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1a140f;"><strong>${escapeHtml(payload.requesterName)}</strong> sent you a request for your formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#edbfba;border:2px solid #1a140f;border-radius:14px;padding:16px 14px;">
                  <p style="margin:0;font-size:14px;line-height:1.5;color:#5a4d40;">${escapeHtml(payload.requestTypeLabel)}</p>
                  <p style="margin:8px 0 0 0;font-size:18px;line-height:1.4;font-weight:800;color:#1a140f;">${escapeHtml(payload.formalLabel)}</p>
                  ${messageBlock}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;text-align:center;">
                <a href="${escapeHtml(payload.reviewUrl)}" style="display:inline-block;background:#1a140f;color:#f6efe0;font-size:15px;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;border:2px solid #1a140f;">Review request</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#9a8c7a;">You can accept or decline this request in Oxformals.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#5a4d40;">For inquiries or issues, contact us at <a href="mailto:team@oxformals.com" style="color:#1a140f;font-weight:700;text-decoration:underline;">team@oxformals.com</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1a140f;">See you at dinner,<br />The Oxformals Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildNewRequestEmailText(payload: {
  requesterName: string;
  requestTypeLabel: string;
  formalLabel: string;
  message: string;
  reviewUrl: string;
}): string {
  const messageLine = payload.message
    ? `\n\n"${payload.message}"`
    : "";

  return `${payload.requesterName} sent you a request for your formal.

${payload.requestTypeLabel}
${payload.formalLabel}${messageLine}

Review the request: ${payload.reviewUrl}

You can accept or decline this request in Oxformals.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

export const sendNewRequestEmail = internalAction({
  args: { requestId: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: {
      toEmail: string;
      subject: string;
      requesterName: string;
      requestTypeLabel: string;
      formalLabel: string;
      message: string;
      reviewUrl: string;
    } | null = await ctx.runQuery(internal.emails.getNewRequestEmailPayload, {
      requestId: args.requestId,
    });

    if (!payload) {
      return null;
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendNewRequestEmail: AUTH_RESEND_KEY is not set");
      return null;
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [payload.toEmail],
      subject: payload.subject,
      html: buildNewRequestEmailHtml(payload),
      text: buildNewRequestEmailText(payload),
    });

    if (error) {
      console.error("sendNewRequestEmail: Resend error", error);
    }

    return null;
  },
});

const listingAlertRecipientValidator = v.object({
  userId: v.id("users"),
  toEmail: v.string(),
});

const newListingAlertEmailPayloadValidator = v.union(
  v.null(),
  v.object({
    toEmail: v.string(),
    subject: v.string(),
    posterName: v.string(),
    listingTypeLabel: v.string(),
    formalLabel: v.string(),
    message: v.string(),
    browseUrl: v.string(),
  }),
);

function resolveListingType(
  listing: Pick<Doc<"listings">, "listingType">,
): "swap" | "pay" | "both" {
  return listing.listingType ?? "swap";
}

function formatListingTypeLabel(listing: Doc<"listings">): string {
  const listingType = resolveListingType(listing);
  if (listingType === "pay") {
    return listing.price !== undefined
      ? `Pay · ${formatPrice(listing.price)}`
      : "Pay";
  }
  if (listingType === "both") {
    const pricePart =
      listing.price !== undefined ? ` · ${formatPrice(listing.price)}` : "";
    return `Swap or pay${pricePart}`;
  }
  return "Swap";
}

function listingBrowseUrl(listingId: string): string {
  return `${siteUrl()}/?listing=${listingId}`;
}

export const getNewListingAlertRecipients = internalQuery({
  args: { listingId: v.id("listings") },
  returns: v.array(listingAlertRecipientValidator),
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") {
      return [];
    }

    const rows = await ctx.db
      .query("collegeWishlists")
      .withIndex("by_college", (q) => q.eq("college", listing.college))
      .collect();

    const recipients: { userId: Doc<"users">["_id"]; toEmail: string }[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (row.userId === listing.ownerUserId) continue;
      if (seen.has(row.userId)) continue;

      const user = await ctx.db.get(row.userId);
      if (!user?.email?.trim()) continue;
      if (user.emailWishlistAlerts === false) continue;

      seen.add(row.userId);
      recipients.push({
        userId: row.userId,
        toEmail: user.email.trim().toLowerCase(),
      });
    }

    return recipients;
  },
});

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
    if (!user?.email?.trim() || user.emailWishlistAlerts === false) {
      return null;
    }
    if (args.userId === listing.ownerUserId) {
      return null;
    }

    const owner = await ctx.db.get(listing.ownerUserId);
    const posterName = owner?.name?.trim() || "Someone";
    const formalLabel = `${listing.college} · ${formatListingDate(listing.dateTime)}`;

    return {
      toEmail: user.email.trim().toLowerCase(),
      subject: `New ${listing.college} formal on Oxformals`,
      posterName,
      listingTypeLabel: formatListingTypeLabel(listing),
      formalLabel,
      message: truncateMessage(listing.message),
      browseUrl: listingBrowseUrl(args.listingId),
    };
  },
});

function buildNewListingAlertEmailHtml(payload: {
  posterName: string;
  listingTypeLabel: string;
  formalLabel: string;
  message: string;
  browseUrl: string;
}): string {
  const messageBlock = payload.message
    ? `<p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#1a140f;font-style:italic;">&ldquo;${escapeHtml(payload.message)}&rdquo;</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New formal listing</title>
  </head>
  <body style="margin:0;padding:0;background:#f2ead8;color:#1a140f;font-family:'Schoolbell','Comic Sans MS','Chalkboard SE','Marker Felt',cursive,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2ead8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#f6efe0;border:2px solid #1a140f;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 10px 24px;text-align:center;">
                <div style="font-size:34px;line-height:1.05;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">Oxformals</div>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:1.6;color:#5a4d40;">Find your next formal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 0 24px;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1a140f;"><strong>${escapeHtml(payload.posterName)}</strong> posted a new formal at a college on your wishlist.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#edbfba;border:2px solid #1a140f;border-radius:14px;padding:16px 14px;">
                  <p style="margin:0;font-size:14px;line-height:1.5;color:#5a4d40;">${escapeHtml(payload.listingTypeLabel)}</p>
                  <p style="margin:8px 0 0 0;font-size:18px;line-height:1.4;font-weight:800;color:#1a140f;">${escapeHtml(payload.formalLabel)}</p>
                  ${messageBlock}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 0 24px;text-align:center;">
                <a href="${escapeHtml(payload.browseUrl)}" style="display:inline-block;background:#1a140f;color:#f6efe0;font-size:15px;font-weight:800;text-decoration:none;padding:12px 24px;border-radius:999px;border:2px solid #1a140f;">View formal</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#9a8c7a;">You received this because ${escapeHtml(payload.formalLabel.split(" · ")[0] ?? "this college")} is on your wishlist. Turn off wishlist emails in Settings.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#5a4d40;">For inquiries or issues, contact us at <a href="mailto:team@oxformals.com" style="color:#1a140f;font-weight:700;text-decoration:underline;">team@oxformals.com</a>.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 28px 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#1a140f;">See you at dinner,<br />The Oxformals Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildNewListingAlertEmailText(payload: {
  posterName: string;
  listingTypeLabel: string;
  formalLabel: string;
  message: string;
  browseUrl: string;
}): string {
  const messageLine = payload.message ? `\n\n"${payload.message}"` : "";

  return `${payload.posterName} posted a new formal at a college on your wishlist.

${payload.listingTypeLabel}
${payload.formalLabel}${messageLine}

View the formal: ${payload.browseUrl}

You received this because this college is on your wishlist. Turn off wishlist emails in Settings.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
}

export const notifyWishlistForNewListing = internalAction({
  args: { listingId: v.id("listings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const recipients: { userId: Doc<"users">["_id"]; toEmail: string }[] =
      await ctx.runQuery(internal.emails.getNewListingAlertRecipients, {
        listingId: args.listingId,
      });

    for (const recipient of recipients) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendNewListingAlertEmail,
        {
          listingId: args.listingId,
          userId: recipient.userId,
        },
      );
    }

    return null;
  },
});

export const sendNewListingAlertEmail = internalAction({
  args: {
    listingId: v.id("listings"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload: {
      toEmail: string;
      subject: string;
      posterName: string;
      listingTypeLabel: string;
      formalLabel: string;
      message: string;
      browseUrl: string;
    } | null = await ctx.runQuery(internal.emails.getNewListingAlertEmailPayload, {
      listingId: args.listingId,
      userId: args.userId,
    });

    if (!payload) {
      return null;
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      console.error("sendNewListingAlertEmail: AUTH_RESEND_KEY is not set");
      return null;
    }

    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [payload.toEmail],
      subject: payload.subject,
      html: buildNewListingAlertEmailHtml(payload),
      text: buildNewListingAlertEmailText(payload),
    });

    if (error) {
      console.error("sendNewListingAlertEmail: Resend error", error);
    }

    return null;
  },
});
