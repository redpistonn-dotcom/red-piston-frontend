/**
 * Get the canonical role slug for a user.
 * Prefers userType.slug (DB source of truth) over the cached role string.
 * Accepts either a full user object or a plain role string (backwards compat).
 */
export function getUserRole(userOrRole) {
  if (!userOrRole) return null;
  if (typeof userOrRole === "string") return userOrRole;
  return userOrRole.userType?.slug || userOrRole.role || null;
}

/** Get the default landing page for a user object or role string */
export function getDefaultRoute(userOrRole) {
  const role = getUserRole(userOrRole);
  if (role === "SHOP_OWNER" || role === "SHOP_STAFF") return "/dashboard";
  if (role === "PLATFORM_ADMIN") return "/admin";
  return "/marketplace";
}
