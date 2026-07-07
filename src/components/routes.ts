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

// Mirrors ERPShell's NAV_ITEMS key -> path — kept here too since routes.ts has
// no dependency on the shell and getDefaultRoute needs it for staff whose
// granted sections don't include "dashboard".
const SECTION_PATHS = {
  dashboard: "/dashboard", inventory: "/inventory", pos: "/billing",
  parties: "/parties", workshop: "/workshop", "workshop-mp": "/workshop/marketplace",
  history: "/history", reports: "/reports", orders: "/orders", gstr: "/gstr",
  audit: "/audit", staff: "/staff", returns: "/returns",
  "purchase-returns": "/purchase-returns", warranty: "/warranty",
  "credit-notes": "/credit-notes",
};

/** Get the default landing page for a user object or role string */
export function getDefaultRoute(userOrRole) {
  const role = getUserRole(userOrRole);
  if (role === "SHOP_OWNER") return "/dashboard";
  if (role === "SHOP_STAFF") {
    const user = typeof userOrRole === "object" ? userOrRole : null;
    const sections = user?.sections || [];
    // Dashboard is only the default if it was actually granted — staff whose
    // access doesn't include it should land on their first real section
    // instead of a page they can't see (which used to redirect right back
    // here, since requireSection treated dashboard as always-visible).
    const firstGranted = sections.map(s => SECTION_PATHS[s]).find(Boolean);
    return firstGranted || "/dashboard";
  }
  if (role === "PLATFORM_ADMIN") return "/admin";
  return "/marketplace";
}
