// Audit logging service for master dashboard aggregations

import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
}

export class AuditService {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log audit event:', error);
        throw error;
      }

      console.log('✅ Audit event logged:', entry.action);
    } catch (error) {
      console.error('Error logging audit event:', error);
      throw error;
    }
  }

  /**
   * Log device reassignment
   */
  static async logDeviceReassign(
    deviceId: string, 
    fromUser: string, 
    toUser: string, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action: 'device_reassign',
      target_type: 'device',
      target_id: deviceId,
      details: { fromUser, toUser }
    });
  }

  /**
   * Log role change
   */
  static async logRoleChange(
    userId: string, 
    fromRole: string, 
    toRole: string, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action: 'role_change',
      target_type: 'user',
      target_id: userId,
      details: { fromRole, toRole }
    });
  }

  /**
   * Log maintenance mode toggle
   */
  static async logMaintenanceMode(
    enabled: boolean, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action: 'maintenance_mode',
      target_type: 'system',
      target_id: 'system',
      details: { enabled }
    });
  }

  /**
   * Log system action
   */
  static async logSystemAction(
    action: string, 
    details: Record<string, any> = {}, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action,
      target_type: 'system',
      target_id: 'system',
      details
    });
  }

  /**
   * Log device action
   */
  static async logDeviceAction(
    deviceId: string, 
    action: string, 
    details: Record<string, any> = {}, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action,
      target_type: 'device',
      target_id: deviceId,
      details
    });
  }

  /**
   * Log user action
   */
  static async logUserAction(
    userId: string, 
    action: string, 
    details: Record<string, any> = {}, 
    actorId?: string
  ): Promise<void> {
    await this.log({
      actor_id: actorId || null,
      action,
      target_type: 'user',
      target_id: userId,
      details
    });
  }

  /**
   * Get current user ID for audit logging
   */
  static async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Log with current user as actor
   */
  static async logWithCurrentUser(
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const actorId = await this.getCurrentUserId();
    await this.log({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    });
  }
}
