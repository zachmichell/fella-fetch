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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          client_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          role: string
          staff_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          client_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          role: string
          staff_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          role?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_session_id: string
          client_id: string
          created_at: string
          enrolled_at: string | null
          graduated_at: string | null
          id: string
          notes: string | null
          pet_id: string
          status: string
          updated_at: string
        }
        Insert: {
          class_session_id: string
          client_id: string
          created_at?: string
          enrolled_at?: string | null
          graduated_at?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          class_session_id?: string
          client_id?: string
          created_at?: string
          enrolled_at?: string | null
          graduated_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_session_id_fkey"
            columns: ["class_session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_type_id: string
          created_at: string
          day_of_week: number
          end_date: string | null
          end_time: string
          id: string
          instructor: string | null
          is_active: boolean
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          class_type_id: string
          created_at?: string
          day_of_week: number
          end_date?: string | null
          end_time: string
          id?: string
          instructor?: string | null
          is_active?: boolean
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          class_type_id?: string
          created_at?: string
          day_of_week?: number
          end_date?: string | null
          end_time?: string
          id?: string
          instructor?: string | null
          is_active?: boolean
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
        ]
      }
      class_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          level: number
          max_capacity: number
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          max_capacity?: number
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          level?: number
          max_capacity?: number
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      client_agreements: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          signed_at: string | null
          title: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          signed_at?: string | null
          title: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          signed_at?: string | null
          title?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_agreements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          id: string
          note: string
          source_id: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          id?: string
          note: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          client_id: string
          created_at: string
          data: Json | null
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_permissions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_allowed: boolean
          service_type_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          service_type_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          service_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_service_permissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_service_permissions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          boarding_credits: number
          city: string | null
          created_at: string
          daycare_credits: number
          email: string | null
          email_opt_in: boolean | null
          email_reminders_opt_in: boolean | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          half_daycare_credits: number
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          sms_opt_in: boolean | null
          sms_reminders_opt_in: boolean | null
          subscribed: boolean
          thread_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          boarding_credits?: number
          city?: string | null
          created_at?: string
          daycare_credits?: number
          email?: string | null
          email_opt_in?: boolean | null
          email_reminders_opt_in?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          half_daycare_credits?: number
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          sms_opt_in?: boolean | null
          sms_reminders_opt_in?: boolean | null
          subscribed?: boolean
          thread_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          boarding_credits?: number
          city?: string | null
          created_at?: string
          daycare_credits?: number
          email?: string | null
          email_opt_in?: boolean | null
          email_reminders_opt_in?: boolean | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          half_daycare_credits?: number
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          sms_opt_in?: boolean | null
          sms_reminders_opt_in?: boolean | null
          subscribed?: boolean
          thread_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_capacity: {
        Row: {
          current_count: number | null
          date: string
          id: string
          max_capacity: number | null
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          current_count?: number | null
          date: string
          id?: string
          max_capacity?: number | null
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          current_count?: number | null
          date?: string
          id?: string
          max_capacity?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: []
      }
      daycare_subscriptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          day_type: string
          days_of_week: number[]
          end_date: string | null
          half_day_period: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          notes: string | null
          pet_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          created_at?: string
          day_type: string
          days_of_week: number[]
          end_date?: string | null
          half_day_period?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          notes?: string | null
          pet_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          created_at?: string
          day_type?: string
          days_of_week?: number[]
          end_date?: string | null
          half_day_period?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          notes?: string | null
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daycare_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daycare_subscriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      groom_questionnaires: {
        Row: {
          admin_notes: string | null
          assigned_groom_level: number | null
          behavior_concerns: string | null
          client_id: string
          coat_condition: string | null
          created_at: string
          id: string
          last_groom_location: string | null
          last_groom_timeframe: string | null
          matting_level: string | null
          pet_id: string
          photo_urls: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_groom_level?: number | null
          behavior_concerns?: string | null
          client_id: string
          coat_condition?: string | null
          created_at?: string
          id?: string
          last_groom_location?: string | null
          last_groom_timeframe?: string | null
          matting_level?: string | null
          pet_id: string
          photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_groom_level?: number | null
          behavior_concerns?: string | null
          client_id?: string
          coat_condition?: string | null
          created_at?: string
          id?: string
          last_groom_location?: string | null
          last_groom_timeframe?: string | null
          matting_level?: string | null
          pet_id?: string
          photo_urls?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "groom_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groom_questionnaires_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      groomer_available_dates: {
        Row: {
          available_date: string
          created_at: string
          end_time: string
          groomer_id: string
          id: string
          start_time: string
        }
        Insert: {
          available_date: string
          created_at?: string
          end_time?: string
          groomer_id: string
          id?: string
          start_time?: string
        }
        Update: {
          available_date?: string
          created_at?: string
          end_time?: string
          groomer_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "groomer_available_dates_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groomer_available_dates_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groomer_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          groomer_id: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          groomer_id: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          groomer_id?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groomer_schedules_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groomer_schedules_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groomer_service_durations: {
        Row: {
          created_at: string
          duration_minutes: number
          groomer_id: string
          id: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          groomer_id: string
          id?: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          groomer_id?: string
          id?: string
          shopify_product_id?: string
          shopify_variant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groomer_service_durations_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groomer_service_durations_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groomer_service_matrix: {
        Row: {
          created_at: string
          duration_minutes: number
          groom_level: number
          groomer_id: string
          id: string
          pet_size: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          groom_level: number
          groomer_id: string
          id?: string
          pet_size: string
          shopify_product_id: string
          shopify_variant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          groom_level?: number
          groomer_id?: string
          id?: string
          pet_size?: string
          shopify_product_id?: string
          shopify_variant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groomer_service_matrix_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groomer_service_matrix_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groomers: {
        Row: {
          bio: string | null
          color: string | null
          commission_rate: number
          created_at: string
          email: string | null
          end_of_day_safeguard: boolean
          eod_buffer_minutes: number
          id: string
          intake_style: string
          is_active: boolean
          max_concurrent: number
          name: string
          phone: string | null
          photo_url: string | null
          shopify_staff_id: string | null
          shopify_staff_name: string | null
          sort_order: number | null
          stagger_duration: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          color?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          end_of_day_safeguard?: boolean
          eod_buffer_minutes?: number
          id?: string
          intake_style?: string
          is_active?: boolean
          max_concurrent?: number
          name: string
          phone?: string | null
          photo_url?: string | null
          shopify_staff_id?: string | null
          shopify_staff_name?: string | null
          sort_order?: number | null
          stagger_duration?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          color?: string | null
          commission_rate?: number
          created_at?: string
          email?: string | null
          end_of_day_safeguard?: boolean
          eod_buffer_minutes?: number
          id?: string
          intake_style?: string
          is_active?: boolean
          max_concurrent?: number
          name?: string
          phone?: string | null
          photo_url?: string | null
          shopify_staff_id?: string | null
          shopify_staff_name?: string | null
          sort_order?: number | null
          stagger_duration?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          action_taken: string | null
          category: string
          created_at: string
          date: string
          description: string
          id: string
          pet_id: string
          reported_by: string
          reservation_id: string | null
          severity: string
        }
        Insert: {
          action_taken?: string | null
          category: string
          created_at?: string
          date?: string
          description: string
          id?: string
          pet_id: string
          reported_by: string
          reservation_id?: string | null
          severity: string
        }
        Update: {
          action_taken?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          pet_id?: string
          reported_by?: string
          reservation_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_segments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          is_preset: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_preset?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          is_preset?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      pet_activity_logs: {
        Row: {
          action_category: string
          action_type: string
          created_at: string
          description: string
          details: Json | null
          id: string
          performed_by: string
          pet_id: string
          reservation_id: string | null
        }
        Insert: {
          action_category: string
          action_type: string
          created_at?: string
          description: string
          details?: Json | null
          id?: string
          performed_by: string
          pet_id: string
          reservation_id?: string | null
        }
        Update: {
          action_category?: string
          action_type?: string
          created_at?: string
          description?: string
          details?: Json | null
          id?: string
          performed_by?: string
          pet_id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_activity_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_activity_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_care_logs: {
        Row: {
          administered_at: string
          administered_by: string
          amount_given: string | null
          amount_taken: string | null
          created_at: string
          id: string
          log_type: string
          notes: string | null
          pet_id: string
          reference_id: string
          reservation_id: string | null
        }
        Insert: {
          administered_at?: string
          administered_by: string
          amount_given?: string | null
          amount_taken?: string | null
          created_at?: string
          id?: string
          log_type: string
          notes?: string | null
          pet_id: string
          reference_id: string
          reservation_id?: string | null
        }
        Update: {
          administered_at?: string
          administered_by?: string
          amount_given?: string | null
          amount_taken?: string | null
          created_at?: string
          id?: string
          log_type?: string
          notes?: string | null
          pet_id?: string
          reference_id?: string
          reservation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_care_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_care_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_feeding_schedules: {
        Row: {
          amount: string
          created_at: string
          food_type: string
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean
          pet_id: string
          timing: string | null
          updated_at: string
        }
        Insert: {
          amount: string
          created_at?: string
          food_type: string
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          pet_id: string
          timing?: string | null
          updated_at?: string
        }
        Update: {
          amount?: string
          created_at?: string
          food_type?: string
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          pet_id?: string
          timing?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_feeding_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_medications: {
        Row: {
          created_at: string
          dosage: string
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean
          name: string
          pet_id: string
          timing: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage: string
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name: string
          pet_id: string
          timing?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean
          name?: string
          pet_id?: string
          timing?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_medications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          pet_id: string
          source_id: string | null
          source_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          pet_id: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          pet_id?: string
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_notes_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_traits: {
        Row: {
          color_key: string
          created_at: string
          icon_name: string
          id: string
          is_alert: boolean
          pet_id: string
          title: string
        }
        Insert: {
          color_key: string
          created_at?: string
          icon_name: string
          id?: string
          is_alert?: boolean
          pet_id: string
          title: string
        }
        Update: {
          color_key?: string
          created_at?: string
          icon_name?: string
          id?: string
          is_alert?: boolean
          pet_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_traits_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          allergies: string | null
          behavior_notes: string | null
          breed: string | null
          client_id: string
          coat_type: string | null
          color: string | null
          created_at: string
          current_condition: string | null
          date_of_birth: string | null
          feeding_instructions: string | null
          gender: string | null
          groom_level: number | null
          grooming_frequency: string | null
          grooming_product_id: string | null
          grooming_product_title: string | null
          id: string
          is_active: boolean | null
          last_grooming_date: string | null
          level_expiration_date: string | null
          name: string
          photo_url: string | null
          size: string | null
          spayed_neutered: boolean | null
          special_needs: string | null
          updated_at: string
          vaccination_bordetella: string | null
          vaccination_bordetella_doc_url: string | null
          vaccination_distemper: string | null
          vaccination_distemper_doc_url: string | null
          vaccination_rabies: string | null
          vaccination_rabies_doc_url: string | null
          weight: number | null
        }
        Insert: {
          allergies?: string | null
          behavior_notes?: string | null
          breed?: string | null
          client_id: string
          coat_type?: string | null
          color?: string | null
          created_at?: string
          current_condition?: string | null
          date_of_birth?: string | null
          feeding_instructions?: string | null
          gender?: string | null
          groom_level?: number | null
          grooming_frequency?: string | null
          grooming_product_id?: string | null
          grooming_product_title?: string | null
          id?: string
          is_active?: boolean | null
          last_grooming_date?: string | null
          level_expiration_date?: string | null
          name: string
          photo_url?: string | null
          size?: string | null
          spayed_neutered?: boolean | null
          special_needs?: string | null
          updated_at?: string
          vaccination_bordetella?: string | null
          vaccination_bordetella_doc_url?: string | null
          vaccination_distemper?: string | null
          vaccination_distemper_doc_url?: string | null
          vaccination_rabies?: string | null
          vaccination_rabies_doc_url?: string | null
          weight?: number | null
        }
        Update: {
          allergies?: string | null
          behavior_notes?: string | null
          breed?: string | null
          client_id?: string
          coat_type?: string | null
          color?: string | null
          created_at?: string
          current_condition?: string | null
          date_of_birth?: string | null
          feeding_instructions?: string | null
          gender?: string | null
          groom_level?: number | null
          grooming_frequency?: string | null
          grooming_product_id?: string | null
          grooming_product_title?: string | null
          id?: string
          is_active?: boolean | null
          last_grooming_date?: string | null
          level_expiration_date?: string | null
          name?: string
          photo_url?: string | null
          size?: string | null
          spayed_neutered?: boolean | null
          special_needs?: string | null
          updated_at?: string
          vaccination_bordetella?: string | null
          vaccination_bordetella_doc_url?: string | null
          vaccination_distemper?: string | null
          vaccination_distemper_doc_url?: string | null
          vaccination_rabies?: string | null
          vaccination_rabies_doc_url?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          client_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
        }
        Insert: {
          auth: string
          client_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
        }
        Update: {
          auth?: string
          client_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_cards: {
        Row: {
          activities: string | null
          appetite: string | null
          created_at: string
          date: string
          energy_level: string | null
          id: string
          mood: string | null
          notes: string | null
          pet_id: string
          photo_urls: string[] | null
          reservation_id: string
          sent_at: string | null
          staff_id: string
        }
        Insert: {
          activities?: string | null
          appetite?: string | null
          created_at?: string
          date?: string
          energy_level?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          pet_id: string
          photo_urls?: string[] | null
          reservation_id: string
          sent_at?: string | null
          staff_id: string
        }
        Update: {
          activities?: string | null
          appetite?: string | null
          created_at?: string
          date?: string
          energy_level?: string | null
          id?: string
          mood?: string | null
          notes?: string | null
          pet_id?: string
          photo_urls?: string[] | null
          reservation_id?: string
          sent_at?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string | null
          checked_out_by: string | null
          created_at: string
          end_date: string | null
          end_time: string | null
          groomer_id: string | null
          id: string
          notes: string | null
          parent_reservation_id: string | null
          payment_pending: boolean
          pet_id: string
          price: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          subscription_id: string | null
          suite_id: string | null
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          groomer_id?: string | null
          id?: string
          notes?: string | null
          parent_reservation_id?: string | null
          payment_pending?: boolean
          pet_id: string
          price?: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          subscription_id?: string | null
          suite_id?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string | null
          checked_out_by?: string | null
          created_at?: string
          end_date?: string | null
          end_time?: string | null
          groomer_id?: string | null
          id?: string
          notes?: string | null
          parent_reservation_id?: string | null
          payment_pending?: boolean
          pet_id?: string
          price?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          subscription_id?: string | null
          suite_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "groomers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_parent_reservation_id_fkey"
            columns: ["parent_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "daycare_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "suites"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_reminders: {
        Row: {
          client_id: string
          id: string
          reservation_id: string
          sent_at: string
          service_type_id: string
        }
        Insert: {
          client_id: string
          id?: string
          reservation_id: string
          sent_at?: string
          service_type_id: string
        }
        Update: {
          client_id?: string
          id?: string
          reservation_id?: string
          sent_at?: string
          service_type_id?: string
        }
        Relationships: []
      }
      service_type_products: {
        Row: {
          created_at: string
          credit_value: number | null
          id: string
          service_type_id: string
          shopify_product_id: string
          shopify_product_title: string
        }
        Insert: {
          created_at?: string
          credit_value?: number | null
          id?: string
          service_type_id: string
          shopify_product_id: string
          shopify_product_title: string
        }
        Update: {
          created_at?: string
          credit_value?: number | null
          id?: string
          service_type_id?: string
          shopify_product_id?: string
          shopify_product_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_type_products_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          category: string
          color: string | null
          created_at: string
          credit_field: string | null
          credits_per_unit: number | null
          description: string | null
          display_name: string
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          credit_field?: string | null
          credits_per_unit?: number | null
          description?: string | null
          display_name: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          credit_field?: string | null
          credits_per_unit?: number | null
          description?: string | null
          display_name?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      shopify_collection_mappings: {
        Row: {
          category: string
          created_at: string
          id: string
          shopify_collection_id: string
          shopify_collection_title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          shopify_collection_id: string
          shopify_collection_title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          shopify_collection_id?: string
          shopify_collection_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopify_service_mappings: {
        Row: {
          created_at: string
          credit_value: number | null
          id: string
          service_type: Database["public"]["Enums"]["service_type"]
          shopify_product_id: string
          shopify_product_title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_value?: number | null
          id?: string
          service_type: Database["public"]["Enums"]["service_type"]
          shopify_product_id: string
          shopify_product_title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_value?: number | null
          id?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          shopify_product_id?: string
          shopify_product_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["staff_code_role"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          role?: Database["public"]["Enums"]["staff_code_role"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["staff_code_role"]
          updated_at?: string
        }
        Relationships: []
      }
      staff_time_clock: {
        Row: {
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suites: {
        Row: {
          capacity: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      trait_templates: {
        Row: {
          color_key: string
          created_at: string
          icon_name: string
          id: string
          is_alert: boolean
          title: string
        }
        Insert: {
          color_key: string
          created_at?: string
          icon_name: string
          id?: string
          is_alert?: boolean
          title: string
        }
        Update: {
          color_key?: string
          created_at?: string
          icon_name?: string
          id?: string
          is_alert?: boolean
          title?: string
        }
        Relationships: []
      }
      turn_aways: {
        Row: {
          created_at: string
          created_by: string
          date: string
          estimated_value: number | null
          id: string
          notes: string | null
          reason: string
          service_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          reason: string
          service_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          reason?: string
          service_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      groomers_public: {
        Row: {
          color: string | null
          end_of_day_safeguard: boolean | null
          eod_buffer_minutes: number | null
          id: string | null
          intake_style: string | null
          is_active: boolean | null
          max_concurrent: number | null
          name: string | null
          sort_order: number | null
          stagger_duration: number | null
        }
        Insert: {
          color?: string | null
          end_of_day_safeguard?: boolean | null
          eod_buffer_minutes?: number | null
          id?: string | null
          intake_style?: string | null
          is_active?: boolean | null
          max_concurrent?: number | null
          name?: string | null
          sort_order?: number | null
          stagger_duration?: number | null
        }
        Update: {
          color?: string | null
          end_of_day_safeguard?: boolean | null
          eod_buffer_minutes?: number | null
          id?: string | null
          intake_style?: string | null
          is_active?: boolean | null
          max_concurrent?: number | null
          name?: string | null
          sort_order?: number | null
          stagger_duration?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      deduct_boarding_credits: {
        Args: { p_client_id: string; p_nights: number }
        Returns: number
      }
      deduct_daycare_credit: { Args: { p_client_id: string }; Returns: number }
      deduct_half_daycare_credit: {
        Args: { p_client_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_groomer: { Args: { _user_id: string }; Returns: boolean }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
      restore_boarding_credits: {
        Args: { p_client_id: string; p_nights: number }
        Returns: number
      }
      restore_daycare_credit: { Args: { p_client_id: string }; Returns: number }
      restore_half_daycare_credit: {
        Args: { p_client_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "groomer"
      reservation_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
      service_type: "daycare" | "boarding" | "grooming" | "training"
      staff_code_role: "basic" | "supervisor" | "admin"
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
      app_role: ["admin", "staff", "groomer"],
      reservation_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
      ],
      service_type: ["daycare", "boarding", "grooming", "training"],
      staff_code_role: ["basic", "supervisor", "admin"],
    },
  },
} as const
