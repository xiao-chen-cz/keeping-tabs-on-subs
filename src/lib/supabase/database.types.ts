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
    PostgrestVersion: "14.18"
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
      captures: {
        Row: {
          extraction: Json | null
          extraction_error: string | null
          id: string
          input: Database["public"]["Enums"]["capture_input"]
          mime_type: string | null
          raw_text: string | null
          received_at: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          extraction?: Json | null
          extraction_error?: string | null
          id?: string
          input: Database["public"]["Enums"]["capture_input"]
          mime_type?: string | null
          raw_text?: string | null
          received_at?: string
          storage_path?: string | null
          user_id?: string
        }
        Update: {
          extraction?: Json | null
          extraction_error?: string | null
          id?: string
          input?: Database["public"]["Enums"]["capture_input"]
          mime_type?: string | null
          raw_text?: string | null
          received_at?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          display_name: string | null
          reminder_offsets: number[]
          time_zone: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          reminder_offsets?: number[]
          time_zone?: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          reminder_offsets?: number[]
          time_zone?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          account_label: string | null
          amount: number | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days: number | null
          cancel_url: string | null
          capture_id: string
          category_id: string | null
          confidence: Database["public"]["Enums"]["confidence"] | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"] | null
          decided_at: string | null
          field_confidence: Json
          id: string
          last_renewal_date: string | null
          name: string | null
          notes: string | null
          payment_method_id: string | null
          plan: string | null
          promo_ends: string | null
          regular_price: number | null
          scope: Database["public"]["Enums"]["scope"] | null
          status: Database["public"]["Enums"]["capture_status"]
          subscription_id: string | null
          trial_ends: string | null
          updates_subscription_id: string | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          account_label?: string | null
          amount?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days?: number | null
          cancel_url?: string | null
          capture_id: string
          category_id?: string | null
          confidence?: Database["public"]["Enums"]["confidence"] | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          decided_at?: string | null
          field_confidence?: Json
          id?: string
          last_renewal_date?: string | null
          name?: string | null
          notes?: string | null
          payment_method_id?: string | null
          plan?: string | null
          promo_ends?: string | null
          regular_price?: number | null
          scope?: Database["public"]["Enums"]["scope"] | null
          status?: Database["public"]["Enums"]["capture_status"]
          subscription_id?: string | null
          trial_ends?: string | null
          updates_subscription_id?: string | null
          user_id?: string
          vendor?: string | null
        }
        Update: {
          account_label?: string | null
          amount?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days?: number | null
          cancel_url?: string | null
          capture_id?: string
          category_id?: string | null
          confidence?: Database["public"]["Enums"]["confidence"] | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          decided_at?: string | null
          field_confidence?: Json
          id?: string
          last_renewal_date?: string | null
          name?: string | null
          notes?: string | null
          payment_method_id?: string | null
          plan?: string | null
          promo_ends?: string | null
          regular_price?: number | null
          scope?: Database["public"]["Enums"]["scope"] | null
          status?: Database["public"]["Enums"]["capture_status"]
          subscription_id?: string | null
          trial_ends?: string | null
          updates_subscription_id?: string | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_capture_fk"
            columns: ["capture_id", "user_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "proposals_category_fk"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "proposals_payment_method_fk"
            columns: ["payment_method_id", "user_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "proposals_subscription_fk"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "proposals_updates_subscription_fk"
            columns: ["updates_subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          capture_id: string | null
          channel: Database["public"]["Enums"]["cancel_channel"] | null
          id: string
          kind: Database["public"]["Enums"]["subscription_event_kind"]
          note: string | null
          occurred_on: string
          recorded_at: string
          reference: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          capture_id?: string | null
          channel?: Database["public"]["Enums"]["cancel_channel"] | null
          id?: string
          kind: Database["public"]["Enums"]["subscription_event_kind"]
          note?: string | null
          occurred_on: string
          recorded_at?: string
          reference?: string | null
          subscription_id: string
          user_id?: string
        }
        Update: {
          capture_id?: string | null
          channel?: Database["public"]["Enums"]["cancel_channel"] | null
          id?: string
          kind?: Database["public"]["Enums"]["subscription_event_kind"]
          note?: string | null
          occurred_on?: string
          recorded_at?: string
          reference?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_capture_fk"
            columns: ["capture_id", "user_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "subscription_events_subscription_fk"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          access_until: string | null
          account_label: string | null
          amount: number | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days: number | null
          cancel_url: string | null
          capture_id: string | null
          category_id: string | null
          confidence: Database["public"]["Enums"]["confidence"] | null
          created_at: string
          currency: Database["public"]["Enums"]["currency"] | null
          id: string
          kept_for_cancel_by: string | null
          last_renewal_date: string | null
          name: string
          notes: string | null
          payment_method_id: string | null
          plan: string | null
          promo_ends: string | null
          regular_price: number | null
          scope: Database["public"]["Enums"]["scope"] | null
          source: Database["public"]["Enums"]["entry_source"]
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          access_until?: string | null
          account_label?: string | null
          amount?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days?: number | null
          cancel_url?: string | null
          capture_id?: string | null
          category_id?: string | null
          confidence?: Database["public"]["Enums"]["confidence"] | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          id?: string
          kept_for_cancel_by?: string | null
          last_renewal_date?: string | null
          name: string
          notes?: string | null
          payment_method_id?: string | null
          plan?: string | null
          promo_ends?: string | null
          regular_price?: number | null
          scope?: Database["public"]["Enums"]["scope"] | null
          source?: Database["public"]["Enums"]["entry_source"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Update: {
          access_until?: string | null
          account_label?: string | null
          amount?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null
          cancel_notice_days?: number | null
          cancel_url?: string | null
          capture_id?: string | null
          category_id?: string | null
          confidence?: Database["public"]["Enums"]["confidence"] | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency"] | null
          id?: string
          kept_for_cancel_by?: string | null
          last_renewal_date?: string | null
          name?: string
          notes?: string | null
          payment_method_id?: string | null
          plan?: string | null
          promo_ends?: string | null
          regular_price?: number | null
          scope?: Database["public"]["Enums"]["scope"] | null
          source?: Database["public"]["Enums"]["entry_source"]
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_capture_fk"
            columns: ["capture_id", "user_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "subscriptions_category_fk"
            columns: ["category_id", "user_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "subscriptions_payment_method_fk"
            columns: ["payment_method_id", "user_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_proposal: {
        Args: { p_fields: Json; p_proposal_id: string }
        Returns: string
      }
      reject_proposal: { Args: { p_proposal_id: string }; Returns: undefined }
      set_subscription_status: {
        Args: {
          p_access_until?: string
          p_capture_id?: string
          p_channel?: Database["public"]["Enums"]["cancel_channel"]
          p_note?: string
          p_occurred_on?: string
          p_reference?: string
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_subscription_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      billing_cycle: "monthly" | "quarterly" | "every_4_weeks" | "yearly"
      cancel_channel:
        | "website_app"
        | "email"
        | "phone"
        | "letter"
        | "in_person"
        | "other"
      capture_input: "text" | "upload" | "paste" | "seed"
      capture_status: "pending" | "approved" | "rejected"
      confidence: "high" | "medium" | "low"
      currency: "EUR" | "USD" | "GBP" | "CHF"
      entry_source: "manual" | "seed" | "capture"
      scope: "business" | "personal" | "family"
      subscription_event_kind: "cancelled" | "reopened"
      subscription_status: "confirmed" | "cancelled"
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
    Enums: {
      billing_cycle: ["monthly", "quarterly", "every_4_weeks", "yearly"],
      cancel_channel: [
        "website_app",
        "email",
        "phone",
        "letter",
        "in_person",
        "other",
      ],
      capture_input: ["text", "upload", "paste", "seed"],
      capture_status: ["pending", "approved", "rejected"],
      confidence: ["high", "medium", "low"],
      currency: ["EUR", "USD", "GBP", "CHF"],
      entry_source: ["manual", "seed", "capture"],
      scope: ["business", "personal", "family"],
      subscription_event_kind: ["cancelled", "reopened"],
      subscription_status: ["confirmed", "cancelled"],
    },
  },
} as const
