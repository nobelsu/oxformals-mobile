import type { User } from "@/src/lib/auth/types";
import { DEFAULT_UI_FONT } from "@/convex/uiFont";

/** Shown when a user is not in the public directory cache yet. */
export function placeholderUser(userId: string): User {
  return {
    id: userId,
    email: "",
    name: "Member",
    college: "",
    year: "",
    role: "",
    interests: [],
    subject: "",
    uiFont: DEFAULT_UI_FONT,
  };
}
