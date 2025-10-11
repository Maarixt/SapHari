# MQTT Security ACL Configuration

## Overview

This document provides Access Control List (ACL) configurations for securing MQTT topics in the SapHari system. The ACL ensures that devices and users can only access their authorized topics.

## Topic Structure

```
saphari/{tenant_id}/devices/{device_id}/{channel}
saphari/{tenant_id}/users/{user_id}/notifications
```

Where:
- `tenant_id`: Isolates data between different organizations
- `device_id`: Unique device identifier
- `channel`: Type of data (status, state, cmd, ack, event)

## EMQX ACL Configuration

### 1. Device ACL Rules

```bash
# Device can read/write to its own topics only
user saph-123
topic readwrite saphari/tenantA/devices/saph-123/#
topic read saphari/tenantA/devices/+/status
topic read saphari/tenantA/devices/+/state

# Device cannot access other tenants
deny saphari/tenantB/#
deny saphari/tenantC/#
```

### 2. Web Client ACL Rules

```bash
# Web client can read all devices in their tenant
user web-client-tenantA
topic read saphari/tenantA/devices/+/status
topic read saphari/tenantA/devices/+/state
topic read saphari/tenantA/devices/+/ack
topic read saphari/tenantA/devices/+/event

# Web client can write commands to devices they own
topic write saphari/tenantA/devices/+/cmd

# Web client cannot access other tenants
deny saphari/tenantB/#
deny saphari/tenantC/#
```

### 3. Server ACL Rules

```bash
# Server has admin access to all tenants
user saphari-server
topic readwrite saphari/+/devices/+/#
topic readwrite saphari/+/users/+/#
```

## Mosquitto ACL Configuration

### mosquitto.conf

```conf
# Enable ACL
acl_file /etc/mosquitto/acl.conf

# Enable authentication
allow_anonymous false
password_file /etc/mosquitto/passwd

# Enable TLS
listener 8883
cafile /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/broker.crt
keyfile /etc/mosquitto/certs/broker.key
require_certificate true
```

### acl.conf

```conf
# Device ACLs
user saph-123
topic readwrite saphari/tenantA/devices/saph-123/#
topic read saphari/tenantA/devices/+/status
topic read saphari/tenantA/devices/+/state

user saph-456
topic readwrite saphari/tenantA/devices/saph-456/#
topic read saphari/tenantA/devices/+/status
topic read saphari/tenantA/devices/+/state

# Web client ACLs
user web-client-tenantA
topic read saphari/tenantA/devices/+/status
topic read saphari/tenantA/devices/+/state
topic read saphari/tenantA/devices/+/ack
topic read saphari/tenantA/devices/+/event
topic write saphari/tenantA/devices/+/cmd

# Server ACL
user saphari-server
topic readwrite saphari/+/devices/+/#
topic readwrite saphari/+/users/+/#
```

## JWT-Based ACL (Advanced)

### EMQX JWT ACL Plugin

```javascript
// JWT payload structure
{
  "sub": "saph-123",
  "tenant": "tenantA",
  "role": "device",
  "permissions": [
    "saphari/tenantA/devices/saph-123/#",
    "saphari/tenantA/devices/+/status"
  ],
  "iat": 1640995200,
  "exp": 1640998800
}

// ACL rule based on JWT
function acl_check(client, topic, action) {
  const payload = jwt_decode(client.username);
  
  if (payload.role === 'device') {
    return payload.permissions.some(perm => 
      mqtt.match(topic, perm)
    );
  }
  
  if (payload.role === 'user') {
    return topic.startsWith(`saphari/${payload.tenant}/`);
  }
  
  if (payload.role === 'admin') {
    return true; // Admin has access to everything
  }
  
  return false;
}
```

## Security Best Practices

### 1. Topic Design
- Use hierarchical structure for easy ACL management
- Include tenant isolation at the top level
- Use device-specific subtopics for granular control

### 2. Authentication
- Use JWT tokens with expiration
- Implement token refresh mechanism
- Validate tokens on every connection

### 3. Authorization
- Principle of least privilege
- Device can only access its own topics
- Users can only access their tenant's data
- Server has admin access for monitoring

### 4. Monitoring
- Log all ACL violations
- Monitor for unusual access patterns
- Alert on failed authentication attempts

## Implementation Checklist

- [ ] Configure broker ACL rules
- [ ] Implement JWT authentication
- [ ] Set up TLS certificates
- [ ] Configure tenant isolation
- [ ] Test ACL enforcement
- [ ] Monitor access logs
- [ ] Set up alerting for violations

## Testing ACL Rules

```bash
# Test device access (should work)
mosquitto_pub -h localhost -p 8883 -u saph-123 -P "jwt_token" \
  -t "saphari/tenantA/devices/saph-123/status" -m "online"

# Test cross-tenant access (should fail)
mosquitto_pub -h localhost -p 8883 -u saph-123 -P "jwt_token" \
  -t "saphari/tenantB/devices/saph-123/status" -m "online"

# Test web client access (should work)
mosquitto_sub -h localhost -p 8883 -u web-client-tenantA -P "jwt_token" \
  -t "saphari/tenantA/devices/+/status"
```
