export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type BookingStatus =
  | "ingested"
  | "awaiting_guest_form"
  | "matched"
  | "messaging"
  | "completed"
  | "failed"
  | "cancelled";

type GmailConnectionStatus = "active" | "needs_reconnect" | "revoked";
type IdDocumentType = "aadhaar" | "passport" | "other";
type MessageTemplateKind = "guest_welcome" | "caretaker_notify" | "host_paste_fallback";
type MessageLanguage = "en" | "hi";
type MessageChannel = "whatsapp" | "sms";
type MessageRecipientType = "guest" | "caretaker" | "host";
type MessageDeliveryStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "fallback_triggered";

export type Database = {
  public: {
    Tables: {
      hosts: {
        Row: {
          id: string;
          auth_user_id: string;
          business_name: string;
          slug: string;
          phone: string;
          is_active: boolean;
          deactivated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          business_name?: string;
          slug: string;
          phone?: string;
          is_active?: boolean;
          deactivated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          business_name?: string;
          slug?: string;
          phone?: string;
          is_active?: boolean;
          deactivated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admins: {
        Row: {
          auth_user_id: string;
          email: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          auth_user_id: string;
          email: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          auth_user_id?: string;
          email?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      host_settings: {
        Row: {
          host_id: string;
          sms_fallback_enabled: boolean;
          sheets_export_enabled: boolean;
          sheets_spreadsheet_id: string | null;
          default_language: MessageLanguage;
          whatsapp_phone_number_id: string | null;
          whatsapp_waba_id: string | null;
          onboarding_step: number;
          whatsapp_test_sent_at: string | null;
          whatsapp_verified_at: string | null;
          checkin_link_confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          host_id: string;
          sms_fallback_enabled?: boolean;
          sheets_export_enabled?: boolean;
          sheets_spreadsheet_id?: string | null;
          default_language?: MessageLanguage;
          whatsapp_phone_number_id?: string | null;
          whatsapp_waba_id?: string | null;
          onboarding_step?: number;
          whatsapp_test_sent_at?: string | null;
          whatsapp_verified_at?: string | null;
          checkin_link_confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          host_id?: string;
          sms_fallback_enabled?: boolean;
          sheets_export_enabled?: boolean;
          sheets_spreadsheet_id?: string | null;
          default_language?: MessageLanguage;
          whatsapp_phone_number_id?: string | null;
          whatsapp_waba_id?: string | null;
          onboarding_step?: number;
          whatsapp_test_sent_at?: string | null;
          whatsapp_verified_at?: string | null;
          checkin_link_confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      gmail_connections: {
        Row: {
          id: string;
          host_id: string;
          email_address: string;
          refresh_token: string;
          status: GmailConnectionStatus;
          last_synced_at: string | null;
          sync_cursor: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          email_address: string;
          refresh_token: string;
          status?: GmailConnectionStatus;
          last_synced_at?: string | null;
          sync_cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          email_address?: string;
          refresh_token?: string;
          status?: GmailConnectionStatus;
          last_synced_at?: string | null;
          sync_cursor?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          address: string;
          location_url: string;
          check_in_time: string;
          house_rules: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          address?: string;
          location_url?: string;
          check_in_time?: string;
          house_rules?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          address?: string;
          location_url?: string;
          check_in_time?: string;
          house_rules?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      caretakers: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          phone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          phone: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          name?: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      property_caretakers: {
        Row: {
          property_id: string;
          caretaker_id: string;
        };
        Insert: {
          property_id: string;
          caretaker_id: string;
        };
        Update: {
          property_id?: string;
          caretaker_id?: string;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          host_id: string;
          relay_email: string;
          name: string | null;
          whatsapp_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          relay_email: string;
          name?: string | null;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          relay_email?: string;
          name?: string | null;
          whatsapp_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          host_id: string;
          property_id: string | null;
          guest_id: string | null;
          airbnb_booking_id: string;
          check_in: string;
          check_out: string;
          check_in_time: string | null;
          check_out_time: string | null;
          nights: number;
          guest_count: number;
          amount_paid_by_guest: number | null;
          amount_payable_to_host: number | null;
          amount_payable_to_airbnb: number | null;
          guest_notes: string | null;
          raw_email_ref: string | null;
          listing_name: string | null;
          status: BookingStatus;
          sheets_exported_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          property_id?: string | null;
          guest_id?: string | null;
          airbnb_booking_id: string;
          check_in: string;
          check_out: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          nights: number;
          guest_count?: number;
          amount_paid_by_guest?: number | null;
          amount_payable_to_host?: number | null;
          amount_payable_to_airbnb?: number | null;
          guest_notes?: string | null;
          raw_email_ref?: string | null;
          listing_name?: string | null;
          status?: BookingStatus;
          sheets_exported_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          property_id?: string | null;
          guest_id?: string | null;
          airbnb_booking_id?: string;
          check_in?: string;
          check_out?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          nights?: number;
          guest_count?: number;
          amount_paid_by_guest?: number | null;
          amount_payable_to_host?: number | null;
          amount_payable_to_airbnb?: number | null;
          guest_notes?: string | null;
          raw_email_ref?: string | null;
          listing_name?: string | null;
          status?: BookingStatus;
          sheets_exported_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      form_submissions: {
        Row: {
          id: string;
          host_id: string;
          booking_id: string | null;
          claimed_airbnb_booking_id: string;
          name: string;
          whatsapp_number: string;
          id_document_path: string;
          id_document_type: IdDocumentType;
          check_in: string | null;
          check_out: string | null;
          guest_count: number | null;
          matched: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          booking_id?: string | null;
          claimed_airbnb_booking_id: string;
          name: string;
          whatsapp_number: string;
          id_document_path: string;
          id_document_type: IdDocumentType;
          check_in?: string | null;
          check_out?: string | null;
          guest_count?: number | null;
          matched?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          booking_id?: string | null;
          claimed_airbnb_booking_id?: string;
          name?: string;
          whatsapp_number?: string;
          id_document_path?: string;
          id_document_type?: IdDocumentType;
          check_in?: string | null;
          check_out?: string | null;
          guest_count?: number | null;
          matched?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      message_templates: {
        Row: {
          id: string;
          host_id: string;
          kind: MessageTemplateKind;
          language: MessageLanguage;
          meta_template_name: string;
          body_preview: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          kind: MessageTemplateKind;
          language: MessageLanguage;
          meta_template_name: string;
          body_preview?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          kind?: MessageTemplateKind;
          language?: MessageLanguage;
          meta_template_name?: string;
          body_preview?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_log: {
        Row: {
          id: string;
          host_id: string;
          booking_id: string;
          channel: MessageChannel;
          recipient_type: MessageRecipientType;
          to_number: string;
          template_kind: string | null;
          wamid: string | null;
          status: MessageDeliveryStatus;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          booking_id: string;
          channel: MessageChannel;
          recipient_type: MessageRecipientType;
          to_number: string;
          template_kind?: string | null;
          wamid?: string | null;
          status?: MessageDeliveryStatus;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          booking_id?: string;
          channel?: MessageChannel;
          recipient_type?: MessageRecipientType;
          to_number?: string;
          template_kind?: string | null;
          wamid?: string | null;
          status?: MessageDeliveryStatus;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      current_host_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type { BookingStatus };
