import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isOxfordEmail(email: string): boolean {
  return email.endsWith("@ox.ac.uk") || email.endsWith("@oxford.said.edu") || email.endsWith("@said.ox.ac.uk") || email.endsWith("@said.oxford.edu");
}

export function buildOtpEmailHtml({
  token,
  expiresInMinutes,
}: {
  token: string;
  expiresInMinutes: number;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Oxformals sign-in code</title>
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
                <p style="margin:0;font-size:16px;line-height:1.6;color:#1a140f;">Quick pit stop before the dance floor: your Oxformals magic code is here.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px 0 24px;">
                <div style="background:#edbfba;border:2px solid #1a140f;border-radius:14px;padding:16px 12px;text-align:center;">
                  <span style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:34px;font-weight:800;letter-spacing:0.35em;color:#1a140f;display:inline-block;padding-left:0.35em;">${token}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#5a4d40;">Pop this in within ${expiresInMinutes} minutes - it is single-use and then it vanishes.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 24px 0 24px;">
                <p style="margin:0;font-size:14px;line-height:1.6;color:#9a8c7a;">If you did not request this email, you can safely ignore it - no changes have been made to your account.</p>
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

export function buildOtpEmailText({
  token,
  expiresInMinutes,
}: {
  token: string;
  expiresInMinutes: number;
}): string {
  return `Quick pit stop before the dance floor:

Your Oxformals magic code is:

${token}

Pop this in within ${expiresInMinutes} minutes - it is single-use and then it vanishes.

If you did not request this email, you can safely ignore it - no changes have been made to your account.

For inquiries or issues, contact us at team@oxformals.com.

See you at dinner,
The Oxformals Team`;
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
