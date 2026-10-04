import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { AdminEmail } from "./AdminEmail";
import { ResendOTP } from "./ResendOTP";
import type { DataModel } from "./_generated/dataModel";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Password provider for optional password sign-in.
 *
 * Accounts are never created through this provider's public `signUp` flow —
 * doing so would bypass the Oxford-email + OTP gate. Passwords are attached to
 * an already-authenticated (OTP-verified) user via the `setPassword` action in
 * `convex/password.ts`, which calls `createAccount` directly. Only the
 * `signIn` flow is reachable from the client here.
 */
const PasswordProvider = Password<DataModel>({
  validatePasswordRequirements: (password) => {
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
  },
  profile(params) {
    if (params.flow === "signUp") {
      throw new Error("Password sign-up is disabled.");
    }
    return { email: params.email as string };
  },
});

const providers = [ResendOTP, AdminEmail, PasswordProvider];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
