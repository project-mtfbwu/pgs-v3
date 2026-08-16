export function operationsRoleLabel(roles: string[]): string {
  if (roles.includes("super_admin")) return "Super Admin";
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("mentor")) return "Mentor";
  return "Read-only Staff";
}

export function operationsInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
