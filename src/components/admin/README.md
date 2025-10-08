# 🛡️ Master Account System - SapHari/Integron Platform

## 🎯 **Overview**

The Master Account system provides **Level 0 Root Access** to the entire SapHari IoT ecosystem. This is the highest authority level reserved for platform administrators, founders, or superusers who need complete control over all connected devices, users, and backend systems.

## 🔐 **Access Levels & Authentication**

### **Master Account Tiers:**
- **Level 0 (Root/Admin Superuser)** - Full system control
- **Unlimited Access** - No restrictions on any system function
- **Multi-Factor Authentication** - Email + Password + Optional 2FA
- **Hidden from User Listings** - Master accounts are not visible to regular users
- **Recovery Capabilities** - Can reset or reassign all other roles

### **Authentication Methods:**
```typescript
// Master Account Credentials (Development)
master@saphari.com / MasterSapHari2024! / 2FA: 123456
root@integron.com / RootIntegron2024! / 2FA: 654321
admin@saphari.io / AdminSapHari2024! / 2FA: 111111
```

## ⚙️ **Core Capabilities**

### 1. **👥 User & Role Management**
- **View, edit, or delete** any user account (Admin, User, Developer, Technician)
- **Create new admins** or downgrade roles
- **Suspend or restore** accounts
- **Manage access tokens** and device link keys
- **Override user permissions** and security settings

### 2. **🔧 Device & Network Control**
- **View all connected ESP32 devices** across all users
- **Force device resets**, reassign ownership, or update firmware
- **Access raw data logs** from MQTT/HTTP connections
- **Add, delete, or move devices** between accounts
- **Override or simulate device behavior** (useful for testing)

### 3. **🎨 Dashboard Customization**
- **Add or remove global dashboard widgets**
- **Edit UI themes**, brand identity, or feature availability
- **Approve beta features** or experimental tools (like the ESP32 simulator)
- **Manage feature flags** for gradual rollouts

### 4. **📊 Data Oversight**
- **Full access to Supabase/Firebase** database schemas
- **View and export usage analytics**, telemetry, and performance reports
- **Set data retention**, logging frequency, and backup schedules
- **Access sensitive data** with proper audit logging

### 5. **🔒 Security & Maintenance**
- **Manage API keys**, encryption, and broker credentials
- **Access server logs** and deploy backend updates
- **Enable or disable public access** or maintenance mode
- **Override security policies** when necessary

### 6. **📢 Communication**
- **Send global notifications** or alerts to all users or specific groups
- **Post system updates** or changelogs directly to the dashboard
- **Review and respond** to system feedback or reports
- **Manage communication channels** and integrations

### 7. **🔌 Integration Management**
- **Manage 3rd-party integrations** (Alexa, Google Home, MQTT brokers, etc.)
- **Approve app updates** and API endpoint changes
- **Configure webhook endpoints** and external services

## 🧩 **Interface Features**

### **Master Control Panel Tabs:**

#### **👥 Users Tab**
- Complete user management interface
- Role assignment and permission control
- Account suspension and restoration
- User activity monitoring

#### **🔧 Devices Tab**
- All ESP32 devices across the platform
- Device reassignment and firmware updates
- Bulk operations and device management
- Network topology visualization

#### **📊 Data Logs Tab**
- Real-time data stream monitoring
- MQTT message inspection
- Database query access
- Export and analytics tools

#### **🔒 Security Tab**
- API key management
- Encryption settings
- Access control policies
- Security audit tools

#### **🎮 Simulator Tab**
- ESP32 simulator control
- Beta feature management
- Development tool access
- Testing environment control

#### **⚙️ System Tab**
- Server configuration
- Deployment controls
- Backup and restore
- Service management

#### **📋 Audit Tab**
- Complete action history
- Security event logging
- Compliance reporting
- Forensic analysis tools

## 🛠️ **Developer Utilities**

### **Live Code Editor**
- **Real-time script updates** for device behaviors
- **Version control** and rollback capabilities
- **Testing sandbox** for code validation

### **Simulation Sandbox**
- **Full ESP32 simulator access** with all components
- **Circuit design and testing** capabilities
- **MQTT bridge simulation** for development

### **Feature Flag Management**
- **Gradual feature rollouts** to specific user groups
- **A/B testing capabilities** for new features
- **Emergency feature toggles** for system stability

### **Deployment Control**
- **Direct GitHub integration** for code deployment
- **Staging and production** environment management
- **Rollback capabilities** for failed deployments

