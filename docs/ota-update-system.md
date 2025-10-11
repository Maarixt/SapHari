# SapHari OTA Update System

## 🎯 Overview

The SapHari OTA (Over-The-Air) Update System provides secure, reliable firmware updates for ESP32 devices with automatic rollback, progress tracking, and comprehensive audit trails.

## 🔧 Key Features

### ✅ **Secure HTTPS Downloads**
- **Certificate Validation**: All downloads use HTTPS with certificate validation
- **Signed URLs**: Expiring signed URLs from Supabase Storage (1-hour expiration)
- **SHA256 Verification**: Firmware integrity verified with checksums
- **Private Storage**: Firmware files stored in private Supabase buckets

### ✅ **Dual Partition Safety**
- **Automatic Rollback**: Failed updates automatically rollback to previous firmware
- **Boot Failure Detection**: System detects failed boots and triggers rollback
- **OTA Partition Management**: ESP32 dual partition system (ota_0, ota_1)
- **Verification Process**: New firmware validated before marking as active

### ✅ **Progress Tracking**
- **Real-time Updates**: Live progress updates via MQTT
- **Download Progress**: Percentage and bytes downloaded tracking
- **Status Updates**: Starting, downloading, validating, success, error, rebooting
- **Duration Tracking**: Time elapsed for each update phase

### ✅ **Comprehensive Management**
- **Firmware Upload**: Web interface for uploading .bin files
- **Version Control**: Version tracking and description support
- **Deployment Control**: Manual deployment with retry logic
- **Audit Trail**: Complete history of all firmware updates

## 📊 System Architecture

### **ESP32 Firmware Flow**
```
1. Receive OTA Command → 2. Download Firmware → 3. Validate Checksum → 4. Install → 5. Verify → 6. Reboot
```

### **Dashboard Flow**
```
1. Upload Firmware → 2. Generate Signed URL → 3. Send OTA Command → 4. Monitor Progress → 5. Track Results
```

## 🗄️ Database Schema

### **Firmware Uploads Table**
```sql
CREATE TABLE firmware_uploads (
    id UUID PRIMARY KEY,
    device_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    version TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('uploaded', 'deployed', 'failed', 'rollback')),
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE,
    deployed_to_device_at TIMESTAMP WITH TIME ZONE,
    rollback_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);
```

### **Storage Bucket**
```sql
-- Private firmware storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('firmware', 'firmware', false, 10485760, ARRAY['application/octet-stream']);
```

## 🔄 OTA Update Process

### **1. Firmware Upload**
```typescript
// Upload firmware to Supabase Storage
const firmware = await otaService.uploadFirmware(deviceId, file, version, description);

// File validation
- File size: Max 10MB
- File type: .bin files only
- Minimum size: 1KB
- SHA256 checksum calculated automatically
```

### **2. Deployment**
```typescript
// Deploy firmware to device
await otaService.deployFirmware(deviceId, firmwareId);

// Process:
// 1. Generate signed URL (1-hour expiration)
// 2. Send OTA command via MQTT
// 3. Monitor progress via MQTT
// 4. Track completion status
```

### **3. ESP32 Processing**
```cpp
// ESP32 receives OTA command
{
  "cmd_id": "CMD_123",
  "action": "ota_update",
  "url": "https://signed-url",
  "checksum": "sha256-hash",
  "version": "v2.1.0"
}

// ESP32 process:
// 1. Validate HTTPS URL
// 2. Download firmware with progress tracking
// 3. Verify SHA256 checksum
// 4. Install to OTA partition
// 5. Verify installation
// 6. Mark as valid and reboot
```

### **4. Progress Monitoring**
```typescript
// Real-time progress updates
interface OTAUpdateProgress {
  deviceId: string;
  status: 'starting' | 'downloading' | 'validating' | 'success' | 'error' | 'rebooting';
  message: string;
  progress: number;
  timestamp: number;
  totalSize: number;
  downloadedSize: number;
}
```

## 🛠️ Implementation Details

### **ESP32 OTA Firmware**
```cpp
// Key features implemented:
- HTTPS OTA with certificate validation
- Dual partition support (ota_0, ota_1)
- Automatic rollback on failure
- Progress reporting via MQTT
- SHA256 checksum verification
- Boot failure detection
- JWT authentication for MQTT
```

### **Frontend Components**
```typescript
// OTA Update Dialog
- File upload with validation
- Version and description input
- Firmware list with status
- Deploy and delete actions
- Progress monitoring

// OTA Progress Monitor
- Real-time progress updates
- Active and completed updates
- Status badges and icons
- Duration tracking
- Clear completed updates
```

### **Backend Services**
```typescript
// OTA Service
- Firmware upload to Supabase Storage
- Signed URL generation
- Deployment management
- Progress tracking
- Statistics and history

// MQTT Integration
- OTA command sending
- Progress message handling
- Status updates
- Error reporting
```

## 🔒 Security Features

### **Download Security**
- **HTTPS Only**: All downloads use HTTPS with TLS 1.2
- **Certificate Validation**: Server certificates validated against CA
- **Signed URLs**: Expiring URLs prevent unauthorized access
- **Private Storage**: Firmware files not publicly accessible

### **Firmware Integrity**
- **SHA256 Checksums**: All firmware verified with checksums
- **Size Validation**: File size limits prevent oversized uploads
- **Type Validation**: Only .bin files accepted
- **Content Validation**: Minimum size requirements

### **Access Control**
- **User Authentication**: Only authenticated users can upload
- **Device Ownership**: Users can only update their own devices
- **Master Access**: Master users can access all devices
- **RLS Policies**: Row-level security on all database tables

