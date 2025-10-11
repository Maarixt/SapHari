# SapHari RLS & RBAC System

## 🎯 Overview

The SapHari Row Level Security (RLS) and Role-Based Access Control (RBAC) system provides comprehensive data isolation, security, and permission management across all tables and operations.

## 🔧 Key Features

### ✅ **Row Level Security (RLS)**
- **Data Isolation**: Users can only access their own data
- **Tenant Isolation**: Multi-tenant data separation
- **Master Override**: Master users can access all data
- **Automatic Enforcement**: Database-level security enforcement

### ✅ **Role-Based Access Control (RBAC)**
- **Three-Tier Roles**: User, Admin, Master
- **Permission Inheritance**: Higher roles inherit lower permissions
- **Tenant-Specific Roles**: Admin roles scoped to tenants
- **Role Expiration**: Optional role expiration dates

### ✅ **Security Features**
- **JWT Role Injection**: Roles embedded in authentication tokens
- **Audit Logging**: Complete audit trail of all operations
- **Permission Validation**: Granular permission checking
- **Access Control Lists**: Fine-grained access control

## 📊 Role Hierarchy

### **Master Role** 👑
- **Access**: All data across all tenants
- **Permissions**: 
  - Manage all users and roles
  - Access all devices and data
  - View audit logs
  - System administration
- **Scope**: Global

### **Admin Role** 🛡️
- **Access**: All data within assigned tenant
- **Permissions**:
  - Manage users in their tenant
  - Access all devices in their tenant
  - View tenant-specific data
  - Grant/revoke user and admin roles
- **Scope**: Tenant-specific

### **User Role** 👤
- **Access**: Own data only
- **Permissions**:
  - Manage own devices
  - View own data
  - Basic operations
- **Scope**: Personal

## 🗄️ Database Schema

### **User Roles Table**
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    role TEXT CHECK (role IN ('user', 'admin', 'master')),
    tenant_id TEXT,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, tenant_id, role)
);
```

### **RLS Policies Example**
```sql
-- User ownership policy
CREATE POLICY "Users can view their own devices" ON devices
    FOR SELECT USING (auth.uid() = user_id);

-- Master access policy
CREATE POLICY "Master users can access all devices" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'master' 
            AND r.is_active = true
        )
    );

-- Admin tenant policy
CREATE POLICY "Admin users can access tenant devices" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles r 
            WHERE r.user_id = auth.uid() 
            AND r.role = 'admin' 
            AND r.is_active = true
            AND r.tenant_id = devices.tenant_id
        )
    );
```

## 🔄 Authentication Flow

### **1. User Sign In**
```typescript
// Auth hook triggers on sign in
const { data: roles } = await supabase
  .from('user_roles')
  .select('role, tenant_id, expires_at')
  .eq('user_id', user.id)
  .eq('is_active', true);

// Update user metadata with roles
await supabase.auth.admin.updateUserById(user.id, {
  user_metadata: {
    roles: activeRoles,
    primary_role: activeRoles[0]?.role || 'user',
    tenant_id: activeRoles[0]?.tenant_id || null
  }
});
```

### **2. JWT Token Generation**
```typescript
// JWT contains role information
{
  "sub": "user-id",
  "email": "user@example.com",
  "user_metadata": {
    "roles": [
      { "role": "admin", "tenant_id": "tenant-123" }
    ],
    "primary_role": "admin",
    "tenant_id": "tenant-123"
  }
}
```

### **3. Permission Validation**
```typescript
// Check user permissions
const hasPermission = await roleService.validatePermission(
  'manage',
  'device',
  'device-123'
);
```

## 🛠️ Implementation Details

### **RLS Policies**
```sql
-- Enable RLS on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
-- 1. User ownership policies
-- 2. Master access policies  
-- 3. Admin tenant policies
-- 4. Storage policies
```

### **Role Service**
```typescript
class RoleService {
  // Check if user has role
  async hasRole(role: string, tenantId?: string): Promise<boolean>
  
