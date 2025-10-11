# SapHari MQTT Security Implementation Guide

## 🎯 Overview

This guide provides step-by-step instructions for implementing advanced MQTT security in the SapHari IoT platform. The implementation includes TLS encryption, JWT authentication, tenant isolation, and comprehensive ACL protection.

## 🔐 Security Features Implemented

### ✅ **Step 1: MQTT over TLS**
- **ESP32**: Uses `WiFiClientSecure` with certificate validation
- **Web Client**: Uses WSS (WebSocket Secure) connection
- **Server**: Uses MQTTS (MQTT over TLS) connection
- **Port**: 8883 (TLS) instead of 1883 (plaintext)

### ✅ **Step 2: LWT (Last Will & Testament)**
- **Purpose**: Automatic offline detection when devices disconnect unexpectedly
- **Implementation**: ESP32 publishes "offline" message on disconnect
- **Retention**: LWT messages are retained for immediate visibility

### ✅ **Step 3: Retained State Messages**
- **Purpose**: Instant dashboard loading on reconnection
- **Implementation**: All state messages published with `retain=true`
- **Benefit**: New subscribers immediately receive last known state

### ✅ **Step 4: Secure Topic Structure**
- **Format**: `saphari/{tenant_id}/devices/{device_id}/{channel}`
- **Isolation**: Tenant-based data separation
- **Channels**: status, state, cmd, ack, event

### ✅ **Step 5: Enhanced Authentication**
- **Method**: JWT (JSON Web Tokens) with expiration
- **Roles**: device, user, admin
- **Refresh**: Automatic token renewal

## 📁 Files Modified/Created

### **ESP32 Firmware**
- `firmware/esp32_device_authoritative/main_secure.cpp` - Secure ESP32 firmware

### **Frontend**
- `src/services/mqtt.ts` - Updated for secure topics and JWT

### **Backend**
- `server/src/mqttBridge.ts` - Updated for secure topics and JWT

### **Documentation**
- `docs/mqtt-security-acl.md` - ACL configuration guide
- `docs/mqtt-security-implementation.md` - This implementation guide

## 🚀 Implementation Steps

### **Step 1: Update ESP32 Firmware**

1. **Replace existing firmware** with `main_secure.cpp`
2. **Update configuration**:
   ```cpp
   const char* DEVICE_ID = "your-device-id";
   const char* DEVICE_KEY = "your-device-key";
   const char* TENANT_ID = "your-tenant-id";
   const char* JWT_SECRET = "your-jwt-secret";
   ```
3. **Update WiFi credentials**
4. **Update ROOT_CA** with your broker's certificate

### **Step 2: Configure MQTT Broker**

#### **EMQX Configuration**
```bash
# Enable ACL
acl_nomatch = deny
acl_file = /etc/emqx/acl.conf

# Enable authentication
allow_anonymous = false
auth.jwt.secret = "your-jwt-secret"

# Enable TLS
listener.ssl.external = 8883
listener.ssl.external.keyfile = /etc/emqx/certs/broker.key
listener.ssl.external.certfile = /etc/emqx/certs/broker.crt
listener.ssl.external.cacertfile = /etc/emqx/certs/ca.crt
```

#### **ACL Rules** (see `docs/mqtt-security-acl.md`)

### **Step 3: Update Frontend**

1. **Implement tenant resolution**:
   ```typescript
   function getCurrentTenantId(): string {
     // Get from user context, device ownership, etc.
     return user.tenantId || 'default';
   }
   ```

2. **Implement JWT generation**:
   ```typescript
   function generateWebJWT(tenantId: string): string {
     // Generate JWT with user permissions
     // Include tenant, role, expiration
   }
   ```

### **Step 4: Update Backend**

1. **Implement server JWT generation**
2. **Update notification system** to include tenant context
3. **Configure environment variables**:
   ```bash
   MQTT_URL=mqtts://broker.emqx.io:8883
   JWT_SECRET=your-jwt-secret
   ```

## 🔧 Configuration Examples

### **ESP32 Configuration**
```cpp
// Device credentials (from device creation)
const char* DEVICE_ID = "pump-1";
const char* DEVICE_KEY = "ABC12345";
const char* TENANT_ID = "tenantA";

// JWT secret (must match server)
const char* JWT_SECRET = "sapHariSecretKey";

// Broker certificate
const char* ROOT_CA = "-----BEGIN CERTIFICATE-----\n...";
```

