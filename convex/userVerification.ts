import type { Doc } from "./_generated/dataModel";

export function hasVerifiedEmail(user: Doc<"users">): boolean {
  return user.emailVerificationTime !== undefined;
}

export function assertVerifiedEmail(user: Doc<"users">): void {
  if (!hasVerifiedEmail(user)) {
    throw new Error("User must verify their email before chatting");
  }
}
