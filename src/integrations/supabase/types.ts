export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          applicable_plans: Json
          code: string
          created_at: string
          current_usage_count: number
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          total_usage_limit: number | null
          updated_at: string
          usage_limit_per_user: number | null
        }
        Insert: {
          applicable_plans?: Json
          code: string
          created_at?: string
          current_usage_count?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          total_usage_limit?: number | null
          updated_at?: string
          usage_limit_per_user?: number | null
        }
        Update: {
          applicable_plans?: Json
          code?: string
          created_at?: string
          current_usage_count?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          total_usage_limit?: number | null
          updated_at?: string
          usage_limit_per_user?: number | null
        }
        Relationships: []
      }
      discount_usage_logs: {
        Row: {
          discount_amount: number
          discount_code_id: string
          id: string
          subscription_id: string | null
          used_at: string
          user_mobile: string | null
        }
        Insert: {
          discount_amount: number
          discount_code_id: string
          id?: string
          subscription_id?: string | null
          used_at?: string
          user_mobile?: string | null
        }
        Update: {
          discount_amount?: number
          discount_code_id?: string
          id?: string
          subscription_id?: string | null
          used_at?: string
          user_mobile?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_usage_logs_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usage_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_refresh_logs: {
        Row: {
          configs_fetched: number | null
          created_at: string
          error_message: string | null
          id: string
          panel_id: string
          refresh_result: boolean
          response_data: Json | null
        }
        Insert: {
          configs_fetched?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          panel_id: string
          refresh_result: boolean
          response_data?: Json | null
        }
        Update: {
          configs_fetched?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          panel_id?: string
          refresh_result?: boolean
          response_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_refresh_logs_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panel_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_servers: {
        Row: {
          country_en: string
          country_fa: string
          created_at: string
          default_inbounds: Json
          enabled_protocols: Json
          health_status: string | null
          id: string
          is_active: boolean
          last_health_check: string | null
          name: string
          panel_config_data: Json | null
          panel_url: string
          password: string
          type: string
          updated_at: string
          username: string
        }
        Insert: {
          country_en: string
          country_fa: string
          created_at?: string
          default_inbounds?: Json
          enabled_protocols?: Json
          health_status?: string | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          name: string
          panel_config_data?: Json | null
          panel_url: string
          password: string
          type: string
          updated_at?: string
          username: string
        }
        Update: {
          country_en?: string
          country_fa?: string
          created_at?: string
          default_inbounds?: Json
          enabled_protocols?: Json
          health_status?: string | null
          id?: string
          is_active?: boolean
          last_health_check?: string | null
          name?: string
          panel_config_data?: Json | null
          panel_url?: string
          password?: string
          type?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      panel_test_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          panel_id: string
          response_time_ms: number | null
          test_details: Json | null
          test_result: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          panel_id: string
          response_time_ms?: number | null
          test_details?: Json | null
          test_result: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          panel_id?: string
          response_time_ms?: number | null
          test_details?: Json | null
          test_result?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "panel_test_logs_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panel_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation_type: string
          request_data: Json
          response_data: Json | null
          status_code: number | null
          subscription_id: string | null
          success: boolean | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type: string
          request_data: Json
          response_data?: Json | null
          status_code?: number | null
          subscription_id?: string | null
          success?: boolean | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type?: string
          request_data?: Json
          response_data?: Json | null
          status_code?: number | null
          subscription_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_panel_mappings: {
        Row: {
          created_at: string
          id: string
          inbound_ids: Json
          is_primary: boolean
          panel_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inbound_ids?: Json
          is_primary?: boolean
          panel_id: string
          plan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inbound_ids?: Json
          is_primary?: boolean
          panel_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_panel_mappings_panel_id_fkey"
            columns: ["panel_id"]
            isOneToOne: false
            referencedRelation: "panel_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_panel_mappings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          api_type: string
          assigned_panel_id: string | null
          available_countries: Json | null
          created_at: string
          default_data_limit_gb: number
          default_duration_days: number
          description_en: string | null
          description_fa: string | null
          id: string
          is_active: boolean
          is_visible: boolean
          name_en: string
          name_fa: string
          plan_id: string
          price_per_gb: number
          updated_at: string
        }
        Insert: {
          api_type: string
          assigned_panel_id?: string | null
          available_countries?: Json | null
          created_at?: string
          default_data_limit_gb?: number
          default_duration_days?: number
          description_en?: string | null
          description_fa?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name_en: string
          name_fa: string
          plan_id: string
          price_per_gb: number
          updated_at?: string
        }
        Update: {
          api_type?: string
          assigned_panel_id?: string | null
          available_countries?: Json | null
          created_at?: string
          default_data_limit_gb?: number
          default_duration_days?: number
          description_en?: string | null
          description_fa?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name_en?: string
          name_fa?: string
          plan_id?: string
          price_per_gb?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_assigned_panel_id_fkey"
            columns: ["assigned_panel_id"]
            isOneToOne: false
            referencedRelation: "panel_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          admin_decided_at: string | null
          admin_decision: string | null
          admin_decision_token: string | null
          created_at: string
          data_limit_gb: number
          duration_days: number
          expire_at: string | null
          id: string
          marzban_user_created: boolean | null
          mobile: string
          notes: string | null
          price_toman: number
          protocol: string | null
          receipt_image_url: string | null
          status: string
          subscription_url: string | null
          updated_at: string
          user_id: string | null
          username: string
          zarinpal_authority: string | null
          zarinpal_ref_id: string | null
        }
        Insert: {
          admin_decided_at?: string | null
          admin_decision?: string | null
          admin_decision_token?: string | null
          created_at?: string
          data_limit_gb: number
          duration_days: number
          expire_at?: string | null
          id?: string
          marzban_user_created?: boolean | null
          mobile: string
          notes?: string | null
          price_toman: number
          protocol?: string | null
          receipt_image_url?: string | null
          status?: string
          subscription_url?: string | null
          updated_at?: string
          user_id?: string | null
          username: string
          zarinpal_authority?: string | null
          zarinpal_ref_id?: string | null
        }
        Update: {
          admin_decided_at?: string | null
          admin_decision?: string | null
          admin_decision_token?: string | null
          created_at?: string
          data_limit_gb?: number
          duration_days?: number
          expire_at?: string | null
          id?: string
          marzban_user_created?: boolean | null
          mobile?: string
          notes?: string | null
          price_toman?: number
          protocol?: string | null
          receipt_image_url?: string | null
          status?: string
          subscription_url?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string
          zarinpal_authority?: string | null
          zarinpal_ref_id?: string | null
        }
        Relationships: []
      }
      zarinpal_contracts: {
        Row: {
          bank_code: string | null
          cancelled_at: string | null
          created_at: string
          expire_at: string
          id: string
          max_amount: number
          max_daily_count: number
          max_monthly_count: number
          merchant_id: string
          payman_authority: string
          signature: string | null
          signed_at: string | null
          status: string
          updated_at: string
          user_mobile: string
        }
        Insert: {
          bank_code?: string | null
          cancelled_at?: string | null
          created_at?: string
          expire_at: string
          id?: string
          max_amount: number
          max_daily_count: number
          max_monthly_count: number
          merchant_id: string
          payman_authority: string
          signature?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          user_mobile: string
        }
        Update: {
          bank_code?: string | null
          cancelled_at?: string | null
          created_at?: string
          expire_at?: string
          id?: string
          max_amount?: number
          max_daily_count?: number
          max_monthly_count?: number
          merchant_id?: string
          payman_authority?: string
          signature?: string | null
          signed_at?: string | null
          status?: string
          updated_at?: string
          user_mobile?: string
        }
        Relationships: []
      }
      zarinpal_direct_payments: {
        Row: {
          amount: number
          authority: string
          completed_at: string | null
          contract_id: string
          created_at: string
          error_message: string | null
          id: string
          reference_id: number | null
          status: string
          subscription_id: string | null
          zarinpal_response: Json | null
        }
        Insert: {
          amount: number
          authority: string
          completed_at?: string | null
          contract_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          reference_id?: number | null
          status?: string
          subscription_id?: string | null
          zarinpal_response?: Json | null
        }
        Update: {
          amount?: number
          authority?: string
          completed_at?: string | null
          contract_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          reference_id?: number | null
          status?: string
          subscription_id?: string | null
          zarinpal_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "zarinpal_direct_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "zarinpal_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zarinpal_direct_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
