import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";
import { renderEmail, renderEmailText, type EmailContent } from "./emailTemplate";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isOxfordEmail(email: string): boolean {
  return email.endsWith("@ox.ac.uk") || email.endsWith("@oxford.said.edu") || email.endsWith("@said.ox.ac.uk") || email.endsWith("@said.oxford.edu") || email.endsWith("@stanford.edu") || email.endsWith(".stanford.edu");
}

export function otpEmail({
  token,
  expiresInMinutes,
}: {
  token: string;
  expiresInMinutes: number;
}): EmailContent {
  return {
    title: "Your Oxformals sign-in code",
    eyebrow: "Sign in",
    heading: "Your sign-in code",
    code: token,
    note: `Expires in ${expiresInMinutes} minutes. Didn't ask for it? Ignore this email.`,
  };
}

export function buildOtpEmailHtml(args: { token: string; expiresInMinutes: number }): string {
  return renderEmail(otpEmail(args));
}

export function buildOtpEmailText(args: { token: string; expiresInMinutes: number }): string {
  return renderEmailText(otpEmail(args));
}

/**
 * OTP via Resend. `Email()` defaults to id `"email"`; we override to `"resend"` so the
 * provider id matches Auth.js Resend / existing Convex deployments and the client
 * `signIn("resend", …)` call.
 * `generateVerificationToken` and `maxAge` must live on the exported object (not only
 * in `options`) so Convex Auth's sign-in implementation picks them up.
 */
const emailProvider = Email({
  sendVerificationRequest: async ({ identifier: email, token }) => {
    const normalizedEmail = normalizeEmail(email);
    if (!isOxfordEmail(normalizedEmail)) {
      throw new Error(
        "Only Oxford email addresses ending in @ox.ac.uk or @oxford.said.edu are allowed",
      );
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error("AUTH_RESEND_KEY is not set");
    }
    const expiresInMinutes = 10;
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [normalizedEmail],
      subject: "Your Oxformals sign-in code",
      html: buildOtpEmailHtml({ token, expiresInMinutes }),
      text: buildOtpEmailText({ token, expiresInMinutes }),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});

export const ResendOTP = {
  ...emailProvider,
  id: "resend",
  maxAge: 60 * 10, // 10 minutes (seconds)
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";
    const length = 6;
    return generateRandomString(random, alphabet, length);
  },
};
