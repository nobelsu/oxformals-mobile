export function normalizeTestEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getTestAuthEmail(): string | undefined {
  const email = process.env.AUTH_TEST_EMAIL;
  if (!email?.trim()) return undefined;
  return normalizeTestEmail(email);
}

export function getTestAuthOtp(): string | undefined {
  const otp = process.env.AUTH_TEST_OTP?.trim();
  if (!otp || !/^\d{6}$/.test(otp)) return undefined;
  return otp;
}

export function isTestAuthConfigured(): boolean {
  return getTestAuthEmail() !== undefined && getTestAuthOtp() !== undefined;
}