  // Grant role to user
  async grantRole(grant: RoleGrant): Promise<boolean>
  
  // Revoke role from user
  async revokeRole(userId: string, role: string): Promise<boolean>
  
  // Validate permission
  async validatePermission(action: string, resource: string): Promise<boolean>
}
```

### **Auth Hook**
```typescript
// Supabase Edge Function
export default async function handler(req: Request) {
  const { type, record } = await req.json();
  
  switch (type) {
    case 'user.signed_in':
      await handleUserSignedIn(record);
      break;
    case 'user.created':
      await handleUserCreated(record);
      break;
  }
}
```

## 🔒 Security Features

### **Data Isolation**
- **User Level**: Users can only access their own data
- **Tenant Level**: Admins can only access their tenant's data
- **Global Level**: Masters can access all data

### **Permission Validation**
- **Database Level**: RLS policies enforce access at database level
- **Application Level**: Role service validates permissions in application
- **API Level**: Middleware checks permissions for API endpoints

### **Audit Logging**
- **All Operations**: Every role change and permission check logged
- **User Actions**: Device access and management actions tracked
- **Security Events**: Failed permission checks and suspicious activity

## 📈 Usage Examples

### **Check User Role**
```typescript
const { isMaster, isAdmin, hasRole } = useRoles();

// Check if user is master
if (isMaster) {
  // Show master features
}

// Check if user is admin in specific tenant
if (await isAdmin('tenant-123')) {
  // Show admin features for tenant
}

// Check specific role
if (await hasRole('admin', 'tenant-123')) {
  // Show admin features
}
```

### **Role-Based Component Rendering**
```typescript
// Using RoleGuard component
<RoleGuard requiredRole="master">
  <MasterDashboard />
</RoleGuard>

<RoleGuard requiredRole="admin" tenantId="tenant-123">
  <AdminPanel />
</RoleGuard>

<RoleGuard requiredPermission="manage" resource="device" resourceId="device-123">
  <DeviceManagement />
</RoleGuard>
```

### **API Route Protection**
```typescript
// Using middleware decorators
export default apiDecorators.requireMaster(handler);
export default apiDecorators.requireAdmin(handler, 'tenant-123');
export default apiDecorators.requirePermission('manage', 'device')(handler);
```

### **Grant Role to User**
```typescript
const { grantRole } = useRoles();

await grantRole({
  user_id: 'user-123',
  role: 'admin',
  tenant_id: 'tenant-123',
  expires_at: new Date('2024-12-31')
});
```

## 🧪 Testing

### **Role Testing**
```typescript
// Test role assignment
const success = await roleService.grantRole({
  user_id: 'test-user',
  role: 'admin',
  tenant_id: 'test-tenant'
});

// Test permission validation
const hasPermission = await roleService.validatePermission(
  'manage',
  'device',
  'test-device'
);
```

### **RLS Testing**
```sql
-- Test as different users
SET LOCAL "request.jwt.claims" TO '{"sub": "user-123"}';
SELECT * FROM devices; -- Should only return user's devices

