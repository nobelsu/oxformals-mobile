import { convexAuth } from "@convex-dev/auth/server";
import { AdminEmail } from "./AdminEmail";
import { ResendOTP } from "./ResendOTP";
import { TestEmail } from "./TestEmail";
import { isTestAuthConfigured } from "./testAuth";

const providers = [ResendOTP, AdminEmail];
if (process.env.NODE_ENV !== "production" && isTestAuthConfigured()) {
  providers.push(TestEmail);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
