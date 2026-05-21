import { convexAuth } from "@convex-dev/auth/server";
import { AdminEmail } from "./AdminEmail";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP, AdminEmail],
});
