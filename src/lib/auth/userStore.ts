import { readJSON, writeJSON } from "./storage";
import type { SignupInput, User } from "./types";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";

const USERS_KEY = "formalpal.users";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function hydrate(raw: Partial<User> & { id: string; email: string }): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name ?? "",
    college: raw.college ?? "",
    year: raw.year ?? "",
    role: raw.role ?? "",
    interests: Array.isArray(raw.interests) ? raw.interests : [],
    subject: raw.subject ?? "",
    uiFont: raw.uiFont ?? DEFAULT_UI_FONT,
    avatar: raw.avatar,
  };
}

function load(): User[] {
  const raw = readJSON<Array<Partial<User> & { id: string; email: string }>>(
    USERS_KEY,
    [],
  );
  return raw.map(hydrate);
}

function save(users: User[]): void {
  writeJSON(USERS_KEY, users);
}

export const userStore = {
  list(): User[] {
    return load();
  },

  findByEmail(email: string): User | undefined {
    const target = normalizeEmail(email);
    return load().find((u) => u.email === target);
  },

  upsert(input: SignupInput): User {
    const users = load();
    const email = normalizeEmail(input.email);
    const existing = users.find((u) => u.email === email);
    if (existing) {
      const updated: User = {
        ...existing,
        name: input.name,
        college: input.college,
        year: input.year,
        role: input.role,
        interests:
          input.interests !== undefined
            ? input.interests
            : existing.interests,
      };
      const next = users.map((u) => (u.id === existing.id ? updated : u));
      save(next);
      return updated;
    }
    const created: User = {
      id: cryptoRandomId(),
      email,
      name: input.name,
      college: input.college,
      year: input.year,
      role: input.role,
      interests: input.interests ?? [],
      subject: "",
      uiFont: DEFAULT_UI_FONT,
      avatar: undefined,
    };
    save([...users, created]);
    return created;
  },

  patch(userId: string, patch: Partial<Omit<User, "id" | "email">>): User | undefined {
    const users = load();
    const existing = users.find((u) => u.id === userId);
    if (!existing) return undefined;
    const updated: User = { ...existing, ...patch };
    save(users.map((u) => (u.id === userId ? updated : u)));
    return updated;
  },
};

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
