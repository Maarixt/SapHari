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
      alerts: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
          widget_id: string | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          message: string
          read?: boolean
          type: string
          user_id: string
          widget_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string
          read?: boolean
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
            referencedRelation: "v_devices_overview"
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
      broker_settings: {
        Row: {
          created_at: string
          id: string
          password: string | null
          updated_at: string
          url: string
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          password?: string | null
          updated_at?: string
          url?: string
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          password?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string
          device_id: string
          device_key: string
          id: string
          name: string
          online: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_key: string
          id?: string
          name: string
          online?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_key?: string
          id?: string
          name?: string
          online?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_users_overview"
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
          min_value: number | null
          override_mode: boolean | null
          pin: number | null
          state: Json | null
          type: string
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
          min_value?: number | null
          override_mode?: boolean | null
          pin?: number | null
          state?: Json | null
          type: string
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
          min_value?: number | null
          override_mode?: boolean | null
          pin?: number | null
          state?: Json | null
          type?: string
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
            referencedRelation: "v_devices_overview"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_alerts_recent: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_name: string | null
          id: string | null
          message: string | null
          read: boolean | null
          type: string | null
          user_id: string | null
          user_name: string | null
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
            referencedRelation: "v_devices_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      v_audit_recent: {
        Row: {
          action: string | null
          actor_email: string | null
          actor_role: Database["public"]["Enums"]["app_role"] | null
          created_at: string | null
          details: Json | null
          id: string | null
          ip_address: string | null
          resource: string | null
          timestamp: string | null
          user_agent: string | null
        }
        Relationships: []
      }
      v_devices_overview: {
        Row: {
          alert_count: number | null
          created_at: string | null
          device_id: string | null
          device_key: string | null
          id: string | null
          name: string | null
          online: boolean | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          updated_at: string | null
          widget_count: number | null
        }
        Relationships: []
      }
      v_master_kpis: {
        Row: {
          alerts_24h: number | null
          offline_devices: number | null
          online_devices: number | null
          telemetry_bytes: number | null
          total_devices: number | null
          total_users: number | null
        }
        Relationships: []
      }
      v_users_overview: {
        Row: {
          created_at: string | null
          device_count: number | null
          display_name: string | null
          email: string | null
          id: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          unread_alerts: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_master_features: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_master_kpis: {
        Args: Record<PropertyKey, never>
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: {
        Args: { uid?: string }
        Returns: boolean
      }
      is_master_user: {
        Args: { uid?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "admin" | "developer" | "technician" | "user"
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
      app_role: ["master", "admin", "developer", "technician", "user"],
    },
  },
} as const
