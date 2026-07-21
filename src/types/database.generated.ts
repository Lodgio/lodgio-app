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
  public: {
    Tables: {
      bookings: {
        Row: {
          airbnb_booking_id: string
          amount_paid_by_guest: number | null
          amount_payable_to_airbnb: number | null
          amount_payable_to_host: number | null
          check_in: string
          check_out: string
          created_at: string
          guest_count: number
          guest_id: string | null
          guest_notes: string | null
          host_id: string
          id: string
          nights: number
          property_id: string | null
          raw_email_ref: string | null
          sheets_exported_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          airbnb_booking_id: string
          amount_paid_by_guest?: number | null
          amount_payable_to_airbnb?: number | null
          amount_payable_to_host?: number | null
          check_in: string
          check_out: string
          created_at?: string
          guest_count?: number
          guest_id?: string | null
          guest_notes?: string | null
          host_id: string
          id?: string
          nights: number
          property_id?: string | null
          raw_email_ref?: string | null
          sheets_exported_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          airbnb_booking_id?: string
          amount_paid_by_guest?: number | null
          amount_payable_to_airbnb?: number | null
          amount_payable_to_host?: number | null
          check_in?: string
          check_out?: string
          created_at?: string
          guest_count?: number
          guest_id?: string | null
          guest_notes?: string | null
          host_id?: string
          id?: string
          nights?: number
          property_id?: string | null
          raw_email_ref?: string | null
          sheets_exported_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      caretakers: {
        Row: {
          created_at: string
          host_id: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caretakers_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          booking_id: string | null
          check_in: string | null
          check_out: string | null
          claimed_airbnb_booking_id: string
          created_at: string
          guest_count: number | null
          host_id: string
          id: string
          id_document_path: string
          id_document_type: Database["public"]["Enums"]["id_document_type"]
          matched: boolean
          name: string
          whatsapp_number: string
        }
        Insert: {
          booking_id?: string | null
          check_in?: string | null
          check_out?: string | null
          claimed_airbnb_booking_id: string
          created_at?: string
          guest_count?: number | null
          host_id: string
          id?: string
          id_document_path: string
          id_document_type: Database["public"]["Enums"]["id_document_type"]
          matched?: boolean
          name: string
          whatsapp_number: string
        }
        Update: {
          booking_id?: string | null
          check_in?: string | null
          check_out?: string | null
          claimed_airbnb_booking_id?: string
          created_at?: string
          guest_count?: number | null
          host_id?: string
          id?: string
          id_document_path?: string
          id_document_type?: Database["public"]["Enums"]["id_document_type"]
          matched?: boolean
          name?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_connections: {
        Row: {
          created_at: string
          email_address: string
          host_id: string
          id: string
          last_synced_at: string | null
          refresh_token: string
          status: Database["public"]["Enums"]["gmail_connection_status"]
          sync_cursor: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_address: string
          host_id: string
          id?: string
          last_synced_at?: string | null
          refresh_token: string
          status?: Database["public"]["Enums"]["gmail_connection_status"]
          sync_cursor?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_address?: string
          host_id?: string
          id?: string
          last_synced_at?: string | null
          refresh_token?: string
          status?: Database["public"]["Enums"]["gmail_connection_status"]
          sync_cursor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_connections_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          created_at: string
          host_id: string
          id: string
          name: string | null
          relay_email: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          name?: string | null
          relay_email: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          name?: string | null
          relay_email?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      host_settings: {
        Row: {
          created_at: string
          default_language: Database["public"]["Enums"]["message_language"]
          host_id: string
          onboarding_step: number
          sheets_export_enabled: boolean
          sheets_spreadsheet_id: string | null
          sms_fallback_enabled: boolean
          updated_at: string
          whatsapp_phone_number_id: string | null
          whatsapp_waba_id: string | null
        }
        Insert: {
          created_at?: string
          default_language?: Database["public"]["Enums"]["message_language"]
          host_id: string
          onboarding_step?: number
          sheets_export_enabled?: boolean
          sheets_spreadsheet_id?: string | null
          sms_fallback_enabled?: boolean
          updated_at?: string
          whatsapp_phone_number_id?: string | null
          whatsapp_waba_id?: string | null
        }
        Update: {
          created_at?: string
          default_language?: Database["public"]["Enums"]["message_language"]
          host_id?: string
          onboarding_step?: number
          sheets_export_enabled?: boolean
          sheets_spreadsheet_id?: string | null
          sms_fallback_enabled?: boolean
          updated_at?: string
          whatsapp_phone_number_id?: string | null
          whatsapp_waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_settings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: true
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      hosts: {
        Row: {
          auth_user_id: string
          business_name: string
          created_at: string
          id: string
          phone: string
          slug: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          business_name?: string
          created_at?: string
          id?: string
          phone?: string
          slug: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          business_name?: string
          created_at?: string
          id?: string
          phone?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_log: {
        Row: {
          booking_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          error: string | null
          host_id: string
          id: string
          recipient_type: Database["public"]["Enums"]["message_recipient_type"]
          status: Database["public"]["Enums"]["message_delivery_status"]
          template_kind: string | null
          to_number: string
          updated_at: string
          wamid: string | null
        }
        Insert: {
          booking_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          error?: string | null
          host_id: string
          id?: string
          recipient_type: Database["public"]["Enums"]["message_recipient_type"]
          status?: Database["public"]["Enums"]["message_delivery_status"]
          template_kind?: string | null
          to_number: string
          updated_at?: string
          wamid?: string | null
        }
        Update: {
          booking_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          error?: string | null
          host_id?: string
          id?: string
          recipient_type?: Database["public"]["Enums"]["message_recipient_type"]
          status?: Database["public"]["Enums"]["message_delivery_status"]
          template_kind?: string | null
          to_number?: string
          updated_at?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_log_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_preview: string
          created_at: string
          host_id: string
          id: string
          kind: Database["public"]["Enums"]["message_template_kind"]
          language: Database["public"]["Enums"]["message_language"]
          meta_template_name: string
          updated_at: string
        }
        Insert: {
          body_preview?: string
          created_at?: string
          host_id: string
          id?: string
          kind: Database["public"]["Enums"]["message_template_kind"]
          language: Database["public"]["Enums"]["message_language"]
          meta_template_name: string
          updated_at?: string
        }
        Update: {
          body_preview?: string
          created_at?: string
          host_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_template_kind"]
          language?: Database["public"]["Enums"]["message_language"]
          meta_template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          created_at: string
          host_id: string
          house_rules: string | null
          id: string
          location_url: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          host_id: string
          house_rules?: string | null
          id?: string
          location_url?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          host_id?: string
          house_rules?: string | null
          id?: string
          location_url?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "hosts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_caretakers: {
        Row: {
          caretaker_id: string
          property_id: string
        }
        Insert: {
          caretaker_id: string
          property_id: string
        }
        Update: {
          caretaker_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_caretakers_caretaker_id_fkey"
            columns: ["caretaker_id"]
            isOneToOne: false
            referencedRelation: "caretakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_caretakers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_host_id: { Args: never; Returns: string }
    }
    Enums: {
      booking_status:
        | "ingested"
        | "awaiting_guest_form"
        | "matched"
        | "messaging"
        | "completed"
        | "failed"
        | "cancelled"
      gmail_connection_status: "active" | "needs_reconnect" | "revoked"
      id_document_type: "aadhaar" | "passport" | "other"
      message_channel: "whatsapp" | "sms"
      message_delivery_status:
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "fallback_triggered"
      message_language: "en" | "hi"
      message_recipient_type: "guest" | "caretaker" | "host"
      message_template_kind:
        | "guest_welcome"
        | "caretaker_notify"
        | "host_paste_fallback"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
      booking_status: [
        "ingested",
        "awaiting_guest_form",
        "matched",
        "messaging",
        "completed",
        "failed",
        "cancelled",
      ],
      gmail_connection_status: ["active", "needs_reconnect", "revoked"],
      id_document_type: ["aadhaar", "passport", "other"],
      message_channel: ["whatsapp", "sms"],
      message_delivery_status: [
        "queued",
        "sent",
        "delivered",
        "failed",
        "fallback_triggered",
      ],
      message_language: ["en", "hi"],
      message_recipient_type: ["guest", "caretaker", "host"],
      message_template_kind: [
        "guest_welcome",
        "caretaker_notify",
        "host_paste_fallback",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
