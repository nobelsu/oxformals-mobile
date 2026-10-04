/**
 * The one template every Oxformals email uses: wordmark and squiggle on a
 * cream page, a white card with an eyebrow and headline, an optional formal
 * "ticket" (crest, college name, date, tag, quote) or sign-in code, buttons,
 * and a small footer. Pure string building, so it can be unit tested.
 *
 * Crests and college names are PNGs from public/email (see
 * scripts/email-assets), because email clients won't load our fonts or SVG.
 */
import { collegeToSlug } from "../lib/data/collegeSlug";
import { normalizeCollegeName } from "../lib/data/colleges";
import {
  EMAIL_COLLEGE_ASSETS,
  EMAIL_CREST,
  EMAIL_LOGO,
  EMAIL_NAME_HEIGHT,
  EMAIL_SQUIGGLE,
} from "./emailAssets";

export const EMAIL_SITE_URL = "https://oxformals.vercel.app";
export const TEAM_EMAIL = "team@oxformals.com";

/** The notifications section of the settings page. */
export function emailSettingsUrl(siteUrl = EMAIL_SITE_URL): string {
  return `${siteUrl}/settings?section=notifications`;
}

export type EmailLink = { href: string; label: string };

export type EmailTicket = {
  college: string;
  /** e.g. "Thu 9 Oct · 7:15pm" */
  when?: string;
  /** Short pill, e.g. "Swap", "Credit", "Swap or pay". */
  tag?: string;
  /** Shown in quotes, in italics. */
  quote?: string;
};

export type EmailContent = {
  /** The HTML <title>. Defaults to the heading. */
  title?: string;
  eyebrow: string;
  heading: string;
  body?: string;
  ticket?: EmailTicket;
  /** A sign-in code, shown in place of a ticket. */
  code?: string;
  cta?: EmailLink;
  secondary?: EmailLink;
  note?: string;
};

export type EmailRenderOptions = {
  /** Where the site (and its /email images) lives. */
  siteUrl?: string;
};

const INK = "#1b1a12";
const CREAM = "#f2ecdd";
const ACCENT = "#b8524c";
const MUTED = "#565039";
const FAINT = "#716b55";
const FONT =
  "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The generated crest/name images for a college, if we have them. */
export function collegeEmailAssets(
  college: string,
  siteUrl = EMAIL_SITE_URL,
): { crestUrl: string | null; name: { url: string; width: number } | null } {
  const slug = collegeToSlug(normalizeCollegeName(college));
  const assets = slug ? EMAIL_COLLEGE_ASSETS[slug] : undefined;
  if (!assets) return { crestUrl: null, name: null };
  return {
    crestUrl: assets.crest ? `${siteUrl}/email/crest/${slug}.png` : null,
    name: { url: `${siteUrl}/email/name/${slug}.png`, width: assets.nameWidth },
  };
}

function renderTicket(ticket: EmailTicket, siteUrl: string): string {
  const college = ticket.college.trim();
  const { crestUrl, name } = collegeEmailAssets(college, siteUrl);
  const crestCell = crestUrl
    ? `<td width="${EMAIL_CREST.width + 8}" valign="middle" style="padding-right:14px;"><img src="${escapeHtml(crestUrl)}" width="${EMAIL_CREST.width}" height="${EMAIL_CREST.height}" alt="" style="display:block;border:0;"></td>`
    : "";
  const nameBlock = name
    ? `<img src="${escapeHtml(name.url)}" width="${name.width}" height="${EMAIL_NAME_HEIGHT}" alt="${escapeHtml(college)}" style="display:block;border:0;">`
    : `<div style="font-size:18px;line-height:25px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${INK};">${escapeHtml(college)}</div>`;
  const when = ticket.when
    ? `<div style="margin-top:4px;font-size:14px;color:${MUTED};">${escapeHtml(ticket.when)}</div>`
    : "";
  const tag = ticket.tag
    ? `<span style="display:inline-block;background:${INK};color:${CREAM};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;white-space:nowrap;">${escapeHtml(ticket.tag)}</span>`
    : "";
  const columns = crestUrl ? 3 : 2;
  const quote = ticket.quote?.trim()
    ? `<tr><td colspan="${columns}" style="padding:12px 0 0;font-size:15px;line-height:1.5;font-style:italic;color:${MUTED};">&ldquo;${escapeHtml(ticket.quote.trim())}&rdquo;</td></tr>`
    : "";
  return `<tr><td style="padding:20px 28px 0;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${CREAM};border:2px solid ${INK};border-radius:16px;"><tr><td style="padding:16px 18px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
${crestCell}<td valign="middle">${nameBlock}${when}</td>
<td valign="middle" align="right">${tag}</td></tr>${quote}</table></td></tr></table></td></tr>`;
}

