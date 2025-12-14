export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          condition: string
          cooldown_seconds: number
          created_at: string
          description: string | null
          device_id: string | null
          enabled: boolean
          expected_value: string | null
          id: string
          last_fired_at: string | null
          message_template: string
          name: string
          org_id: string | null
          pin: number | null
          sensor_key: string | null
          severity: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condition?: string
          cooldown_seconds?: number
          created_at?: string
          description?: string | null
          device_id?: string | null
          enabled?: boolean
          expected_value?: string | null
          id?: string
          last_fired_at?: string | null
          message_template: string
          name: string
          org_id?: string | null
          pin?: number | null
          sensor_key?: string | null
          severity?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: string
          cooldown_seconds?: number
          created_at?: string
          description?: string | null
          device_id?: string | null
          enabled?: boolean
          expected_value?: string | null
          id?: string
          last_fired_at?: string | null
          message_template?: string
          name?: string
          org_id?: string | null
          pin?: number | null
          sensor_key?: string | null
          severity?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          ack_by: string | null
          closed_at: string | null
          created_at: string
          details: Json | null
          device_id: string | null
          id: string
          message: string
          read: boolean
          rule_id: string | null
          severity: Database["public"]["Enums"]["alert_severity"] | null
          state: Database["public"]["Enums"]["alert_state"] | null
          type: string
          user_id: string
          widget_id: string | null
        }
        Insert: {
          ack_by?: string | null
          closed_at?: string | null
          created_at?: string
          details?: Json | null
          device_id?: string | null
          id?: string
          message: string
          read?: boolean
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          state?: Database["public"]["Enums"]["alert_state"] | null
          type: string
          user_id: string
          widget_id?: string | null
        }
        Update: {
          ack_by?: string | null
          closed_at?: string | null
          created_at?: string
          details?: Json | null
          device_id?: string | null
          id?: string
          message?: string
          read?: boolean
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"] | null
          state?: Database["public"]["Enums"]["alert_state"] | null
          type?: string
          user_id?: string
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string
          actor_role: Database["public"]["Enums"]["app_role"]
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email: string
          actor_role: Database["public"]["Enums"]["app_role"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string
          actor_role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json | null
          cooldown_seconds: number | null
          created_at: string
          description: string | null
          device_id: string | null
          enabled: boolean
          execution_count: number | null
          id: string
          last_triggered_at: string | null
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json | null
          cooldown_seconds?: number | null
          created_at?: string
          description?: string | null
          device_id?: string | null
          enabled?: boolean
          execution_count?: number | null
          id?: string
          last_triggered_at?: string | null
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json | null
          cooldown_seconds?: number | null
          created_at?: string
          description?: string | null
          device_id?: string | null
          enabled?: boolean
          execution_count?: number | null
          id?: string
          last_triggered_at?: string | null
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_settings: {
        Row: {
          created_at: string
          id: string
          password: string | null
          port: number | null
          updated_at: string
          url: string
          use_tls: boolean | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          password?: string | null
          port?: number | null
          updated_at?: string
          url?: string
          use_tls?: boolean | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          password?: string | null
          port?: number | null
          updated_at?: string
          url?: string
          use_tls?: boolean | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      commands: {
        Row: {
          acknowledged_at: string | null
          command: string
          created_at: string
          device_id: string
          error_message: string | null
          id: string
          payload: Json | null
          req_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["command_status"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          command: string
          created_at?: string
          device_id: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          req_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["command_status"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          command?: string
          created_at?: string
          device_id?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          req_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["command_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      device_permissions: {
        Row: {
          access: Database["public"]["Enums"]["access_level"]
          created_at: string
          device_id: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          device_id: string
          id?: string
          org_id: string
          user_id: string
        }
        Update: {
          access?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          device_id?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_permissions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_permissions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_presence_events: {
        Row: {
          created_at: string
          device_id: string
          id: string
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          source?: string | null
          status: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_id: string
          device_key: string
          firmware: string | null
          firmware_version: string | null
          id: string
          last_seen: string | null
          location: Json | null
          metadata: Json | null
          model: string | null
          name: string
          online: boolean
          org_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_key: string
          firmware?: string | null
          firmware_version?: string | null
          id?: string
          last_seen?: string | null
          location?: Json | null
          metadata?: Json | null
          model?: string | null
          name: string
          online?: boolean
          org_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_key?: string
          firmware?: string | null
          firmware_version?: string | null
          id?: string
          last_seen?: string | null
          location?: Json | null
          metadata?: Json | null
          model?: string | null
          name?: string
          online?: boolean
          org_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      master_2fa_secrets: {
        Row: {
          backup_codes_encrypted: string[] | null
          created_at: string
          enabled: boolean
          id: string
          last_used_at: string | null
          secret_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes_encrypted?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          secret_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes_encrypted?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          last_used_at?: string | null
          secret_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      master_login_attempts: {
        Row: {
          attempt_time: string
          email: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_broker_override: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          password: string | null
          tcp_host: string
          tcp_port: number
          tls_port: number | null
          updated_at: string | null
          use_tls: boolean | null
          username: string | null
          wss_port: number | null
          wss_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          password?: string | null
          tcp_host: string
          tcp_port?: number
          tls_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
          wss_port?: number | null
          wss_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          password?: string | null
          tcp_host?: string
          tcp_port?: number
          tls_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
          wss_port?: number | null
          wss_url?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by_user_id: string
          invitee_email: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          invitee_email: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          invitee_email?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          type: Database["public"]["Enums"]["org_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          type?: Database["public"]["Enums"]["org_type"]
          updated_at?: string
        }
        Relationships: []
      }
      platform_broker_config: {
        Row: {
          created_at: string | null
          dashboard_password: string | null
          dashboard_username: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          password: string | null
          tcp_host: string
          tcp_port: number
          tls_port: number | null
          updated_at: string | null
          use_tls: boolean | null
          username: string | null
          wss_port: number | null
          wss_url: string
        }
        Insert: {
          created_at?: string | null
          dashboard_password?: string | null
          dashboard_username?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          password?: string | null
          tcp_host?: string
          tcp_port?: number
          tls_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
          wss_port?: number | null
          wss_url?: string
        }
        Update: {
          created_at?: string | null
          dashboard_password?: string | null
          dashboard_username?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          password?: string | null
          tcp_host?: string
          tcp_port?: number
          tls_port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
          username?: string | null
          wss_port?: number | null
          wss_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sim_circuits: {
        Row: {
          created_at: string
          description: string | null
          id: string
          json: Json
          name: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          json: Json
          name: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          json?: Json
          name?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telemetry: {
        Row: {
          device_id: string
          id: number
          metadata: Json | null
          topic: string
          ts: string
          v_json: Json | null
          v_num: number | null
          v_str: string | null
          widget_id: string | null
        }
        Insert: {
          device_id: string
          id?: number
          metadata?: Json | null
          topic: string
          ts?: string
          v_json?: Json | null
          v_num?: number | null
          v_str?: string | null
          widget_id?: string | null
        }
        Update: {
          device_id?: string
          id?: number
          metadata?: Json | null
          topic?: string
          ts?: string
          v_json?: Json | null
          v_num?: number | null
          v_str?: string | null
          widget_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      widget_permissions: {
        Row: {
          access: Database["public"]["Enums"]["access_level"]
          created_at: string
          device_id: string
          id: string
          user_id: string
          widget_key: string
          widget_type: string
        }
        Insert: {
          access?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          device_id: string
          id?: string
          user_id: string
          widget_key: string
          widget_type: string
        }
        Update: {
          access?: Database["public"]["Enums"]["access_level"]
          created_at?: string
          device_id?: string
          id?: string
          user_id?: string
          widget_key?: string
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_permissions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_permissions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      widgets: {
        Row: {
          address: string
          created_at: string
          device_id: string
          echo_pin: number | null
          gauge_type: string | null
          id: string
          label: string
          max_value: number | null
          message: string | null
          min_value: number | null
          override_mode: boolean | null
          pin: number | null
          state: Json | null
          trigger: string | null
          type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          device_id: string
          echo_pin?: number | null
          gauge_type?: string | null
          id?: string
          label: string
          max_value?: number | null
          message?: string | null
          min_value?: number | null
          override_mode?: boolean | null
          pin?: number | null
          state?: Json | null
          trigger?: string | null
          type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          device_id?: string
          echo_pin?: number | null
          gauge_type?: string | null
          id?: string
          label?: string
          max_value?: number | null
          message?: string | null
          min_value?: number | null
          override_mode?: boolean | null
          pin?: number | null
          state?: Json | null
          trigger?: string | null
          type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "widgets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widgets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      devices_safe: {
        Row: {
          created_at: string | null
          device_id: string | null
          firmware: string | null
          firmware_version: string | null
          id: string | null
          last_seen: string | null
          location: Json | null
          metadata: Json | null
          model: string | null
          name: string | null
          online: boolean | null
          org_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          firmware?: string | null
          firmware_version?: string | null
          id?: string | null
          last_seen?: string | null
          location?: Json | null
          metadata?: Json | null
          model?: string | null
          name?: string | null
          online?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          firmware?: string | null
          firmware_version?: string | null
          id?: string | null
          last_seen?: string | null
          location?: Json | null
          metadata?: Json | null
          model?: string | null
          name?: string | null
          online?: boolean | null
          org_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_master_features: { Args: never; Returns: boolean }
      can_delete_org_member: {
        Args: { p_org_id: string; p_target_user_id: string }
        Returns: boolean
      }
      check_master_login_rate_limit: {
        Args: { p_email: string; p_ip_address?: string }
        Returns: boolean
      }
      create_device: {
        Args: { _device_id: string; _name: string; _user_id?: string }
        Returns: string
      }
      create_organization_with_owner: {
        Args: { p_name: string; p_type?: string }
        Returns: string
      }
      dashboard_next_booking: {
        Args: never
        Returns: {
          id: string
          parish: string
          pro_name: string
          professional_id: string
          service_id: string
          starts_at: string
          title: string
        }[]
      }
      get_device_access: {
        Args: { p_device_id: string; p_user_id?: string }
        Returns: Database["public"]["Enums"]["access_level"]
      }
      get_device_key_once: {
        Args: { p_device_id: string }
        Returns: {
          device_key: string
          time_remaining_seconds: number
        }[]
      }
      get_effective_broker_config: {
        Args: { p_organization_id?: string; p_user_id?: string }
        Returns: {
          password: string
          source: string
          tcp_host: string
          tcp_port: number
          tls_port: number
          use_tls: boolean
          username: string
          wss_port: number
          wss_url: string
        }[]
      }
      get_master_kpis: {
        Args: never
        Returns: {
          critical_alerts_24h: number
          devices_offline: number
          devices_online: number
          errors_24h: number
          generated_at: string
          mqtt_bytes_24h: number
          mqtt_messages_24h: number
          total_devices: number
          total_users: number
        }[]
      }
      get_org_role: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      get_production_broker_config: {
        Args: never
        Returns: {
          password: string
          tcp_host: string
          tcp_port: number
          tls_port: number
          use_tls: boolean
          username: string
          wss_path: string
          wss_port: number
          wss_url: string
        }[]
      }
      get_user_role: {
        Args: { _user_id?: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { uid?: string }; Returns: boolean }
      is_master_user: { Args: { uid?: string }; Returns: boolean }
      is_org_admin: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { p_org_id: string; p_user_id?: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _actor_email: string
          _actor_role: Database["public"]["Enums"]["app_role"]
          _details?: Json
          _resource?: string
        }
        Returns: string
      }
      rotate_device_key: { Args: { p_device_id: string }; Returns: string }
      upsert_broker_settings: {
        Args: {
          p_password?: string
          p_port?: number
          p_url: string
          p_use_tls?: boolean
          p_username?: string
        }
        Returns: string
      }
      user_owns_device: {
        Args: { _device_id: string; _user_id?: string }
        Returns: boolean
      }
      user_owns_widget: {
        Args: { _user_id?: string; _widget_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "full" | "control" | "view" | "deny"
      alert_severity: "info" | "warn" | "crit"
      alert_state: "open" | "ack" | "closed"
      app_role: "user" | "technician" | "developer" | "admin" | "master"
      command_status: "pending" | "sent" | "acknowledged" | "failed"
      invite_status: "pending" | "accepted" | "expired" | "revoked"
      org_role: "owner" | "admin" | "member" | "viewer"
      org_type: "house" | "farm" | "business" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_level: ["full", "control", "view", "deny"],
      alert_severity: ["info", "warn", "crit"],
      alert_state: ["open", "ack", "closed"],
      app_role: ["user", "technician", "developer", "admin", "master"],
      command_status: ["pending", "sent", "acknowledged", "failed"],
      invite_status: ["pending", "accepted", "expired", "revoked"],
      org_role: ["owner", "admin", "member", "viewer"],
      org_type: ["house", "farm", "business", "other"],
    },
  },
} as const
