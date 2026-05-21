import { Email } from "@convex-dev/auth/providers/Email";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";
import { buildOtpEmailHtml, buildOtpEmailText } from "./ResendOTP";

const ADMIN_EMAIL = "admin@ox.ac.uk";
const ADMIN_CODE_RECIPIENT = "nobel@suhendra.com";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const emailProvider = Email({
  sendVerificationRequest: async ({ identifier: email, token }) => {
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail !== ADMIN_EMAIL) {
      throw new Error("Unauthorized");
    }

    const apiKey = process.env.AUTH_RESEND_KEY;
    if (!apiKey) {
      throw new Error("AUTH_RESEND_KEY is not set");
    }

    const expiresInMinutes = 10;
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from: "Oxformals <team@oxformals.com>",
      to: [ADMIN_CODE_RECIPIENT],
      subject: "Your Oxformals admin sign-in code",
      html: buildOtpEmailHtml({ token, expiresInMinutes }),
      text: buildOtpEmailText({ token, expiresInMinutes }),
    });

    if (error) {
      throw new Error(JSON.stringify(error));
    }
  },
});

export const AdminEmail = {
  ...emailProvider,
  id: "admin-email",
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
