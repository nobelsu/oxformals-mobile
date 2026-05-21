import { readJSON, remove, writeJSON } from "./storage";
import { userStore } from "./userStore";
import type { Session, SignInResult, SignupInput, User } from "./types";

const SESSION_KEY = "formalpal.session";

// A tiny interface so we can swap this out for Supabase/etc. later by
// replacing only this file's exported `authClient`.
export interface AuthClient {
  requestCode(email: string): Promise<SignInResult>;
  verifyCode(email: string, code: string): Promise<void>;
  completeSignup(input: SignupInput): Promise<User>;
  getSession(): { session: Session | null; user: User | null };
  signOut(): void;
}

function makeToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function writeSession(user: User): Session {
  const session: Session = {
    userId: user.id,
    token: makeToken(),
    issuedAt: Date.now(),
  };
  writeJSON(SESSION_KEY, session);
  return session;
}

const localAuthClient: AuthClient = {
  async requestCode(email) {
    // Simulated OTP send: no mail (Convex + Resend replace this in the app).
    const existing = userStore.findByEmail(email);
    if (existing) {
      writeSession(existing);
    }
    return { status: "code-sent", email: email.trim().toLowerCase() };
  },

  async verifyCode() {
    // No-op for local stub; real verification happens via Convex Auth in production.
  },

  async completeSignup(input) {
    const user = userStore.upsert(input);
    writeSession(user);
    return user;
  },

  getSession() {
    const session = readJSON<Session | null>(SESSION_KEY, null);
    if (!session) return { session: null, user: null };
    const user = userStore.list().find((u) => u.id === session.userId) ?? null;
    if (!user) {
      remove(SESSION_KEY);
      return { session: null, user: null };
    }
    return { session, user };
  },

  signOut() {
    remove(SESSION_KEY);
  },
};

export const authClient: AuthClient = localAuthClient;
