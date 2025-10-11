// React hook for role management and RBAC
import { useState, useEffect, useCallback } from 'react';
import { roleService, UserRole, UserWithRoles, RoleGrant } from '../services/roleService';

interface UseRolesReturn {
  // Current user roles
  currentUserRoles: UserRole[];
  isMaster: boolean;
  isAdmin: boolean;
  userTenantId: string | null;
  
  // Role management
  grantRole: (grant: RoleGrant) => Promise<boolean>;
  revokeRole: (userId: string, role: string, tenantId?: string) => Promise<boolean>;
  updatePrimaryRole: (userId: string, newRole: string, tenantId?: string) => Promise<boolean>;
  
  // User management
  getAllUsersWithRoles: () => Promise<UserWithRoles[]>;
  getUserRoles: (userId: string) => Promise<UserRole[]>;
  getUserByEmail: (email: string) => Promise<{ id: string; email: string } | null>;
  
  // Permissions
  hasRole: (role: string, tenantId?: string) => Promise<boolean>;
  validatePermission: (action: string, resource: string, resourceId?: string) => Promise<boolean>;
  userOwnsDevice: (deviceId: string) => Promise<boolean>;
  
  // Statistics and audit
  getRoleStatistics: () => Promise<any>;
  getAuditLogs: (limit?: number, offset?: number) => Promise<any[]>;
  
