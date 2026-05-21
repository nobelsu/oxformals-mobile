type NamedUser = {
  name?: string | null;
  email?: string | null;
};

export function userDisplayName(user: NamedUser): string {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] ?? email;
  return "User";
}
