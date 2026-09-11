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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_support_invite: {
        Row: {
          code_hash: string
          id: number
          updated_at: string
        }
        Insert: {
          code_hash: string
          id?: number
          updated_at?: string
        }
        Update: {
          code_hash?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_support_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      device_access_invites: {
        Row: {
          device_id: string
          expires_at: string
          token: string
        }
        Insert: {
          device_id: string
          expires_at: string
          token?: string
        }
        Update: {
          device_id?: string
          expires_at?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_access_invites_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_join_attempts: {
        Row: {
          attempted_at: string
          id: number
          succeeded: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          succeeded: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: number
          succeeded?: boolean
          user_id?: string
        }
        Relationships: []
      }
      device_member_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          device_id: string
          id: string
          new_role: string | null
          previous_role: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          device_id: string
          id?: string
          new_role?: string | null
          previous_role?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          device_id?: string
          id?: string
          new_role?: string | null
          previous_role?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_member_audit_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_members: {
        Row: {
          created_at: string | null
          device_id: string
          id: string
          is_authorized: boolean
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          id?: string
          is_authorized?: boolean
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          id?: string
          is_authorized?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_members_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_status_log: {
        Row: {
          battery_level: number | null
          device_id: string
          firmware_version: string | null
          id: number
          recorded_at: string
        }
        Insert: {
          battery_level?: number | null
          device_id: string
          firmware_version?: string | null
          id?: number
          recorded_at?: string
        }
        Update: {
          battery_level?: number | null
          device_id?: string
          firmware_version?: string | null
          id?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_status_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          alias: string | null
          battery_level: number
          created_at: string | null
          device_code: string
          firmware_version: string
          hardware_version: string
          id: string
          is_active: boolean
          last_measurement_at: string | null
          last_seen_at: string | null
          microclimate_sensor_type: string
          name: string
          pairing_mode_active: boolean
          transmission_interval_seconds: number
        }
        Insert: {
          alias?: string | null
          battery_level?: number
          created_at?: string | null
          device_code?: string
          firmware_version?: string
          hardware_version?: string
          id?: string
          is_active?: boolean
          last_measurement_at?: string | null
          last_seen_at?: string | null
          microclimate_sensor_type?: string
          name?: string
          pairing_mode_active?: boolean
          transmission_interval_seconds?: number
        }
        Update: {
          alias?: string | null
          battery_level?: number
          created_at?: string | null
          device_code?: string
          firmware_version?: string
          hardware_version?: string
          id?: string
          is_active?: boolean
          last_measurement_at?: string | null
          last_seen_at?: string | null
          microclimate_sensor_type?: string
          name?: string
          pairing_mode_active?: boolean
          transmission_interval_seconds?: number
        }
        Relationships: []
      }
      field_perimeters: {
        Row: {
          area_ha: number | null
          created_at: string
          field_name: string
          geom: unknown
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_ha?: number | null
          created_at?: string
          field_name: string
          geom: unknown
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_ha?: number | null
          created_at?: string
          field_name?: string
          geom?: unknown
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      firmware_releases: {
        Row: {
          binary_url: string | null
          created_at: string
          created_by: string | null
          hardware_target: string
          id: string
          is_mandatory: boolean
          is_published: boolean
          published_at: string | null
          release_notes: string | null
          sha256: string | null
          size_bytes: number | null
          version: string
        }
        Insert: {
          binary_url?: string | null
          created_at?: string
          created_by?: string | null
          hardware_target?: string
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          published_at?: string | null
          release_notes?: string | null
          sha256?: string | null
          size_bytes?: number | null
          version: string
        }
        Update: {
          binary_url?: string | null
          created_at?: string
          created_by?: string | null
          hardware_target?: string
          id?: string
          is_mandatory?: boolean
          is_published?: boolean
          published_at?: string | null
          release_notes?: string | null
          sha256?: string | null
          size_bytes?: number | null
          version?: string
        }
        Relationships: []
      }
      lab_validation_records: {
        Row: {
          concordance_pct: number | null
          created_at: string | null
          id: string
          lab_ec: number
          lab_k: number | null
          lab_n: number | null
          lab_name: string
          lab_p: number | null
          lab_ph: number
          lab_vwc: number
          sample_code: string
          sample_date: string
          soil_series: string | null
          terrasense_ec: number
          terrasense_k: number | null
          terrasense_n: number | null
          terrasense_p: number | null
          terrasense_ph: number
          terrasense_vwc: number
        }
        Insert: {
          concordance_pct?: number | null
          created_at?: string | null
          id?: string
          lab_ec: number
          lab_k?: number | null
          lab_n?: number | null
          lab_name: string
          lab_p?: number | null
          lab_ph: number
          lab_vwc: number
          sample_code: string
          sample_date: string
          soil_series?: string | null
          terrasense_ec: number
          terrasense_k?: number | null
          terrasense_n?: number | null
          terrasense_p?: number | null
          terrasense_ph: number
          terrasense_vwc: number
        }
        Update: {
          concordance_pct?: number | null
          created_at?: string | null
          id?: string
          lab_ec?: number
          lab_k?: number | null
          lab_n?: number | null
          lab_name?: string
          lab_p?: number | null
          lab_ph?: number
          lab_vwc?: number
          sample_code?: string
          sample_date?: string
          soil_series?: string | null
          terrasense_ec?: number
          terrasense_k?: number | null
          terrasense_n?: number | null
          terrasense_p?: number | null
          terrasense_ph?: number
          terrasense_vwc?: number
        }
        Relationships: []
      }
      predial_quadrants: {
        Row: {
          action_summary: string | null
          created_at: string | null
          device_id: string | null
          ec_us_cm: number
          geom: unknown
          id: string
          latitude: number
          longitude: number
          ph: number
          phenological_stage: string
          quadrant_code: string
          radius_m: number
          soil_temp_c: number
          verdict: string
          vwc_percent: number
        }
        Insert: {
          action_summary?: string | null
          created_at?: string | null
          device_id?: string | null
          ec_us_cm: number
          geom?: unknown
          id?: string
          latitude: number
          longitude: number
          ph: number
          phenological_stage?: string
          quadrant_code: string
          radius_m?: number
          soil_temp_c: number
          verdict: string
          vwc_percent: number
        }
        Update: {
          action_summary?: string | null
          created_at?: string | null
          device_id?: string | null
          ec_us_cm?: number
          geom?: unknown
          id?: string
          latitude?: number
          longitude?: number
          ph?: number
          phenological_stage?: string
          quadrant_code?: string
          radius_m?: number
          soil_temp_c?: number
          verdict?: string
          vwc_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "predial_quadrants_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number
          app_preferences: Json
          created_at: string | null
          email: string
          first_name: string
          frost_alerts_enabled: boolean
          id: string
          last_name: string
          moisture_alerts_enabled: boolean
          onboarding_completed_at: string | null
          onboarding_method: string | null
          ph_alerts_enabled: boolean
          phone: string | null
          role: string
          salinity_alerts_enabled: boolean
          status: string
          updated_at: string | null
        }
        Insert: {
          age?: number
          app_preferences?: Json
          created_at?: string | null
          email: string
          first_name: string
          frost_alerts_enabled?: boolean
          id: string
          last_name: string
          moisture_alerts_enabled?: boolean
          onboarding_completed_at?: string | null
          onboarding_method?: string | null
          ph_alerts_enabled?: boolean
          phone?: string | null
          role?: string
          salinity_alerts_enabled?: boolean
          status?: string
          updated_at?: string | null
        }
        Update: {
          age?: number
          app_preferences?: Json
          created_at?: string | null
          email?: string
          first_name?: string
          frost_alerts_enabled?: boolean
          id?: string
          last_name?: string
          moisture_alerts_enabled?: boolean
          onboarding_completed_at?: string | null
          onboarding_method?: string | null
          ph_alerts_enabled?: boolean
          phone?: string | null
          role?: string
          salinity_alerts_enabled?: boolean
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_alerts: {
        Row: {
          body: string
          category: string
          created_at: string | null
          device_id: string | null
          event_type: string | null
          id: string
          is_read: boolean
          requester_user_id: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          device_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean
          requester_user_id?: string | null
          severity?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          device_id?: string | null
          event_type?: string | null
          id?: string
          is_read?: boolean
          requester_user_id?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_measurements: {
        Row: {
          action_summary: string | null
          air_pressure_hpa: number | null
          battery_percent: number | null
          canopy_humidity_pct: number | null
          canopy_temp_c: number | null
          client_uuid: string | null
          crop_catalog_version: string
          crop_id: string
          device_id: string
          diagnosis: Json | null
          ec_us_cm: number
          engine_version: string
          field_name: string
          firmware_version: string | null
          geom: unknown
          gps_accuracy_m: number | null
          id: string
          latitude: number | null
          longitude: number | null
          measured_at: string | null
          nitrogen: number
          ph: number
          phenological_stage: string
          phosphorus: number
          potassium: number
          quadrant: string | null
          radius_m: number
          soil_temp_c: number
          soil_texture: string
          user_id: string | null
          verdict: string
          verdict_title: string
          vpd_kpa: number | null
          vwc_percent: number
        }
        Insert: {
          action_summary?: string | null
          air_pressure_hpa?: number | null
          battery_percent?: number | null
          canopy_humidity_pct?: number | null
          canopy_temp_c?: number | null
          client_uuid?: string | null
          crop_catalog_version?: string
          crop_id?: string
          device_id: string
          diagnosis?: Json | null
          ec_us_cm: number
          engine_version?: string
          field_name?: string
          firmware_version?: string | null
          geom?: unknown
          gps_accuracy_m?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          measured_at?: string | null
          nitrogen?: number
          ph: number
          phenological_stage?: string
          phosphorus?: number
          potassium?: number
          quadrant?: string | null
          radius_m?: number
          soil_temp_c: number
          soil_texture?: string
          user_id?: string | null
          verdict: string
          verdict_title: string
          vpd_kpa?: number | null
          vwc_percent: number
        }
        Update: {
          action_summary?: string | null
          air_pressure_hpa?: number | null
          battery_percent?: number | null
          canopy_humidity_pct?: number | null
          canopy_temp_c?: number | null
          client_uuid?: string | null
          crop_catalog_version?: string
          crop_id?: string
          device_id?: string
          diagnosis?: Json | null
          ec_us_cm?: number
          engine_version?: string
          field_name?: string
          firmware_version?: string | null
          geom?: unknown
          gps_accuracy_m?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          measured_at?: string | null
          nitrogen?: number
          ph?: number
          phenological_stage?: string
          phosphorus?: number
          potassium?: number
          quadrant?: string | null
          radius_m?: number
          soil_temp_c?: number
          soil_texture?: string
          user_id?: string | null
          verdict?: string
          verdict_title?: string
          vpd_kpa?: number | null
          vwc_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "soil_measurements_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soil_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_register_attempts: {
        Row: {
          attempted_at: string
          id: number
          succeeded: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: number
          succeeded: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: number
          succeeded?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_device_member: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: Json
      }
      admin_factory_reset_device: {
        Args: { p_confirm_device_code: string; p_device_id: string }
        Returns: Json
      }
      admin_get_device_detail: { Args: { p_device_id: string }; Returns: Json }
      admin_push_firmware_update: {
        Args: { p_device_id: string; p_firmware_release_id: string }
        Returns: Json
      }
      admin_rotate_invite_code: { Args: { p_new_code: string }; Returns: Json }
      admin_search: {
        Args: { p_query: string }
        Returns: {
          alias: string
          battery_level: number
          device_code: string
          device_id: string
          is_active: boolean
          last_seen_at: string
          match_reason: string
          matched_member_email: string
          name: string
        }[]
      }
      admin_set_member_authorized: {
        Args: { p_authorized: boolean; p_device_id: string; p_user_id: string }
        Returns: Json
      }
      admin_set_member_role: {
        Args: { p_device_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      admin_set_staff_active: {
        Args: { p_active: boolean; p_user_id: string }
        Returns: Json
      }
      admin_toggle_user_status: {
        Args: { p_new_status: string; p_user_id: string }
        Returns: Json
      }
      admin_unbind_user_device: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: Json
      }
      change_device_membership: {
        Args: { p_action: string; p_device_id: string; p_user_id: string }
        Returns: undefined
      }
      check_firmware_update: {
        Args: { p_device_id: string }
        Returns: {
          binary_url: string
          is_mandatory: boolean
          release_notes: string
          sha256: string
          size_bytes: number
          version: string
        }[]
      }
      complete_my_onboarding: { Args: { p_method: string }; Returns: string }
      generate_device_code: { Args: never; Returns: string }
      get_admin_dashboard_full_data: { Args: never; Returns: Json }
      get_device_access_qr: {
        Args: { p_device_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      has_device_access: { Args: { p_device_id: string }; Returns: boolean }
      has_device_admin_access: {
        Args: { p_device_id: string }
        Returns: boolean
      }
      is_support_staff: { Args: never; Returns: boolean }
      join_device_by_code: {
        Args: { p_code: string }
        Returns: {
          device_id: string
          device_name: string
          is_authorized: boolean
          role: string
        }[]
      }
      join_device_by_invite: {
        Args: { p_token: string }
        Returns: {
          alert_id: string
          device_id: string
          device_name: string
          is_authorized: boolean
          role: string
        }[]
      }
      list_device_members: {
        Args: { p_device_id: string }
        Returns: {
          email: string
          full_name: string
          is_authorized: boolean
          role: string
          user_id: string
        }[]
      }
      list_my_pending_device_requests: {
        Args: never
        Returns: {
          administrator_email: string
          administrator_name: string
          device_id: string
        }[]
      }
      manage_device_member: {
        Args: {
          p_action: string
          p_device_id: string
          p_role?: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      purge_expired_operational_data: {
        Args: never
        Returns: {
          audit_rows_deleted: number
          join_attempts_deleted: number
        }[]
      }
      register_and_pair_device: {
        Args: {
          p_alias?: string
          p_device_code: string
          p_device_name?: string
          p_user_id: string
        }
        Returns: Json
      }
      register_paired_device: {
        Args: { p_code: string; p_name?: string }
        Returns: {
          device_id: string
        }[]
      }
      request_device_access_qr: {
        Args: { p_device_code: string; p_user_id: string }
        Returns: Json
      }
      support_self_register: {
        Args: { p_full_name: string; p_invite_code: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
