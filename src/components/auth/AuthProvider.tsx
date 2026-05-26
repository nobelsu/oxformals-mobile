import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { SignInResult, SignupInput, User } from "@/src/lib/auth/types";
import { isProfileComplete } from "@/src/lib/auth/profileComplete";
import { DEFAULT_UI_FONT } from "@/src/lib/uiFont";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

type Status = "hydrating" | "ready";
const ADMIN_EMAIL = "admin@ox.ac.uk";
const TEST_AUTH_EMAIL = process.env.EXPO_PUBLIC_AUTH_TEST_EMAIL?.trim().toLowerCase();

function mapDocToUser(doc: Doc<"users">): User {
  return {
    id: doc._id,
    email: doc.email ?? "",
    name: doc.name ?? "",
    college: doc.college ?? "",
    year: doc.year ?? "",
    role: doc.role ?? "",
    interests: doc.interests ?? [],
    instagramHandle: doc.instagramHandle ?? "",
    whatsappPhone: doc.whatsappPhone ?? "",
    dietaryRequirements: doc.dietaryRequirements ?? "",
    subject: doc.subject ?? "",
    uiFont: doc.uiFont ?? DEFAULT_UI_FONT,
    ...(doc.avatar ? { avatar: doc.avatar } : {}),
    agreedToRules: doc.agreedToRules ?? false,
    ...(doc.emailWishlistAlerts !== undefined
      ? { emailWishlistAlerts: doc.emailWishlistAlerts }
      : {}),
    ...(doc.pushChatAlerts !== undefined
      ? { pushChatAlerts: doc.pushChatAlerts }
      : {}),
  };
}

