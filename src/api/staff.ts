import { api } from './client.js';

// Sidebar section keys — must match ERPShell.tsx NAV_ITEMS keys and the
// backend's src/lib/section-permissions.js SECTION_KEYS exactly.
export const SECTION_OPTIONS: Array<{ key: string; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'pos', label: 'POS Billing' },
  { key: 'parties', label: 'Parties' },
  { key: 'workshop', label: 'Job Cards' },
  { key: 'workshop-mp', label: 'Parts Listing' },
  { key: 'history', label: 'History' },
  { key: 'reports', label: 'Reports' },
  { key: 'orders', label: 'Orders' },
  { key: 'gstr', label: 'GSTR-1 Export' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'staff', label: 'Staff' },
  { key: 'shop-settings', label: 'Shop Settings' },
  { key: 'returns', label: 'Returns & Exchange' },
  { key: 'purchase-returns', label: 'Purchase Returns' },
  { key: 'warranty', label: 'Warranty' },
];

export interface StaffMember {
  id: number;
  role: string;
  roleLabel: string | null;
  sections: string[];
  permissions: Record<string, boolean>;
  isActive: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
  invitedBy: number | null;
  user: { userId: number; name: string | null; phone: string | null; email: string | null; avatarUrl?: string | null; lastLoginAt?: string | null };
}

export interface StaffInvite {
  id: number;
  shopId: number;
  // The owner no longer sets this — it's null until the invitee verifies.
  name: string | null;
  email: string;
  phone: string | null;
  roleLabel: string;
  sections: string[];
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
}

export const getStaff = () => api.get<{ success: boolean; data: StaffMember[] }>('/api/shop/staff');

export const getStaffInvites = () => api.get<{ success: boolean; data: StaffInvite[] }>('/api/shop/staff/invites');

// Owner only picks the role + sections — the invitee provides their own name
// and mobile number when they verify the OTP (see acceptStaffInvite).
export const createStaffInvite = (data: { email: string; roleLabel: string; sections: string[] }) =>
  api.post('/api/shop/staff/invite', data);

export const resendStaffInvite = (id: number | string) => api.post(`/api/shop/staff/invite/${id}/resend`);

export const cancelStaffInvite = (id: number | string) => api.delete(`/api/shop/staff/invite/${id}`);

export const updateStaffAccess = (id: number | string, data: { roleLabel?: string; sections?: string[] }) =>
  api.patch(`/api/shop/staff/${id}/role`, data);

export const deactivateStaff = (id: number | string) => api.patch(`/api/shop/staff/${id}/deactivate`, {});
export const reactivateStaff = (id: number | string) => api.patch(`/api/shop/staff/${id}/reactivate`, {});
export const removeStaff = (id: number | string) => api.delete(`/api/shop/staff/${id}`);

// PUBLIC — no auth token required, the invitee may have no account yet.
// name/phone are required for a brand-new account; the backend skips them
// when an existing account already has that data.
export const acceptStaffInvite = (data: { email: string; code: string; name?: string; phone?: string }) =>
  api.post('/api/shop/staff-invite/accept', data);
