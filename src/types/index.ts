// These types are based on the Supabase schema.
// It's recommended to generate these types automatically using `supabase gen types typescript`
// For this project, they are manually defined.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      stations: {
        Row: {
          id: string
          org_id: string
          name: string
          crest_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          crest_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          crest_url?: string | null
          created_at?: string
        }
      }
      divisions: {
        Row: {
          id: string
          station_id: string
          name: string
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          station_id: string
          name: string
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          name?: string
          color?: string | null
          created_at?: string
        }
      }
      users_profile: {
        Row: {
          id: string
          email: string | null
          name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          created_at?: string
        }
      }
      memberships: {
        Row: {
          id: string
          user_id: string
          station_id: string
          division_id: string | null
          role: "ADMIN" | "EDITOR" | "VIEWER"
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          station_id: string
          division_id?: string | null
          role: "ADMIN" | "EDITOR" | "VIEWER"
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          station_id?: string
          division_id?: string | null
          role?: "ADMIN" | "EDITOR" | "VIEWER"
          created_at?: string
        }
      }
      people: {
        Row: {
          id: string
          station_id: string
          name: string
          photo_url: string | null
          rank: string | null
          tags: string[] | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          station_id: string
          name: string
          photo_url?: string | null
          rank?: string | null
          tags?: string[] | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          name?: string
          photo_url?: string | null
          rank?: string | null
          tags?: string[] | null
          active?: boolean
          created_at?: string
        }
      }
      shift_templates: {
        Row: {
          id: string
          station_id: string
          label: "DAY" | "NIGHT"
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          station_id: string
          label: "DAY" | "NIGHT"
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          station_id?: string
          label?: "DAY" | "NIGHT"
          start_time?: string
          end_time?: string
        }
      }
      schedule_cycles: {
        Row: {
          id: string
          station_id: string
          start_date: string
          order_division_ids: string[]
          switch_hours: number
        }
        Insert: {
          id?: string
          station_id: string
          start_date: string
          order_division_ids: string[]
          switch_hours?: number
        }
        Update: {
          id?: string
          station_id?: string
          start_date?: string
          order_division_ids?: string[]
          switch_hours?: number
        }
      }
      shifts: {
        Row: {
          id: string
          station_id: string
          division_id: string
          starts_at: string
          ends_at: string
          label: "DAY" | "NIGHT"
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          station_id: string
          division_id: string
          starts_at: string
          ends_at: string
          label: "DAY" | "NIGHT"
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          station_id?: string
          division_id?: string
          starts_at?: string
          ends_at?: string
          label?: "DAY" | "NIGHT"
          status?: string | null
          created_at?: string
        }
      }
      vehicle_configs: {
        Row: {
          id: string
          station_id: string
          key: string
          title: string
          order: number
          config: Json
          image_url: string | null
        }
        Insert: {
          id?: string
          station_id: string
          key: string
          title: string
          order?: number
          config: Json
          image_url?: string | null
        }
        Update: {
          id?: string
          station_id?: string
          key?: string
          title?: string
          order?: number
          config?: Json
          image_url?: string | null
        }
      }
      assignments: {
        Row: {
          id: string
          shift_id: string
          vehicle_key: string
          slot_key: string
          person_id: string | null
          placeholder_text: string | null
          from_trupp_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          shift_id: string
          vehicle_key: string
          slot_key: string
          person_id?: string | null
          placeholder_text?: string | null
          from_trupp_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          shift_id?: string
          vehicle_key?: string
          slot_key?: string
          person_id?: string | null
          placeholder_text?: string | null
          from_trupp_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
      }
      shift_notes: {
        Row: {
          shift_id: string
          meister_text: string | null
          wachleitung_im_haus: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          shift_id: string
          meister_text?: string | null
          wachleitung_im_haus?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          shift_id?: string
          meister_text?: string | null
          wachleitung_im_haus?: boolean
          updated_at?: string
          updated_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          station_id_input: string
        }
        Returns: string
      }
      get_user_division: {
        Args: {
          station_id_input: string
        }
        Returns: string
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

// Custom types for vehicle config JSON
export type VehicleSlotDefinition =
  | string
  | {
      key: string;
      label?: string;
      description?: string;
    };

export interface VehicleTrupp {
  key: string;
  label: string;
  description?: string;
  slots: VehicleSlotDefinition[];
}

export interface VehicleConfig {
  slots?: VehicleSlotDefinition[];
  trupps?: VehicleTrupp[];
}
