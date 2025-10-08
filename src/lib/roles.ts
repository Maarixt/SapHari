// src/lib/roles.ts - Enhanced Role System with Master Account

export type UserRole = 'master' | 'admin' | 'developer' | 'technician' | 'user';

export interface RolePermissions {
  // User Management
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;
  canSuspendUsers: boolean;
  
  // Device Management
  canViewAllDevices: boolean;
  canCreateDevices: boolean;
  canEditDevices: boolean;
  canDeleteDevices: boolean;
  canReassignDevices: boolean;
  canForceDeviceReset: boolean;
  canUpdateFirmware: boolean;
  
  // Data Access
  canViewAllData: boolean;
  canExportData: boolean;
  canAccessRawLogs: boolean;
  canManageDataRetention: boolean;
  
  // System Control
  canAccessSystemSettings: boolean;
  canManageAPIKeys: boolean;
  canDeployUpdates: boolean;
  canAccessServerLogs: boolean;
  canEnableMaintenanceMode: boolean;
  
  // Communication
  canSendGlobalNotifications: boolean;
  canPostSystemUpdates: boolean;
  canManageIntegrations: boolean;
  
  // Developer Tools
  canAccessSimulator: boolean;
  canManageFeatureFlags: boolean;
  canAccessCodeEditor: boolean;
  canManageBetaFeatures: boolean;
  
  // Security
  canManageEncryption: boolean;
  canAccessAuditLogs: boolean;
  canOverrideSecurity: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  master: {
    // User Management - Full Control
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: true,
    canManageRoles: true,
    canSuspendUsers: true,
    
    // Device Management - Full Control
    canViewAllDevices: true,
    canCreateDevices: true,
    canEditDevices: true,
    canDeleteDevices: true,
    canReassignDevices: true,
    canForceDeviceReset: true,
    canUpdateFirmware: true,
    
    // Data Access - Full Control
    canViewAllData: true,
    canExportData: true,
    canAccessRawLogs: true,
    canManageDataRetention: true,
    
    // System Control - Full Control
    canAccessSystemSettings: true,
    canManageAPIKeys: true,
    canDeployUpdates: true,
    canAccessServerLogs: true,
    canEnableMaintenanceMode: true,
    
    // Communication - Full Control
    canSendGlobalNotifications: true,
    canPostSystemUpdates: true,
    canManageIntegrations: true,
    
    // Developer Tools - Full Control
    canAccessSimulator: true,
    canManageFeatureFlags: true,
    canAccessCodeEditor: true,
    canManageBetaFeatures: true,
    
    // Security - Full Control
    canManageEncryption: true,
    canAccessAuditLogs: true,
    canOverrideSecurity: true,
  },
  
  admin: {
    // User Management - Limited
    canViewUsers: true,
    canCreateUsers: true,
    canEditUsers: true,
    canDeleteUsers: false,
    canManageRoles: false,
    canSuspendUsers: true,
    
    // Device Management - Limited
    canViewAllDevices: true,
    canCreateDevices: true,
    canEditDevices: true,
    canDeleteDevices: false,
    canReassignDevices: false,
    canForceDeviceReset: false,
    canUpdateFirmware: false,
    
    // Data Access - Limited
    canViewAllData: true,
    canExportData: true,
    canAccessRawLogs: false,
    canManageDataRetention: false,
    
    // System Control - Limited
    canAccessSystemSettings: false,
    canManageAPIKeys: false,
    canDeployUpdates: false,
    canAccessServerLogs: false,
    canEnableMaintenanceMode: false,
    
    // Communication - Limited
    canSendGlobalNotifications: true,
    canPostSystemUpdates: false,
    canManageIntegrations: false,
    
    // Developer Tools - Limited
    canAccessSimulator: true,
    canManageFeatureFlags: false,
    canAccessCodeEditor: false,
    canManageBetaFeatures: false,
    
    // Security - Limited
    canManageEncryption: false,
    canAccessAuditLogs: true,
    canOverrideSecurity: false,
  },
  
