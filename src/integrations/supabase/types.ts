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
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          options: Json | null
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json | null
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          delivered_content: string | null
          id: string
          payment_id: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          delivered_content?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          delivered_content?: string | null
          id?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_items: {
        Row: {
          content: string
          created_at: string | null
          file_url: string | null
          id: string
          is_sold: boolean | null
          order_id: string | null
          product_id: string
          sold_at: string | null
          sold_to: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_sold?: boolean | null
          order_id?: string | null
          product_id: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          file_url?: string | null
          id?: string
          is_sold?: boolean | null
          order_id?: string | null
          product_id?: string
          sold_at?: string | null
          sold_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_items_sold_to_fkey"
            columns: ["sold_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          countries: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          legal_note: string | null
          long_desc: string | null
          max_per_user: number
          media_urls: string[] | null
          name: string
          price: number
          services: string[] | null
          short_desc: string | null
          sort_order: number | null
          stock: number | null
          tags: string[] | null
          type: Database["public"]["Enums"]["product_type"] | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          countries?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          legal_note?: string | null
          long_desc?: string | null
          max_per_user?: number
          media_urls?: string[] | null
          name: string
          price: number
          services?: string[] | null
          short_desc?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          countries?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          legal_note?: string | null
          long_desc?: string | null
          max_per_user?: number
          media_urls?: string[] | null
          name?: string
          price?: number
          services?: string[] | null
          short_desc?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          type?: Database["public"]["Enums"]["product_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number | null
          ban_reason: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_banned: boolean | null
          language_code: string | null
          last_name: string | null
          photo_url: string | null
          telegram_id: number
          updated_at: string | null
          username: string | null
        }
        Insert: {
          balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_banned?: boolean | null
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id: number
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          balance?: number | null
          ban_reason?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_banned?: boolean | null
          language_code?: string | null
          last_name?: string | null
          photo_url?: string | null
          telegram_id?: number
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          used_count?: number
        }
        Relationships: []
      }
      promo_uses: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          promo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          promo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          promo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_uses_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          payment_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          payment_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_product_item: {
        Args: { p_order_id: string; p_product_id: string; p_user_id: string }
        Returns: {
          content: string
          created_at: string | null
          file_url: string | null
          id: string
          is_sold: boolean | null
          order_id: string | null
          product_id: string
          sold_at: string | null
          sold_to: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "product_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status: "pending" | "paid" | "completed" | "cancelled" | "refunded"
      product_type: "one-time" | "subscription"
      transaction_type: "deposit" | "purchase" | "refund" | "bonus"
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
      app_role: ["admin", "moderator", "user"],
      order_status: ["pending", "paid", "completed", "cancelled", "refunded"],
      product_type: ["one-time", "subscription"],
      transaction_type: ["deposit", "purchase", "refund", "bonus"],
    },
  },
} as const
