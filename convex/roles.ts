/**
 * Shared by the server and the client (lib/data/roles.ts re-exports it).
 * Fellows have no year of study; everyone else does.
 */
export const FELLOW_ROLE = "Fellow";

export function roleNeedsYear(role: string | null | undefined): boolean {
  return (role ?? "").trim() !== FELLOW_ROLE;
}