  // Available actions
  getAvailableRolesToGrant: () => Promise<string[]>;
  canGrantRole: (role: string, targetUserId: string) => Promise<boolean>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useRoles(): UseRolesReturn {
  const [currentUserRoles, setCurrentUserRoles] = useState<UserRole[]>([]);
  const [isMaster, setIsMaster] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current user roles
  const loadCurrentUserRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const roles = await roleService.getCurrentUserRoles();
      setCurrentUserRoles(roles);
      
      // Check for master role
      const masterCheck = await roleService.isMaster();
      setIsMaster(masterCheck);
      
      // Check for admin role
      const adminCheck = await roleService.isAdmin();
      setIsAdmin(adminCheck);
      
      // Get tenant ID
      const tenantId = await roleService.getCurrentUserTenantId();
      setUserTenantId(tenantId);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user roles';
      setError(errorMessage);
      console.error('Failed to load current user roles:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load roles on mount
  useEffect(() => {
    loadCurrentUserRoles();
  }, [loadCurrentUserRoles]);

  // Grant role to user
  const grantRole = useCallback(async (grant: RoleGrant): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await roleService.grantRole(grant);
      
      if (success) {
        // Reload current user roles if we granted a role to ourselves
        if (grant.user_id === currentUserRoles[0]?.user_id) {
          await loadCurrentUserRoles();
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to grant role';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRoles, loadCurrentUserRoles]);

  // Revoke role from user
  const revokeRole = useCallback(async (
    userId: string, 
    role: string, 
    tenantId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await roleService.revokeRole(userId, role, tenantId);
      
      if (success) {
        // Reload current user roles if we revoked a role from ourselves
        if (userId === currentUserRoles[0]?.user_id) {
          await loadCurrentUserRoles();
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke role';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRoles, loadCurrentUserRoles]);

  // Update primary role
  const updatePrimaryRole = useCallback(async (
    userId: string, 
    newRole: string, 
    tenantId?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await roleService.updatePrimaryRole(userId, newRole, tenantId);
      
      if (success) {
        // Reload current user roles if we updated our own role
        if (userId === currentUserRoles[0]?.user_id) {
          await loadCurrentUserRoles();
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update primary role';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserRoles, loadCurrentUserRoles]);

  // Get all users with roles
  const getAllUsersWithRoles = useCallback(async (): Promise<UserWithRoles[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const users = await roleService.getAllUsersWithRoles();
      return users;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get all users with roles';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get roles for specific user
  const getUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const roles = await roleService.getUserRoles(userId);
      return roles;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user roles';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get user by email
  const getUserByEmail = useCallback(async (email: string): Promise<{ id: string; email: string } | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const user = await roleService.getUserByEmail(email);
      return user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user by email';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user has specific role
  const hasRole = useCallback(async (role: string, tenantId?: string): Promise<boolean> => {
    try {
      return await roleService.hasRole(role, tenantId);
    } catch (err) {
      console.error('Failed to check user role:', err);
      return false;
    }
  }, []);

  // Validate permission
  const validatePermission = useCallback(async (
    action: string, 
    resource: string, 
    resourceId?: string
  ): Promise<boolean> => {
    try {
      return await roleService.validatePermission(action, resource, resourceId);
    } catch (err) {
      console.error('Failed to validate permission:', err);
      return false;
    }
  }, []);

  // Check if user owns device
  const userOwnsDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      return await roleService.userOwnsDevice(deviceId);
    } catch (err) {
      console.error('Failed to check device ownership:', err);
      return false;
    }
  }, []);

  // Get role statistics
  const getRoleStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stats = await roleService.getRoleStatistics();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get role statistics';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get audit logs
  const getAuditLogs = useCallback(async (limit: number = 100, offset: number = 0) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const logs = await roleService.getAuditLogs(limit, offset);
      return logs;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get audit logs';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get available roles to grant
  const getAvailableRolesToGrant = useCallback(async (): Promise<string[]> => {
    try {
      return await roleService.getAvailableRolesToGrant();
    } catch (err) {
      console.error('Failed to get available roles:', err);
      return [];
    }
  }, []);

  // Check if role can be granted
  const canGrantRole = useCallback(async (role: string, targetUserId: string): Promise<boolean> => {
    try {
      return await roleService.canGrantRole(role, targetUserId);
    } catch (err) {
      console.error('Failed to check role grant permission:', err);
      return false;
    }
  }, []);

  return {
    currentUserRoles,
    isMaster,
    isAdmin,
    userTenantId,
    grantRole,
    revokeRole,
    updatePrimaryRole,
    getAllUsersWithRoles,
    getUserRoles,
    getUserByEmail,
    hasRole,
    validatePermission,
    userOwnsDevice,
    getRoleStatistics,
    getAuditLogs,
    getAvailableRolesToGrant,
    canGrantRole,
    isLoading,
    error
  };
}

// Hook for role-based UI rendering
export function useRoleBasedAccess() {
  const { isMaster, isAdmin, hasRole, validatePermission } = useRoles();

  // Check if user can access admin features
  const canAccessAdmin = useCallback(async (): Promise<boolean> => {
    return isMaster || isAdmin;
  }, [isMaster, isAdmin]);

  // Check if user can access master features
  const canAccessMaster = useCallback(async (): Promise<boolean> => {
    return isMaster;
  }, [isMaster]);

  // Check if user can manage users
  const canManageUsers = useCallback(async (): Promise<boolean> => {
    return isMaster || isAdmin;
  }, [isMaster, isAdmin]);

  // Check if user can manage devices
  const canManageDevices = useCallback(async (deviceId?: string): Promise<boolean> => {
    if (isMaster) return true;
    if (isAdmin) return true;
    
    if (deviceId) {
      return await validatePermission('manage', 'device', deviceId);
    }
    
    return false;
  }, [isMaster, isAdmin, validatePermission]);

  // Check if user can view audit logs
  const canViewAuditLogs = useCallback(async (): Promise<boolean> => {
    return isMaster;
  }, [isMaster]);

  // Check if user can grant roles
  const canGrantRoles = useCallback(async (): Promise<boolean> => {
    return isMaster || isAdmin;
  }, [isMaster, isAdmin]);

  return {
    canAccessAdmin,
    canAccessMaster,
    canManageUsers,
    canManageDevices,
    canViewAuditLogs,
    canGrantRoles,
    isMaster,
    isAdmin
  };
}