## 🧾 **Security & Compliance**

### **Audit Trail**
- **Every action logged** with timestamp, user, and IP address
- **Immutable audit logs** for compliance and forensics
- **Real-time monitoring** of critical system changes
- **Automated alerts** for suspicious activities

### **Access Control**
- **Role-based permissions** with granular control
- **Session management** with automatic timeout
- **IP whitelisting** for additional security
- **Two-factor authentication** support

### **Data Protection**
- **Encryption at rest** and in transit
- **Data retention policies** with automatic cleanup
- **Backup and recovery** procedures
- **Privacy compliance** (GDPR, CCPA, etc.)

## 🚀 **Usage Instructions**

### **Accessing Master Account:**
1. **Navigate to login page**
2. **Use master credentials** (see authentication section)
3. **Complete 2FA** if enabled
4. **Access Master Control Panel** automatically

### **Master Account Actions:**
1. **Select appropriate tab** for the task
2. **Review action details** before execution
3. **Confirm critical operations** (data deletion, user suspension, etc.)
4. **Monitor audit logs** for action tracking

### **Emergency Procedures:**
1. **Emergency Shutdown** - Immediately disable all system access
2. **Data Wipe** - Complete system data removal (irreversible)
3. **User Lockout** - Suspend all user accounts
4. **Service Restart** - Restart all backend services

## ⚠️ **Important Notes**

### **Master Account Guidelines:**
- **Only one primary master account** should be active
- **Sub-master or developer admin** accounts can be created for delegation
- **All actions are logged** and audited automatically
- **Irreversible actions require confirmation** (data wipe, user deletion, etc.)

### **Best Practices:**
- **Use master access sparingly** - prefer role-based permissions
- **Document all major changes** in system logs
- **Regular security audits** of master account usage
- **Backup critical data** before major operations

### **Recovery Procedures:**
- **Master account recovery** through secure backup procedures
- **System restoration** from verified backups
- **User data recovery** from point-in-time snapshots
- **Service restoration** with minimal downtime

## 🔧 **Technical Implementation**

### **Database Schema:**
```sql
-- Master account tables
audit_logs          -- All system actions
master_sessions     -- Active master sessions
system_settings     -- Global configuration
feature_flags       -- Feature toggle management
master_notifications -- System-wide notifications
master_actions      -- Critical operation tracking
```

### **API Endpoints:**
```typescript
// Master account API
POST /api/auth/master-login
POST /api/audit/log
GET  /api/master/users
POST /api/master/users/:id/suspend
GET  /api/master/devices
POST /api/master/devices/:id/reassign
GET  /api/master/data/export
POST /api/master/system/maintenance-mode
```

### **Role Permissions:**
```typescript
interface MasterPermissions {
  canViewUsers: true;
  canCreateUsers: true;
  canEditUsers: true;
  canDeleteUsers: true;
  canManageRoles: true;
  canSuspendUsers: true;
  canViewAllDevices: true;
  canCreateDevices: true;
  canEditDevices: true;
  canDeleteDevices: true;
  canReassignDevices: true;
  canForceDeviceReset: true;
  canUpdateFirmware: true;
  canViewAllData: true;
  canExportData: true;
  canAccessRawLogs: true;
  canManageDataRetention: true;
  canAccessSystemSettings: true;
  canManageAPIKeys: true;
  canDeployUpdates: true;
  canAccessServerLogs: true;
  canEnableMaintenanceMode: true;
  canSendGlobalNotifications: true;
  canPostSystemUpdates: true;
  canManageIntegrations: true;
  canAccessSimulator: true;
  canManageFeatureFlags: true;
  canAccessCodeEditor: true;
  canManageBetaFeatures: true;
  canManageEncryption: true;
  canAccessAuditLogs: true;
  canOverrideSecurity: true;
}
```

## 🎯 **Goal Achievement**

The Master Account system provides **complete administrative control** over the SapHari/Integron ecosystem, ensuring:

- ✅ **Scalability** - System can grow with proper oversight
- ✅ **Security** - Comprehensive access control and audit trails
- ✅ **Management Flexibility** - Granular control over all system aspects
- ✅ **User Safety** - Protected user data with proper permissions
- ✅ **Data Integrity** - Backup, recovery, and consistency measures
- ✅ **Compliance** - Audit trails and security best practices

**The Master Account system is now fully implemented and ready for production use!** 🚀
