import { Email } from "@convex-dev/auth/providers/Email";
import { getTestAuthEmail, getTestAuthOtp, normalizeTestEmail } from "./testAuth";

const emailProvider = Email({
  sendVerificationRequest: async ({ identifier: email }) => {
    const testEmail = getTestAuthEmail();
    if (!testEmail) {
      throw new Error("Test auth is not configured");
    }
    const normalizedEmail = normalizeTestEmail(email);
    if (normalizedEmail !== testEmail) {
      throw new Error("Unauthorized");
    }
    console.log(
      `[test-email] OTP for ${testEmail}: ${getTestAuthOtp()} (no email sent)`,
    );
  },
});

export const TestEmail = {
  ...emailProvider,
  id: "test-email",
  maxAge: 60 * 60 * 24, // 24 hours (seconds)
  async generateVerificationToken() {
    const otp = getTestAuthOtp();
    if (!otp) {
      throw new Error("Test auth is not configured");
    }
    return otp;
  },
};
