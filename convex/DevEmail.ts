import { Email } from "@convex-dev/auth/providers/Email";

export const DEV_REGISTER_EMAIL = "register-test@ox.ac.uk";
export const DEV_REGISTER_CODE = "000000";

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function assertDevAuthEnabled(): void {
  if (process.env.DEV_AUTH_ENABLED !== "true") {
    throw new Error("Dev auth is not enabled on this deployment");
  }
}

const emailProvider = Email({
  sendVerificationRequest: async ({ identifier: email }) => {
    assertDevAuthEnabled();
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail !== DEV_REGISTER_EMAIL) {
      throw new Error("Unauthorized");
    }
    // No email sent — use fixed dev code on the client.
  },
});

export const DevEmail = {
  ...emailProvider,
  id: "dev-email",
  maxAge: 60 * 60 * 24, // 24 hours (seconds)
  async generateVerificationToken() {
    assertDevAuthEnabled();
    return DEV_REGISTER_CODE;
  },
};