SET LOCAL "request.jwt.claims" TO '{"sub": "master-user"}';
SELECT * FROM devices; -- Should return all devices
```

## 🚨 Security Considerations

### **Role Escalation Prevention**
- **Validation**: All role changes validated by master users
- **Audit**: Complete audit trail of role changes
- **Expiration**: Roles can have expiration dates
- **Deactivation**: Roles can be deactivated immediately

### **Data Leakage Prevention**
- **RLS Enforcement**: Database-level access control
- **Query Filtering**: Application-level data filtering
- **Tenant Isolation**: Strict tenant boundaries
- **Permission Checks**: Granular permission validation

### **Attack Mitigation**
- **JWT Validation**: Token signature and expiration validation
- **Role Injection**: Roles injected securely via auth hook
- **Permission Caching**: Efficient permission checking
- **Rate Limiting**: API rate limiting for role operations

## 📋 Best Practices

### **Role Design**
1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Role Hierarchy**: Clear role hierarchy with inheritance
3. **Tenant Isolation**: Strict tenant boundaries
4. **Regular Audits**: Regular review of user roles and permissions

### **Permission Management**
1. **Granular Permissions**: Specific permissions for specific actions
2. **Resource-Based**: Permissions tied to specific resources
3. **Context-Aware**: Permissions consider context (tenant, device, etc.)
4. **Audit Trail**: Complete audit trail of all permission changes

### **Security Monitoring**
1. **Failed Access Attempts**: Monitor and alert on failed access
2. **Role Changes**: Monitor all role assignment and revocation
3. **Data Access Patterns**: Monitor unusual data access patterns
4. **Permission Escalation**: Monitor for unauthorized permission escalation

## 🎯 Success Metrics

- **Security**: Zero unauthorized data access incidents
- **Performance**: < 10ms permission check latency
- **Compliance**: 100% audit trail coverage
- **Usability**: Intuitive role management interface
- **Reliability**: 99.9% permission system uptime

## 🔄 Future Enhancements

1. **Dynamic Roles**: Runtime role creation and assignment
2. **Permission Templates**: Predefined permission sets
3. **Conditional Access**: Time and location-based access control
4. **Multi-Factor Authentication**: Enhanced authentication for sensitive operations
5. **Role Analytics**: Role usage analytics and optimization
6. **API Rate Limiting**: Role-based API rate limiting
7. **Session Management**: Advanced session and token management
8. **Compliance Reporting**: Automated compliance reporting

## 📚 API Reference

### **Role Service Methods**
```typescript
// Role management
grantRole(grant: RoleGrant): Promise<boolean>
revokeRole(userId: string, role: string): Promise<boolean>
updatePrimaryRole(userId: string, newRole: string): Promise<boolean>

// Permission checking
hasRole(role: string, tenantId?: string): Promise<boolean>
validatePermission(action: string, resource: string): Promise<boolean>
userOwnsDevice(deviceId: string): Promise<boolean>

// Data retrieval
getCurrentUserRoles(): Promise<UserRole[]>
getAllUsersWithRoles(): Promise<UserWithRoles[]>
getRoleStatistics(): Promise<RoleStats>
```

### **Middleware Functions**
```typescript
// Permission checking
checkRolePermission(options: RoleMiddlewareOptions): Promise<RoleCheckResult>
withRoleCheck(handler: Function, options: RoleMiddlewareOptions): Function

// Component guards
useRoleGuard(options: RoleMiddlewareOptions): RoleGuardResult
RoleGuard(props: RoleGuardProps): ReactElement
```

### **Utility Functions**
```typescript
// Role checks
roleChecks.isMaster(): Promise<RoleCheckResult>
roleChecks.isAdmin(tenantId?: string): Promise<RoleCheckResult>
roleChecks.canManageDevices(deviceId?: string): Promise<RoleCheckResult>

// Tenant helpers
tenantHelpers.getUserTenantId(): Promise<string | null>
tenantHelpers.belongsToTenant(tenantId: string): Promise<boolean>
tenantHelpers.filterByTenant<T>(data: T[]): Promise<T[]>
```

## 🆘 Troubleshooting

### **Common Issues**

1. **Permission Denied**
   - Check user roles and permissions
   - Verify RLS policies are enabled
   - Check tenant isolation settings

2. **Role Not Working**
   - Verify role is active and not expired
   - Check JWT token contains role information
   - Verify auth hook is properly configured

3. **Data Not Visible**
   - Check RLS policies for the table
   - Verify user ownership or role permissions
   - Check tenant isolation settings

### **Debug Tools**
- **Database Logs**: Check Supabase logs for RLS policy violations
- **Auth Logs**: Monitor auth hook execution
- **Application Logs**: Check role service and middleware logs
- **Audit Logs**: Review audit trail for permission changes

### **Support Resources**
- Supabase RLS documentation
- PostgreSQL RLS documentation
- JWT token debugging tools
- Role management best practices guides