  developer: {
    // User Management - None
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    
    // Device Management - Development
    canViewAllDevices: true,
    canCreateDevices: true,
    canEditDevices: true,
    canDeleteDevices: true,
    canReassignDevices: false,
    canForceDeviceReset: true,
    canUpdateFirmware: true,
    
    // Data Access - Development
    canViewAllData: true,
    canExportData: true,
    canAccessRawLogs: true,
    canManageDataRetention: false,
    
    // System Control - Development
    canAccessSystemSettings: false,
    canManageAPIKeys: true,
    canDeployUpdates: false,
    canAccessServerLogs: true,
    canEnableMaintenanceMode: false,
    
    // Communication - None
    canSendGlobalNotifications: false,
    canPostSystemUpdates: false,
    canManageIntegrations: false,
    
    // Developer Tools - Full
    canAccessSimulator: true,
    canManageFeatureFlags: true,
    canAccessCodeEditor: true,
    canManageBetaFeatures: true,
    
    // Security - Limited
    canManageEncryption: false,
    canAccessAuditLogs: true,
    canOverrideSecurity: false,
  },
  
  technician: {
    // User Management - None
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    
    // Device Management - Technical
    canViewAllDevices: true,
    canCreateDevices: true,
    canEditDevices: true,
    canDeleteDevices: false,
    canReassignDevices: false,
    canForceDeviceReset: true,
    canUpdateFirmware: true,
    
    // Data Access - Limited
    canViewAllData: true,
    canExportData: false,
    canAccessRawLogs: true,
    canManageDataRetention: false,
    
    // System Control - None
    canAccessSystemSettings: false,
    canManageAPIKeys: false,
    canDeployUpdates: false,
    canAccessServerLogs: false,
    canEnableMaintenanceMode: false,
    
    // Communication - None
    canSendGlobalNotifications: false,
    canPostSystemUpdates: false,
    canManageIntegrations: false,
    
    // Developer Tools - Limited
    canAccessSimulator: true,
    canManageFeatureFlags: false,
    canAccessCodeEditor: false,
    canManageBetaFeatures: false,
    
    // Security - None
    canManageEncryption: false,
    canAccessAuditLogs: false,
    canOverrideSecurity: false,
  },
  
  user: {
    // User Management - None
    canViewUsers: false,
    canCreateUsers: false,
    canEditUsers: false,
    canDeleteUsers: false,
    canManageRoles: false,
    canSuspendUsers: false,
    
    // Device Management - Own Only
    canViewAllDevices: false,
    canCreateDevices: true,
    canEditDevices: true,
    canDeleteDevices: true,
    canReassignDevices: false,
    canForceDeviceReset: false,
    canUpdateFirmware: false,
    
    // Data Access - Own Only
    canViewAllData: false,
    canExportData: false,
    canAccessRawLogs: false,
    canManageDataRetention: false,
    
    // System Control - None
    canAccessSystemSettings: false,
    canManageAPIKeys: false,
    canDeployUpdates: false,
    canAccessServerLogs: false,
    canEnableMaintenanceMode: false,
    
    // Communication - None
    canSendGlobalNotifications: false,
    canPostSystemUpdates: false,
    canManageIntegrations: false,
    
    // Developer Tools - None
    canAccessSimulator: false,
    canManageFeatureFlags: false,
    canAccessCodeEditor: false,
    canManageBetaFeatures: false,
    
    // Security - None
    canManageEncryption: false,
    canAccessAuditLogs: false,
    canOverrideSecurity: false,
  }
};

export const getRolePermissions = (role: UserRole): RolePermissions => {
  return ROLE_PERMISSIONS[role];
};

export const hasPermission = (userRole: UserRole, permission: keyof RolePermissions): boolean => {
  const permissions = getRolePermissions(userRole);
  return permissions[permission];
};

export const isMasterAccount = (role: UserRole): boolean => {
  return role === 'master';
};

export const canManageUsers = (role: UserRole): boolean => {
  return hasPermission(role, 'canManageRoles') || hasPermission(role, 'canEditUsers');
};

export const canAccessSystemControls = (role: UserRole): boolean => {
  return hasPermission(role, 'canAccessSystemSettings') || hasPermission(role, 'canDeployUpdates');
};

export const canAccessDeveloperTools = (role: UserRole): boolean => {
  return hasPermission(role, 'canAccessCodeEditor') || hasPermission(role, 'canManageFeatureFlags');
};