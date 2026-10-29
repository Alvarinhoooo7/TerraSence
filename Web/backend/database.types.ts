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
    PostgrestVersion: "14.17"
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
      device_data_resets: {
        Row: {
          device_id: string
          generation: number
          user_id: string
        }
        Insert: {
          device_id: string
          generation: number
          user_id: string
        }
        Update: {
          device_id?: string
          generation?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_data_resets_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_firmware_updates: {
        Row: {
          device_id: string
          error: string | null
          id: string
          release_id: string
          sent_at: string
          sent_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          device_id: string
          error?: string | null
          id?: string
          release_id: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          device_id?: string
          error?: string | null
          id?: string
          release_id?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_firmware_updates_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_firmware_updates_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "firmware_releases"
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
          battery_level: number | null
          created_at: string | null
          data_generation: number
          device_code: string
          firmware_version: string | null
          first_seen_at: string | null
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
          battery_level?: number | null
          created_at?: string | null
          data_generation?: number
          device_code?: string
          firmware_version?: string | null
          first_seen_at?: string | null
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
          battery_level?: number | null
          created_at?: string | null
          data_generation?: number
          device_code?: string
          firmware_version?: string | null
          first_seen_at?: string | null
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
          storage_path: string | null
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
          storage_path?: string | null
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
          storage_path?: string | null
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
      notification_recipients: {
        Row: {
          alert_id: string
          cancelled_at: string | null
          read_at: string | null
          user_id: string
        }
        Insert: {
          alert_id: string
          cancelled_at?: string | null
          read_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string
          cancelled_at?: string | null
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "push_alerts"
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
          push_token: string | null
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
          push_token?: string | null
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
          push_token?: string | null
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
          expires_at: string
          id: string
          is_read: boolean
          requester_user_id: string | null
          severity: string
          source_transaction: number | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          device_id?: string | null
          event_type?: string | null
          expires_at?: string
          id?: string
          is_read?: boolean
          requester_user_id?: string | null
          severity?: string
          source_transaction?: number | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          device_id?: string | null
          event_type?: string | null
          expires_at?: string
          id?: string
          is_read?: boolean
          requester_user_id?: string | null
          severity?: string
          source_transaction?: number | null
          status?: string
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
      push_deliveries: {
        Row: {
          alert_id: string
          attempts: number
          created_at: string
          id: string
          installation_id: string
          last_error: string | null
          lease_id: string | null
          leased_until: string | null
          next_attempt_at: string
          receipt_checked_at: string | null
          state: string
          ticket_at: string | null
          ticket_id: string | null
          token_generation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          created_at?: string
          id?: string
          installation_id: string
          last_error?: string | null
          lease_id?: string | null
          leased_until?: string | null
          next_attempt_at?: string
          receipt_checked_at?: string | null
          state?: string
          ticket_at?: string | null
          ticket_id?: string | null
          token_generation: number
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          created_at?: string
          id?: string
          installation_id?: string
          last_error?: string | null
          lease_id?: string | null
          leased_until?: string | null
          next_attempt_at?: string
          receipt_checked_at?: string | null
          state?: string
          ticket_at?: string | null
          ticket_id?: string | null
          token_generation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_deliveries_alert_id_user_id_fkey"
            columns: ["alert_id", "user_id"]
            isOneToOne: false
            referencedRelation: "notification_recipients"
            referencedColumns: ["alert_id", "user_id"]
          },
          {
            foreignKeyName: "push_deliveries_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "push_installations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_installations: {
        Row: {
          created_at: string
          expo_push_token: string | null
          id: string
          permission: string
          platform: string
          revoked_at: string | null
          secret_hash: string
          session_id: string | null
          token_generation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token?: string | null
          id: string
          permission: string
          platform: string
          revoked_at?: string | null
          secret_hash: string
          session_id?: string | null
          token_generation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string | null
          id?: string
          permission?: string
          platform?: string
          revoked_at?: string | null
          secret_hash?: string
          session_id?: string | null
          token_generation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_recovery_cutoffs: {
        Row: {
          blocked_through: string
          user_id: string
        }
        Insert: {
          blocked_through: string
          user_id: string
        }
        Update: {
          blocked_through?: string
          user_id?: string
        }
        Relationships: []
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
          data_generation: number
          device_id: string
          diagnosis: Json | null
          ec_us_cm: number
          engine_version: string
          field_name: string
          firmware_version: string | null
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
          data_generation?: number
          device_id: string
          diagnosis?: Json | null
          ec_us_cm: number
          engine_version?: string
          field_name?: string
          firmware_version?: string | null
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
          data_generation?: number
          device_id?: string
          diagnosis?: Json | null
          ec_us_cm?: number
          engine_version?: string
          field_name?: string
          firmware_version?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_member: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_cancel_update: { Args: { p_device_id: string }; Returns: undefined }
      admin_create_release: {
        Args: {
          p_is_mandatory?: boolean
          p_notes: string
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
          p_version: string
        }
        Returns: string
      }
      admin_delete_release: { Args: { p_release_id: string }; Returns: string }
      admin_device_measurements: {
        Args: {
          p_device_id: string
          p_limit?: number
          p_offset?: number
          p_species_id?: string
          p_stage?: string
          p_without_species?: boolean
        }
        Returns: {
          action_summary: string
          air_pressure_hpa: number
          battery_percent: number
          canopy_humidity_pct: number
          canopy_temp_c: number
          ec_us_cm: number
          id: string
          latitude: number
          longitude: number
          measured_at: string
          nitrogen: number
          ph: number
          phenological_stage: string
          phosphorus: number
          potassium: number
          soil_temp_c: number
          species: Json
          verdict: string
          verdict_title: string
          vwc_percent: number
          weather: Json
        }[]
      }
      admin_device_members: {
        Args: { p_device_id: string }
        Returns: {
          created_at: string
          email: string
          first_name: string
          is_authorized: boolean
          last_name: string
          role: string
          user_id: string
        }[]
      }
      admin_device_species: {
        Args: { p_device_id: string }
        Returns: {
          last_measured_at: string
          measurements: number
          species: Json
        }[]
      }
      admin_device_status: {
        Args: { p_device_id: string }
        Returns: {
          battery_level: number
          device_code: string
          device_id: string
          firmware_version: string
          first_seen_at: string
          is_online: boolean
          last_seen_at: string
        }[]
      }
      admin_device_update: {
        Args: { p_device_id: string }
        Returns: {
          error: string
          sent_at: string
          status: string
          update_id: string
          updated_at: string
          version: string
        }[]
      }
      admin_list_releases: {
        Args: never
        Returns: {
          created_at: string
          failed: number
          id: string
          installed: number
          installing: number
          is_mandatory: boolean
          is_published: boolean
          pending: number
          published_at: string
          release_notes: string
          sha256: string
          size_bytes: number
          storage_path: string
          version: string
        }[]
      }
      admin_make_admin: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_publish_release: {
        Args: { p_release_id: string }
        Returns: undefined
      }
      admin_reject_member: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: undefined
      }
      admin_release_devices: {
        Args: { p_release_id: string }
        Returns: {
          device_code: string
          device_id: string
          error: string
          status: string
          updated_at: string
        }[]
      }
      admin_reset_device: { Args: { p_device_id: string }; Returns: Json }
      admin_search: {
        Args: { p_query: string }
        Returns: {
          device_code: string
          device_id: string
          email: string
          first_name: string
          is_authorized: boolean
          last_name: string
          role: string
          user_id: string
        }[]
      }
      admin_send_update: {
        Args: { p_device_id: string; p_release_id: string }
        Returns: string
      }
      admin_send_update_all: { Args: { p_release_id: string }; Returns: Json }
      assert_support_staff: { Args: never; Returns: undefined }
      assign_firmware_update: {
        Args: {
          p_device_id: string
          p_release: Database["public"]["Tables"]["firmware_releases"]["Row"]
        }
        Returns: string
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
      create_device_event: {
        Args: {
          p_device_id: string
          p_event: string
          p_requester?: string
          p_source_transaction?: number
          p_user_id: string
        }
        Returns: string
      }
      firmware_is_newer: {
        Args: { p_installed: string; p_release: string }
        Returns: boolean
      }
      firmware_update_progress: {
        Args: { p_action: string; p_error?: string; p_update_id: string }
        Returns: undefined
      }
      generate_device_code: { Args: never; Returns: string }
      get_device_access_qr: {
        Args: { p_device_id: string }
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      get_my_notification: {
        Args: { p_alert_id: string }
        Returns: {
          body: string
          created_at: string
          device_id: string
          event_type: string
          id: string
          read_at: string
          status: string
          title: string
        }[]
      }
      has_device_access: { Args: { p_device_id: string }; Returns: boolean }
      has_device_admin_access: {
        Args: { p_device_id: string }
        Returns: boolean
      }
      invoke_push_dispatch: { Args: never; Returns: undefined }
      is_backoffice_email: { Args: { p_email: string }; Returns: boolean }
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
      list_my_notifications: {
        Args: { p_before?: string; p_before_id?: string; p_limit?: number }
        Returns: {
          body: string
          created_at: string
          device_id: string
          event_type: string
          id: string
          read_at: string
          status: string
          title: string
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
      mark_notification_read: {
        Args: { p_alert_id: string }
        Returns: undefined
      }
      measurement_species: { Args: { p_diagnosis: Json }; Returns: Json }
      my_firmware_updates: {
        Args: never
        Returns: {
          device_code: string
          device_id: string
          device_name: string
          is_mandatory: boolean
          release_notes: string
          sent_at: string
          sha256: string
          size_bytes: number
          status: string
          storage_path: string
          update_id: string
          version: string
        }[]
      }
      notification_access_allowed: {
        Args: {
          p_alert: Database["public"]["Tables"]["push_alerts"]["Row"]
          p_user_id: string
        }
        Returns: boolean
      }
      notification_copy: {
        Args: { p_event: string; p_language: string }
        Returns: {
          body: string
          title: string
        }[]
      }
      notification_dispatch_allowed: {
        Args: {
          p_alert: Database["public"]["Tables"]["push_alerts"]["Row"]
          p_user_id: string
        }
        Returns: boolean
      }
      purge_expired_operational_data: {
        Args: never
        Returns: {
          audit_rows_deleted: number
          join_attempts_deleted: number
        }[]
      }
      purge_push_notifications: {
        Args: never
        Returns: {
          alerts_deleted: number
          installations_deleted: number
          job_runs_deleted: number
        }[]
      }
      push_dispatch_health: {
        Args: never
        Returns: {
          awaiting_receipt: number
          dispatch_last_run: string
          dispatch_last_status: string
          failed_24h: number
          failures_by_error: Json
          last_ticket_at: string
          leased: number
          leases_expired: number
          oldest_ticket_age: string
          queue_oldest_age: string
          queue_ready: number
          receipts_overdue: number
          retention_last_run: string
          retention_last_status: string
          retrying: number
          uncertain_24h: number
          vault_configured: boolean
        }[]
      }
      push_error_class: { Args: { p_error: string }; Returns: string }
      push_session_valid: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: boolean
      }
      record_admin_transfer: {
        Args: { p_device_id: string; p_user_id: string }
        Returns: string
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
      register_push_installation: {
        Args: {
          p_expo_push_token: string
          p_installation_id: string
          p_installation_secret: string
          p_permission: string
          p_platform: string
        }
        Returns: undefined
      }
      report_device_contact: {
        Args: {
          p_battery?: number
          p_contacted_at?: string
          p_device_code: string
          p_firmware_version?: string
        }
        Returns: undefined
      }
      report_push_receipt: {
        Args: {
          p_delivery_id: string
          p_error?: string
          p_invalid_token?: boolean
          p_lease_id: string
          p_status: string
        }
        Returns: undefined
      }
      report_push_ticket: {
        Args: {
          p_delivery_id: string
          p_error?: string
          p_invalid_token?: boolean
          p_lease_id: string
          p_ticket_id?: string
        }
        Returns: undefined
      }
      request_device_access_qr: {
        Args: { p_device_code: string; p_user_id: string }
        Returns: Json
      }
      reserve_push_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          alert_id: string
          body: string
          delivery_id: string
          device_id: string
          event_type: string
          expires_at: string
          expo_push_token: string
          lease_id: string
          title: string
          token_generation: number
        }[]
      }
      reserve_push_receipts: {
        Args: { p_limit?: number }
        Returns: {
          delivery_id: string
          lease_id: string
          ticket_id: string
        }[]
      }
      resolve_access_requests: {
        Args: { p_device_id: string; p_requester: string }
        Returns: undefined
      }
      revoke_push_for_password_recovery: { Args: never; Returns: undefined }
      revoke_push_installation: {
        Args: { p_installation_id: string; p_installation_secret: string }
        Returns: undefined
      }
      revoke_push_installation_by_secret: {
        Args: { p_installation_id: string; p_installation_secret: string }
        Returns: undefined
      }
      semver_parts: { Args: { p_version: string }; Returns: number[] }
      validate_push_lease: {
        Args: { p_delivery_id: string; p_lease_id: string }
        Returns: boolean
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