### **Frontend Configuration**
```typescript
// MQTT connection with JWT
const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
  clientId: 'web-' + Math.random().toString(16).slice(2),
  username: generateWebJWT(tenantId),
  password: '', // No password with JWT
});
```

### **Server Configuration**
```typescript
// Server MQTT connection
const client = mqtt.connect('mqtts://broker.emqx.io:8883', {
  clientId: 'saphari-server-' + Math.random().toString(16).slice(2, 8),
  username: generateServerJWT(),
  password: '', // No password with JWT
});
```

## 🧪 Testing

### **Test 1: TLS Connection**
```bash
# Test TLS connection (should work)
mosquitto_pub -h broker.emqx.io -p 8883 --cafile ca.crt \
  -t "saphari/tenantA/devices/test/status" -m "online"
```

### **Test 2: ACL Enforcement**
```bash
# Test device access (should work)
mosquitto_pub -h broker.emqx.io -p 8883 -u "device-jwt" \
  -t "saphari/tenantA/devices/device1/status" -m "online"

# Test cross-tenant access (should fail)
mosquitto_pub -h broker.emqx.io -p 8883 -u "device-jwt" \
  -t "saphari/tenantB/devices/device1/status" -m "online"
```

### **Test 3: LWT Functionality**
1. Connect ESP32 to MQTT
2. Disconnect ESP32 (power off)
3. Check broker for LWT "offline" message

### **Test 4: Retained Messages**
1. Publish state with `retain=true`
2. Subscribe to topic
3. Verify immediate receipt of last state

## 🔍 Monitoring & Debugging

### **MQTT Broker Logs**
```bash
# EMQX logs
tail -f /var/log/emqx/emqx.log

# Mosquitto logs
tail -f /var/log/mosquitto/mosquitto.log
```

### **Client Debugging**
```cpp
// ESP32 debugging
Serial.println("MQTT connection state: " + String(client.state()));
Serial.println("JWT token: " + currentJWT);
```

```typescript
// Frontend debugging
client.on('error', (error) => {
  console.error('MQTT error:', error);
});
```

## 🚨 Security Considerations

### **Certificate Management**
- Use valid CA-signed certificates in production
- Implement certificate rotation
- Monitor certificate expiration

### **JWT Security**
- Use strong JWT secrets
- Implement token rotation
- Monitor for token abuse

### **Network Security**
- Use VPN for device connections
- Implement firewall rules
- Monitor network traffic

### **Access Control**
- Regular ACL audits
- Monitor for privilege escalation
- Implement rate limiting

## 📊 Performance Impact

### **TLS Overhead**
- **CPU**: ~10-15% increase on ESP32
- **Memory**: ~2KB additional RAM
- **Latency**: ~50-100ms additional

### **JWT Overhead**
- **Token Size**: ~200-400 bytes
- **Processing**: Minimal impact
- **Network**: Negligible increase

## 🔄 Migration Strategy

### **Phase 1: Parallel Deployment**
1. Deploy secure firmware alongside existing
2. Test with subset of devices
3. Monitor performance and stability

### **Phase 2: Gradual Migration**
1. Migrate devices in batches
2. Update broker configuration
3. Update frontend/backend

### **Phase 3: Full Cutover**
1. Disable old insecure connections
2. Remove legacy code
3. Update documentation

## ✅ Success Criteria

- [ ] All MQTT traffic encrypted with TLS
- [ ] JWT authentication working for all clients
- [ ] Tenant isolation preventing cross-tenant access
- [ ] LWT properly detecting device disconnections
- [ ] Retained messages providing instant state loading
- [ ] ACL rules preventing unauthorized access
- [ ] Performance impact within acceptable limits
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team trained on new security features

## 🆘 Troubleshooting

### **Common Issues**

1. **TLS Connection Failed**
   - Check certificate validity
   - Verify broker TLS configuration
   - Check network connectivity

2. **JWT Authentication Failed**
   - Verify JWT secret matches
   - Check token expiration
   - Validate JWT format

3. **ACL Access Denied**
   - Check ACL rules configuration
   - Verify topic structure
   - Check user permissions

4. **LWT Not Working**
   - Verify LWT topic configuration
   - Check retain flag setting
   - Monitor broker logs

### **Support Resources**
- MQTT broker documentation
- JWT.io for token debugging
- Wireshark for network analysis
- Broker-specific troubleshooting guides