## 📈 Monitoring & Analytics

### **Update Statistics**
```sql
-- Success rate calculation
SELECT 
  device_id,
  COUNT(*) as total_uploads,
  COUNT(*) FILTER (WHERE status = 'deployed') as successful_deployments,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'deployed')::NUMERIC / COUNT(*)) * 100, 
    2
  ) as success_rate
FROM firmware_uploads
WHERE uploaded_at > NOW() - INTERVAL '30 days'
GROUP BY device_id;
```

### **Performance Metrics**
- **Upload Success Rate**: > 95% for valid files
- **Deployment Success Rate**: > 90% for healthy devices
- **Download Speed**: Varies by network (typically 1-5 MB/s)
- **Update Duration**: 2-10 minutes depending on firmware size

## 🧪 Testing

### **Test Scenarios**
```typescript
// Test firmware upload
const file = new File(['firmware content'], 'test.bin', { type: 'application/octet-stream' });
const firmware = await otaService.uploadFirmware('device-1', file, 'v1.0.0', 'Test firmware');

// Test deployment
await otaService.deployFirmware('device-1', firmware.id);

// Test progress monitoring
otaService.onOTAProgress((progress) => {
  console.log('OTA Progress:', progress);
});
```

### **Validation Tests**
- **File Upload**: Test various file sizes and types
- **Checksum Verification**: Verify SHA256 calculation
- **Signed URL Generation**: Test URL expiration
- **MQTT Communication**: Test command and progress messages
- **Rollback Testing**: Test failed update scenarios

## 🚨 Error Handling

### **Common Error Scenarios**
1. **Upload Failures**: Network issues, file validation errors
2. **Download Failures**: HTTPS errors, certificate issues, network timeouts
3. **Installation Failures**: Insufficient space, corrupted firmware
4. **Verification Failures**: Checksum mismatch, boot failures

### **Recovery Mechanisms**
- **Automatic Retry**: Failed downloads retried with exponential backoff
- **Rollback Safety**: Failed updates automatically rollback
- **Error Reporting**: Detailed error messages for debugging
- **Status Tracking**: Complete audit trail of all operations

## 📋 Best Practices

### **Firmware Development**
1. **Test Thoroughly**: Test firmware on development devices first
2. **Version Control**: Use semantic versioning (v1.0.0, v1.1.0, etc.)
3. **Documentation**: Provide clear descriptions of changes
4. **Size Optimization**: Keep firmware size under 5MB when possible

### **Deployment Strategy**
1. **Staged Rollout**: Deploy to test devices first
2. **Monitor Progress**: Watch for failed updates
3. **Backup Plan**: Keep previous firmware versions available
4. **Communication**: Notify users of planned updates

### **Security Considerations**
1. **Signed Firmware**: Consider code signing for production
2. **Access Control**: Limit who can upload firmware
3. **Audit Logs**: Monitor all firmware uploads and deployments
4. **Network Security**: Use VPN for sensitive deployments

## 🎯 Success Metrics

- **Upload Success Rate**: > 95% for valid files
- **Deployment Success Rate**: > 90% for healthy devices
- **Rollback Rate**: < 5% of deployments require rollback
- **Update Duration**: < 10 minutes for typical firmware (2-5MB)
- **User Satisfaction**: Positive feedback on update process

## 🔄 Future Enhancements

1. **Scheduled Updates**: Schedule updates for maintenance windows
2. **Batch Updates**: Update multiple devices simultaneously
3. **Delta Updates**: Only download changed portions of firmware
4. **A/B Testing**: Test new firmware on subset of devices
5. **Rollback Triggers**: Automatic rollback based on device metrics
6. **Firmware Signing**: Code signing for enhanced security
7. **Update Templates**: Predefined update configurations
8. **Device Groups**: Group devices for coordinated updates

## 📚 Usage Examples

### **Upload Firmware**
```typescript
// Using the OTA hook
const { uploadFirmware } = useOTA();

const handleUpload = async (file: File) => {
  try {
    const firmware = await uploadFirmware('device-1', file, 'v2.1.0', 'Bug fixes and improvements');
    console.log('Firmware uploaded:', firmware.id);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### **Deploy Firmware**
```typescript
// Deploy to device
const { deployFirmware } = useOTA();

const handleDeploy = async (firmwareId: string) => {
  try {
    await deployFirmware('device-1', firmwareId);
    console.log('Deployment initiated');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
};
```

### **Monitor Progress**
```typescript
// Monitor OTA progress
const { otaProgress } = useOTAProgress();

otaProgress.forEach(update => {
  console.log(`${update.deviceId}: ${update.status} - ${update.progress}%`);
});
```

## 🆘 Troubleshooting

### **Common Issues**

1. **Upload Fails**
   - Check file size (max 10MB)
   - Verify file is .bin format
   - Check network connection

2. **Deployment Fails**
   - Verify device is online
   - Check MQTT connection
   - Verify device permissions

3. **Download Fails**
   - Check HTTPS certificate
   - Verify signed URL hasn't expired
   - Check device network connection

4. **Installation Fails**
   - Check device storage space
   - Verify firmware compatibility
   - Check device logs for errors

### **Debug Tools**
- **MQTT Logs**: Monitor OTA command and progress messages
- **Device Logs**: Check ESP32 serial output
- **Database Queries**: Review firmware_uploads table
- **Storage Browser**: Check Supabase Storage for files

### **Support Resources**
- ESP32 OTA documentation
- Supabase Storage documentation
- MQTT broker logs
- Device-specific troubleshooting guides
