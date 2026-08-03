import { api } from './client.js';

export interface ShopMechanic {
  id: number;
  user_id: number;
  mechanic_role: 'HEAD' | 'MEMBER';
  approval_status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  employee_id: string | null;
  designation: string | null;
  skills: string[] | null;
  is_active: boolean;
  joined_at: string;
  head_mechanic_id: number | null;
  head_mechanic_name: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
}

export interface MechanicInvite {
  id: number;
  email: string;
  mechanic_role: 'HEAD' | 'MEMBER';
  status: 'PENDING' | 'EXPIRED';
  created_at: string;
}

export const getMechanics = () => api.get<{ success: boolean; data: ShopMechanic[] }>('/api/shop/mechanics');

export const getMechanicInvites = () => api.get<{ success: boolean; data: MechanicInvite[] }>('/api/shop/mechanics/invites');

export const getMechanicJoinCode = () => api.get<{ success: boolean; data: { joinCode: string } }>('/api/shop/mechanics/join-code');

export const rotateMechanicJoinCode = () => api.post<{ success: boolean; data: { joinCode: string } }>('/api/shop/mechanics/join-code/rotate');

export const inviteMechanic = (data: { email: string; mechanicRole?: 'HEAD' | 'MEMBER' }) =>
  api.post('/api/shop/mechanics/invite', data);

export const resendMechanicInvite = (id: number | string) => api.post(`/api/shop/mechanics/invite/${id}/resend`);

export const cancelMechanicInvite = (id: number | string) => api.delete(`/api/shop/mechanics/invite/${id}`);

export const approveMechanic = (id: number | string, mechanicRole?: 'HEAD' | 'MEMBER') =>
  api.patch(`/api/shop/mechanics/${id}/approve`, { mechanicRole });

export const rejectMechanic = (id: number | string) => api.patch(`/api/shop/mechanics/${id}/reject`, {});

export const updateMechanicRole = (id: number | string, mechanicRole: 'HEAD' | 'MEMBER') =>
  api.patch(`/api/shop/mechanics/${id}/role`, { mechanicRole });

export const deactivateMechanic = (id: number | string) => api.patch(`/api/shop/mechanics/${id}/deactivate`, {});
export const reactivateMechanic = (id: number | string) => api.patch(`/api/shop/mechanics/${id}/reactivate`, {});