export type AuthContextValue = {
  status: Status;
  user: User | null;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  needsRulesAgreement: boolean;
  authEmail: string | null;
  requestCode: (email: string) => Promise<SignInResult>;
  verifyCode: (email: string, code: string) => Promise<void>;
  completeSignup: (input: SignupInput) => Promise<User>;
  signOut: () => Promise<void>;
  updateProfile: (
    patch: Partial<Omit<User, "id" | "email">>,
  ) => Promise<User | null>;
  agreeToRules: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated: jwtAuthenticated } =
    useConvexAuth();
  const { signIn: signInWithProvider, signOut: signOutAction } =
    useAuthActions();

  const convexUserDoc = useQuery(api.users.current);
  const completeOnboardingMut = useMutation(api.users.completeOnboarding);
  const patchProfileMut = useMutation(api.users.patchProfile);
  const agreeToRulesMut = useMutation(api.users.agreeToRules);

  const status: Status =
    authLoading || (jwtAuthenticated && convexUserDoc === undefined)
      ? "hydrating"
      : "ready";

  const needsOnboarding =
    status === "ready" &&
    jwtAuthenticated &&
    convexUserDoc != null &&
    !isProfileComplete(convexUserDoc);

  const isAuthenticated =
    jwtAuthenticated &&
    convexUserDoc != null &&
    isProfileComplete(convexUserDoc);

  const needsRulesAgreement =
    isAuthenticated && convexUserDoc?.agreedToRules !== true;

  const user: User | null =
    jwtAuthenticated && convexUserDoc && isProfileComplete(convexUserDoc)
      ? mapDocToUser(convexUserDoc)
      : null;

  const authEmail =
    jwtAuthenticated && convexUserDoc != null && convexUserDoc.email
      ? convexUserDoc.email
      : null;

  const requestCode = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      const normalizedEmail = trimmed.toLowerCase();
      const params = { email: trimmed };
      if (TEST_AUTH_EMAIL && normalizedEmail === TEST_AUTH_EMAIL) {
        await signInWithProvider("test-email", params);
        return { status: "code-sent" as const, email: normalizedEmail };
      }
      if (normalizedEmail === ADMIN_EMAIL) {
        await signInWithProvider("admin-email", params);
        return { status: "code-sent" as const, email: normalizedEmail };
      }
      await signInWithProvider("resend", params);
      return { status: "code-sent" as const, email: normalizedEmail };
    },
    [signInWithProvider],
  );

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      const trimmedEmail = email.trim();
      const normalizedEmail = trimmedEmail.toLowerCase();
      const params = { email: trimmedEmail, code: code.trim() };
      if (TEST_AUTH_EMAIL && normalizedEmail === TEST_AUTH_EMAIL) {
        await signInWithProvider("test-email", params);
        return;
      }
      if (normalizedEmail === ADMIN_EMAIL) {
        await signInWithProvider("admin-email", params);
        return;
      }
      await signInWithProvider("resend", params);
    },
    [signInWithProvider],
  );

  const completeSignup = useCallback(
    async (input: SignupInput) => {
      const userId = await completeOnboardingMut({
        name: input.name,
        college: input.college,
        year: input.year,
        role: input.role,
        interests: input.interests,
        instagramHandle: input.instagramHandle,
        whatsappPhone: input.whatsappPhone,
      });
      const email = (convexUserDoc?.email ?? input.email).trim();
      return {
        id: userId,
        email,
        name: input.name.trim(),
        college: input.college.trim(),
        year: input.year.trim(),
        role: input.role.trim(),
        interests: input.interests ?? [],
        instagramHandle: input.instagramHandle?.trim() ?? "",
        whatsappPhone: input.whatsappPhone?.trim() ?? "",
        dietaryRequirements: "",
        subject: "",
        uiFont: DEFAULT_UI_FONT,
        agreedToRules: false,
      } satisfies User;
    },
    [completeOnboardingMut, convexUserDoc?.email],
  );

  const signOut = useCallback(async () => {
    await signOutAction();
  }, [signOutAction]);

  const updateProfile = useCallback(
    async (
      patch: Partial<Omit<User, "id" | "email">>,
    ): Promise<User | null> => {
      if (status !== "ready" || !jwtAuthenticated || !user) return null;

      const payload: {
        name?: string;
        college?: string;
        year?: string;
        role?: string;
        interests?: string[];
        instagramHandle?: string;
        whatsappPhone?: string;
        dietaryRequirements?: string;
        subject?: string;
        uiFont?: User["uiFont"];
        avatar?: User["avatar"] | null;
        emailWishlistAlerts?: boolean;
      } = {};

      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.college !== undefined) payload.college = patch.college;
      if (patch.year !== undefined) payload.year = patch.year;
      if (patch.role !== undefined) payload.role = patch.role;
      if (patch.interests !== undefined) payload.interests = patch.interests;
      if (patch.instagramHandle !== undefined) {
        payload.instagramHandle = patch.instagramHandle;
      }
      if (patch.whatsappPhone !== undefined) {
        payload.whatsappPhone = patch.whatsappPhone;
      }
      if (patch.dietaryRequirements !== undefined) {
        payload.dietaryRequirements = patch.dietaryRequirements;
      }
      if (patch.subject !== undefined) payload.subject = patch.subject;
      if (patch.uiFont !== undefined) payload.uiFont = patch.uiFont;
      if (Object.prototype.hasOwnProperty.call(patch, "avatar")) {
        payload.avatar = patch.avatar ?? null;
      }
      if (patch.emailWishlistAlerts !== undefined) {
        payload.emailWishlistAlerts = patch.emailWishlistAlerts;
      }

      if (Object.keys(payload).length === 0) return user;

      try {
        await patchProfileMut(payload);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes("not authenticated")
        ) {
          return null;
        }
        throw error;
      }

      return {
        ...user,
        ...patch,
        interests: patch.interests ?? user.interests,
        uiFont: patch.uiFont ?? user.uiFont,
        avatar: Object.prototype.hasOwnProperty.call(patch, "avatar")
          ? patch.avatar
          : user.avatar,
        emailWishlistAlerts:
          patch.emailWishlistAlerts ?? user.emailWishlistAlerts,
      };
    },
    [status, jwtAuthenticated, user, patchProfileMut],
  );

  const agreeToRules = useCallback(async () => {
    await agreeToRulesMut();
  }, [agreeToRulesMut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated,
      needsOnboarding,
      needsRulesAgreement,
      authEmail,
      requestCode,
      verifyCode,
      completeSignup,
      signOut,
      updateProfile,
      agreeToRules,
    }),
    [
      status,
      user,
      isAuthenticated,
      needsOnboarding,
      needsRulesAgreement,
      authEmail,
      requestCode,
      verifyCode,
      completeSignup,
      signOut,
      updateProfile,
      agreeToRules,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