function renderCode(code: string): string {
  return `<tr><td style="padding:20px 28px 0;"><div style="background:${CREAM};border:2px solid ${INK};border-radius:16px;padding:18px;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:.3em;padding-left:.3em;color:${INK};">${escapeHtml(code)}</div></td></tr>`;
}

function renderButtons(cta?: EmailLink, secondary?: EmailLink): string {
  if (!cta && !secondary) return "";
  const primary = cta
    ? `<a href="${escapeHtml(cta.href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:999px;border:2px solid ${ACCENT};">${escapeHtml(cta.label)}</a>`
    : "";
  const second = secondary
    ? `<a href="${escapeHtml(secondary.href)}" style="display:inline-block;background:#ffffff;color:${INK};font-size:15px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:999px;border:2px solid ${INK};">${escapeHtml(secondary.label)}</a>`
    : "";
  return `<tr><td style="padding:22px 28px 0;text-align:center;">${primary}${primary && second ? "&nbsp;&nbsp;" : ""}${second}</td></tr>`;
}

export function renderEmail(content: EmailContent, options: EmailRenderOptions = {}): string {
  const siteUrl = options.siteUrl ?? EMAIL_SITE_URL;
  const title = content.title ?? content.heading;
  const body = content.body
    ? `<div style="margin-top:8px;font-size:15px;line-height:1.5;color:${MUTED};">${escapeHtml(content.body)}</div>`
    : "";
  const middle = content.code
    ? renderCode(content.code)
    : content.ticket
      ? renderTicket(content.ticket, siteUrl)
      : "";
  const note = content.note
    ? `<tr><td style="padding:16px 28px 0;text-align:center;font-size:13px;line-height:1.5;color:${FAINT};">${escapeHtml(content.note)}</td></tr>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};color:${INK};font-family:${FONT};">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${CREAM};padding:28px 12px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;">
<tr><td style="text-align:center;padding:0 0 20px;"><a href="${escapeHtml(siteUrl)}" style="text-decoration:none;"><img src="${escapeHtml(siteUrl)}/email/logo.png" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="Oxformals" style="display:inline-block;border:0;"></a><br><img src="${escapeHtml(siteUrl)}/email/squiggle.png" width="${EMAIL_SQUIGGLE.width}" height="${EMAIL_SQUIGGLE.height}" alt="" style="display:inline-block;border:0;margin-top:2px;"></td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;border:2px solid ${INK};border-radius:20px;">
<tr><td style="padding:26px 28px 0;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${ACCENT};">${escapeHtml(content.eyebrow)}</div><div style="margin-top:8px;font-size:23px;line-height:1.25;font-weight:700;color:${INK};">${escapeHtml(content.heading)}</div>${body}</td></tr>
${middle}${renderButtons(content.cta, content.secondary)}${note}<tr><td style="padding:28px 0 0;"></td></tr></table></td></tr>
<tr><td style="padding:18px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:${FAINT};">Oxformals &middot; <a href="${escapeHtml(emailSettingsUrl(siteUrl))}" style="color:${FAINT};">Email settings</a> &middot; <a href="mailto:${TEAM_EMAIL}" style="color:${FAINT};">${TEAM_EMAIL}</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** The plain-text part, with the same content in the same order. */
export function renderEmailText(content: EmailContent, options: EmailRenderOptions = {}): string {
  const siteUrl = options.siteUrl ?? EMAIL_SITE_URL;
  const blocks: string[] = [content.heading];
  if (content.body) blocks.push(content.body);
  if (content.code) blocks.push(content.code);
  if (content.ticket) {
    const t = content.ticket;
    const lines = [[t.college.trim(), t.when].filter(Boolean).join(" · ")];
    if (t.tag) lines.push(t.tag);
    if (t.quote?.trim()) lines.push(`"${t.quote.trim()}"`);
    blocks.push(lines.join("\n"));
  }
  const links = [content.cta, content.secondary]
    .filter((l): l is EmailLink => !!l)
    .map((l) => `${l.label}: ${l.href}`);
  if (links.length) blocks.push(links.join("\n"));
  if (content.note) blocks.push(content.note);
  blocks.push(`--\nOxformals · Email settings: ${emailSettingsUrl(siteUrl)} · ${TEAM_EMAIL}`);
  return blocks.join("\n\n");
}
