import { Role, Device, Collaborator } from './types';

export function resolveUserRole(
  device: Device, 
  userId: string, 
  userEmail: string,
  collaborators: Collaborator[]
): Role {
  if (device.owner_id === userId) return 'owner';
  
  const collaboration = collaborators.find(c => 
    c.device_id === device.id && c.user_email === userEmail
  );
  
  return collaboration?.role as Role || 'viewer';
}

// UI permission helpers
export const canEdit = (role: Role) => role === 'owner' || role === 'collaborator';
export const canOperate = (role: Role) => canEdit(role) || role === 'operator';
export const canView = (role: Role) => true; // all roles can view
export const readOnly = (role: Role) => !canOperate(role);

// Role descriptions for UI
export const roleDescriptions = {
  viewer: 'View only - no control',
  operator: 'Use existing widgets',
  collaborator: 'Full edit permissions',
  owner: 'Full ownership'
};