import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDefaultRoute, getUserRole } from "./routes";

/**
 * Route guard that checks if a user is authenticated and optionally if they have the right role.
 *
 * Usage in route config:
 *   <Route element={<RequireAuth user={user} roles={['SHOP_OWNER']} />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */
export function RequireAuth({ user, roles }) {
  const location = useLocation();

  // Not authenticated → redirect to login with return URL
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnTo}`} replace />;
  }

  // Role check (if specified) — use userType.slug as source of truth
  if (roles && roles.length > 0 && !roles.includes(getUserRole(user))) {
    // Logged in but wrong role → redirect to their default home
    const home = getDefaultRoute(user);
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
