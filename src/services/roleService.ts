// Role Management Service for RBAC
import { supabase } from '../lib/supabase';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin' | 'master';
  tenant_id?: string;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface RoleGrant {
  user_id: string;
  role: 'user' | 'admin' | 'master';
  tenant_id?: string;
  expires_at?: Date;
}

export interface UserWithRoles {
  id: string;
  email: string;
  roles: UserRole[];
  primary_role: string;
  tenant_id?: string;
}

class RoleService {
  // Get current user's roles
  async getCurrentUserRoles(): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('is_active', true)
      .order('granted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user roles: ${error.message}`);
    }

    return data || [];
  }

  // Get all users with their roles (master only)
  async getAllUsersWithRoles(): Promise<UserWithRoles[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        user:user_id (
          id,
          email
        )
      `)
      .eq('is_active', true)
      .order('granted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all users with roles: ${error.message}`);
    }

    // Group by user
    const userMap = new Map<string, UserWithRoles>();
    
    data?.forEach((role: any) => {
      const userId = role.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          email: role.user?.email || 'Unknown',
          roles: [],
          primary_role: 'user',
          tenant_id: role.tenant_id
        });
      }
      
      const user = userMap.get(userId)!;
      user.roles.push(role);
      
      // Set primary role (first role is primary)
      if (user.roles.length === 1) {
        user.primary_role = role.role;
      }
    });

    return Array.from(userMap.values());
  }

  // Grant role to user (master only)
  async grantRole(grant: RoleGrant): Promise<boolean> {
    const { error } = await supabase
      .rpc('grant_user_role', {
        target_user_id: grant.user_id,
        role_name: grant.role,
        tenant_id_param: grant.tenant_id || null,
        expires_at_param: grant.expires_at?.toISOString() || null
      });

    if (error) {
      throw new Error(`Failed to grant role: ${error.message}`);
    }

    return true;
  }

  // Revoke role from user (master only)
  async revokeRole(userId: string, role: string, tenantId?: string): Promise<boolean> {
    const { error } = await supabase
      .rpc('revoke_user_role', {
        target_user_id: userId,
        role_name: role,
        tenant_id_param: tenantId || null
      });

    if (error) {
      throw new Error(`Failed to revoke role: ${error.message}`);
    }

    return true;
  }

  // Check if current user has specific role
  async hasRole(role: string, tenantId?: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('user_has_role', {
        role_name: role,
        tenant_id_param: tenantId || null
      });

    if (error) {
      console.error('Failed to check user role:', error);
      return false;
    }

    return data || false;
  }

  // Check if current user is master
  async isMaster(): Promise<boolean> {
    return this.hasRole('master');
  }

  // Check if current user is admin
  async isAdmin(tenantId?: string): Promise<boolean> {
    return this.hasRole('admin', tenantId);
  }

  // Get current user's tenant ID
  async getCurrentUserTenantId(): Promise<string | null> {
    const { data, error } = await supabase
      .rpc('get_user_tenant_id');

    if (error) {
      console.error('Failed to get user tenant ID:', error);
      return null;
    }

    return data;
  }

  // Get user by email (for role management)
  async getUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);

    if (error) {
      console.error('Failed to get user by email:', error);
      return null;
    }

    return data.user ? { id: data.user.id, email: data.user.email! } : null;
  }

  // Get roles for specific user
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user roles: ${error.message}`);
    }

    return data || [];
  }

  // Update user's primary role
  async updatePrimaryRole(userId: string, newRole: string, tenantId?: string): Promise<boolean> {
    try {
      // Get current roles
      const currentRoles = await this.getUserRoles(userId);
      
      // Deactivate current primary role
      const primaryRole = currentRoles.find(r => r.role === 'user' || r.role === 'admin' || r.role === 'master');
      if (primaryRole) {
        await this.revokeRole(userId, primaryRole.role, primaryRole.tenant_id);
      }

      // Grant new primary role
      await this.grantRole({
        user_id: userId,
        role: newRole as any,
        tenant_id: tenantId
      });

      return true;
    } catch (error) {
      console.error('Failed to update primary role:', error);
      return false;
    }
  }

  // Get role statistics
  async getRoleStatistics(): Promise<{
    total_users: number;
    master_users: number;
    admin_users: number;
    regular_users: number;
    users_by_tenant: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, tenant_id')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get role statistics: ${error.message}`);
    }

    const stats = {
      total_users: 0,
      master_users: 0,
      admin_users: 0,
      regular_users: 0,
      users_by_tenant: {} as Record<string, number>
    };

    const uniqueUsers = new Set<string>();

    data?.forEach((role: any) => {
      uniqueUsers.add(role.user_id);
      
      switch (role.role) {
        case 'master':
          stats.master_users++;
          break;
        case 'admin':
          stats.admin_users++;
          break;
        case 'user':
          stats.regular_users++;
          break;
      }

      if (role.tenant_id) {
        stats.users_by_tenant[role.tenant_id] = (stats.users_by_tenant[role.tenant_id] || 0) + 1;
      }
    });

    stats.total_users = uniqueUsers.size;

    return stats;
  }

  // Check if user owns device
  async userOwnsDevice(deviceId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('user_owns_device', {
        device_id_param: deviceId
      });

    if (error) {
      console.error('Failed to check device ownership:', error);
      return false;
    }

    return data || false;
  }

  // Get audit logs (master only)
  async getAuditLogs(limit: number = 100, offset: number = 0): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return data || [];
  }

  // Log audit event
  async logAuditEvent(
    action: string,
    tableName: string,
    recordId?: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    const { error } = await supabase
      .rpc('log_audit_event', {
        action_name: action,
        table_name_param: tableName,
        record_id_param: recordId || null,
        old_values_param: oldValues || null,
        new_values_param: newValues || null
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // Validate role permissions for action
  async validatePermission(action: string, resource: string, resourceId?: string): Promise<boolean> {
    try {
      // Master users can do anything
      if (await this.isMaster()) {
        return true;
      }

      // Admin users can manage their tenant
      if (await this.isAdmin()) {
        // Add tenant-specific validation logic here
        return true;
      }

      // Regular users can only access their own resources
      if (resource === 'device' && resourceId) {
        return await this.userOwnsDevice(resourceId);
      }

      // Default: deny access
      return false;
    } catch (error) {
      console.error('Failed to validate permission:', error);
      return false;
    }
  }

  // Get available roles for current user to grant
  async getAvailableRolesToGrant(): Promise<string[]> {
    try {
      if (await this.isMaster()) {
        return ['user', 'admin', 'master'];
      }
      
      if (await this.isAdmin()) {
        return ['user', 'admin'];
      }

      return [];
    } catch (error) {
      console.error('Failed to get available roles:', error);
      return [];
    }
  }

  // Check if role can be granted to user
  async canGrantRole(role: string, targetUserId: string): Promise<boolean> {
    try {
      // Master users can grant any role
      if (await this.isMaster()) {
        return true;
      }

      // Admin users can grant user and admin roles in their tenant
      if (await this.isAdmin()) {
        return ['user', 'admin'].includes(role);
      }

      return false;
    } catch (error) {
      console.error('Failed to check role grant permission:', error);
      return false;
    }
  }
}

// Export singleton instance
export const roleService = new RoleService();
