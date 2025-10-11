// Role-based access control middleware for API routes and components
import { roleService } from '../services/roleService';
import React, { useState, useEffect } from 'react';

export interface RoleMiddlewareOptions {
  requiredRole?: 'user' | 'admin' | 'master';
  requiredPermission?: string;
  resource?: string;
  resourceId?: string;
  tenantId?: string;
}

export interface RoleCheckResult {
  allowed: boolean;
  reason?: string;
  userRole?: string;
  userTenantId?: string;
}

// Middleware function to check role-based permissions
export async function checkRolePermission(options: RoleMiddlewareOptions): Promise<RoleCheckResult> {
  try {
    const {
      requiredRole,
      requiredPermission,
      resource,
      resourceId,
      tenantId
    } = options;

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        allowed: false,
        reason: 'User not authenticated'
      };
    }

    // Get user's roles
    const userRoles = await roleService.getCurrentUserRoles();
    if (userRoles.length === 0) {
      return {
        allowed: false,
        reason: 'User has no roles assigned'
      };
    }

    const primaryRole = userRoles[0]?.role || 'user';
    const userTenantId = await roleService.getCurrentUserTenantId();

    // Check required role
    if (requiredRole) {
      const hasRequiredRole = await roleService.hasRole(requiredRole, tenantId);
      if (!hasRequiredRole) {
        return {
          allowed: false,
          reason: `Required role '${requiredRole}' not found`,
          userRole: primaryRole,
          userTenantId
        };
      }
    }

    // Check specific permission
    if (requiredPermission && resource) {
      const hasPermission = await roleService.validatePermission(
        requiredPermission,
        resource,
        resourceId
      );
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `Permission '${requiredPermission}' on '${resource}' denied`,
          userRole: primaryRole,
          userTenantId
        };
      }
    }

    return {
      allowed: true,
      userRole: primaryRole,
      userTenantId
    };

  } catch (error) {
    console.error('Role permission check failed:', error);
    return {
      allowed: false,
      reason: 'Permission check failed'
    };
  }
}

// Higher-order function to wrap API routes with role checking
export function withRoleCheck(
  handler: (req: any, res: any, user: any) => Promise<any>,
  options: RoleMiddlewareOptions
) {
  return async (req: any, res: any) => {
    try {
      const roleCheck = await checkRolePermission(options);
      
      if (!roleCheck.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: roleCheck.reason
        });
      }

      // Get user data
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      // Call the original handler with user data
      return await handler(req, res, user);

    } catch (error) {
      console.error('Role middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }
  };
}

// React hook for role-based component rendering
export function useRoleGuard(options: RoleMiddlewareOptions) {
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await checkRolePermission(options);
        setIsAllowed(result.allowed);
        setUserRole(result.userRole || null);
        
        if (!result.allowed) {
          setError(result.reason || 'Access denied');
        }
      } catch (err) {
        console.error('Role guard check failed:', err);
        setIsAllowed(false);
        setError('Permission check failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [options.requiredRole, options.requiredPermission, options.resource, options.resourceId]);

  return {
    isAllowed,
    isLoading,
    error,
    userRole
  };
}

// Component wrapper for role-based access control
interface RoleGuardProps extends RoleMiddlewareOptions {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  children, 
  fallback, 
  requiredRole,
  requiredPermission,
  resource,
  resourceId,
  tenantId
}: RoleGuardProps) {
  const { isAllowed, isLoading, error } = useRoleGuard({
    requiredRole,
    requiredPermission,
    resource,
    resourceId,
    tenantId
  });

  if (isLoading) {
    return React.createElement('div', null, 'Loading...');
  }

  if (!isAllowed) {
    return fallback || React.createElement('div', null, `Access denied: ${error}`);
  }

  return React.createElement(React.Fragment, null, children);
}

// Utility functions for common role checks
export const roleChecks = {
  // Check if user is master
  isMaster: () => checkRolePermission({ requiredRole: 'master' }),
  
  // Check if user is admin
  isAdmin: (tenantId?: string) => checkRolePermission({ requiredRole: 'admin', tenantId }),
  
  // Check if user can manage devices
  canManageDevices: (deviceId?: string) => checkRolePermission({
    requiredPermission: 'manage',
    resource: 'device',
    resourceId: deviceId
  }),
  
  // Check if user can view audit logs
  canViewAuditLogs: () => checkRolePermission({ requiredRole: 'master' }),
  
  // Check if user can manage users
  canManageUsers: () => checkRolePermission({ requiredRole: 'admin' }),
  
  // Check if user owns device
  ownsDevice: (deviceId: string) => checkRolePermission({
    requiredPermission: 'own',
    resource: 'device',
    resourceId: deviceId
  })
};

// API route decorators
export const apiDecorators = {
  // Require master role
  requireMaster: (handler: any) => withRoleCheck(handler, { requiredRole: 'master' }),
  
  // Require admin role
  requireAdmin: (handler: any, tenantId?: string) => 
    withRoleCheck(handler, { requiredRole: 'admin', tenantId }),
  
  // Require user role (default)
  requireUser: (handler: any) => withRoleCheck(handler, { requiredRole: 'user' }),
  
  // Require specific permission
  requirePermission: (permission: string, resource: string) => 
    (handler: any) => withRoleCheck(handler, { 
      requiredPermission: permission, 
      resource 
    })
};

// Tenant isolation helpers
export const tenantHelpers = {
  // Get user's tenant ID
  getUserTenantId: async (): Promise<string | null> => {
    return await roleService.getCurrentUserTenantId();
  },
  
  // Check if user belongs to tenant
  belongsToTenant: async (tenantId: string): Promise<boolean> => {
    const userTenantId = await roleService.getCurrentUserTenantId();
    return userTenantId === tenantId;
  },
  
  // Filter data by tenant
  filterByTenant: async <T extends { tenant_id?: string }>(
    data: T[]
  ): Promise<T[]> => {
    const userTenantId = await roleService.getCurrentUserTenantId();
    
    // Master users can see all data
    const isMaster = await roleService.isMaster();
    if (isMaster) {
      return data;
    }
    
    // Other users can only see their tenant's data
    return data.filter(item => item.tenant_id === userTenantId);
  }
};

// Audit logging helpers
export const auditHelpers = {
  // Log role change
  logRoleChange: async (
    targetUserId: string,
    action: 'grant' | 'revoke',
    role: string,
    tenantId?: string
  ) => {
    await roleService.logAuditEvent(
      `role_${action}`,
      'user_roles',
      targetUserId,
      action === 'revoke' ? { role, tenant_id: tenantId } : null,
      action === 'grant' ? { role, tenant_id: tenantId } : null
    );
  },
  
  // Log device access
  logDeviceAccess: async (
    deviceId: string,
    action: string,
    details?: any
  ) => {
    await roleService.logAuditEvent(
      `device_${action}`,
      'devices',
      deviceId,
      null,
      details
    );
  },
  
  // Log permission check
  logPermissionCheck: async (
    permission: string,
    resource: string,
    allowed: boolean,
    reason?: string
  ) => {
    await roleService.logAuditEvent(
      'permission_check',
      'permissions',
      `${permission}:${resource}`,
      null,
      { allowed, reason }
    );
  }
};

// Import supabase client
import { supabase } from '../lib/supabase';
