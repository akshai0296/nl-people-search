
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "billing_events": {
                  Row: {
                    "company_id": string | null,"created": number,"id": string,"outcome": string,"received_at": string,"subscription_id": string | null,"type": string
                  }
                  Insert: {
                    "company_id"?: string | null,"created": number,"id": string,"outcome"?: string,"received_at"?: string,"subscription_id"?: string | null,"type": string
                  }
                  Update: {
                    "company_id"?: string | null,"created"?: number,"id"?: string,"outcome"?: string,"received_at"?: string,"subscription_id"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "billing_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"candidates": {
                  Row: {
                    "avatar_url": string | null,"city": string,"country": string,"current_company": string,"current_company_logo_url": string | null,"current_title": string,"full_name": string,"headline": string,"id": string,"open_to_work": boolean,"primary_skills": (string)[],"role": string,"seniority": string,"skills": (string)[],"state": string | null,"years_experience": number
                  }
                  Insert: {
                    "avatar_url"?: string | null,"city": string,"country": string,"current_company": string,"current_company_logo_url"?: string | null,"current_title": string,"full_name": string,"headline": string,"id": string,"open_to_work": boolean,"primary_skills"?: (string)[],"role": string,"seniority": string,"skills"?: (string)[],"state"?: string | null,"years_experience": number
                  }
                  Update: {
                    "avatar_url"?: string | null,"city"?: string,"country"?: string,"current_company"?: string,"current_company_logo_url"?: string | null,"current_title"?: string,"full_name"?: string,"headline"?: string,"id"?: string,"open_to_work"?: boolean,"primary_skills"?: (string)[],"role"?: string,"seniority"?: string,"skills"?: (string)[],"state"?: string | null,"years_experience"?: number
                  }
                  Relationships: [
                    
                  ]
                },"companies": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"searches_used": number,"slug": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"searches_used"?: number,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"searches_used"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"education": {
                  Row: {
                    "candidate_id": string,"degree": string,"field": string,"graduation_year": number | null,"position": number,"school": string
                  }
                  Insert: {
                    "candidate_id": string,"degree": string,"field": string,"graduation_year"?: number | null,"position": number,"school": string
                  }
                  Update: {
                    "candidate_id"?: string,"degree"?: string,"field"?: string,"graduation_year"?: number | null,"position"?: number,"school"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "education_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"experiences": {
                  Row: {
                    "candidate_id": string,"company": string,"company_logo_url": string | null,"company_type": string,"description": string | null,"end_year": number | null,"position": number,"start_year": number,"title": string
                  }
                  Insert: {
                    "candidate_id": string,"company": string,"company_logo_url"?: string | null,"company_type": string,"description"?: string | null,"end_year"?: number | null,"position": number,"start_year": number,"title": string
                  }
                  Update: {
                    "candidate_id"?: string,"company"?: string,"company_logo_url"?: string | null,"company_type"?: string,"description"?: string | null,"end_year"?: number | null,"position"?: number,"start_year"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiences_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"recruiters": {
                  Row: {
                    "company_id": string,"created_at": string,"full_name": string,"user_id": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"full_name": string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"full_name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recruiters_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_briefs": {
                  Row: {
                    "brief": string,"company_id": string,"created_at": string,"created_by": string | null,"filters": NonNullable<Json>,"id": string
                  }
                  Insert: {
                    "brief": string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"filters": NonNullable<Json>,"id"?: string
                  }
                  Update: {
                    "brief"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"filters"?: NonNullable<Json>,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_briefs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_briefs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["user_id"]
    }
                  ]
                },"searches": {
                  Row: {
                    "brief": string,"company_id": string,"created_at": string,"filters": NonNullable<Json>,"id": string,"recruiter_id": string | null,"result_ids": (string)[],"unsupported": NonNullable<Json>
                  }
                  Insert: {
                    "brief": string,"company_id": string,"created_at"?: string,"filters": NonNullable<Json>,"id"?: string,"recruiter_id"?: string | null,"result_ids": (string)[],"unsupported"?: NonNullable<Json>
                  }
                  Update: {
                    "brief"?: string,"company_id"?: string,"created_at"?: string,"filters"?: NonNullable<Json>,"id"?: string,"recruiter_id"?: string | null,"result_ids"?: (string)[],"unsupported"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "searches_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "searches_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["user_id"]
    }
                  ]
                },"shortlist_members": {
                  Row: {
                    "added_at": string,"added_by": string | null,"candidate_id": string,"shortlist_id": string
                  }
                  Insert: {
                    "added_at"?: string,"added_by"?: string | null,"candidate_id": string,"shortlist_id": string
                  }
                  Update: {
                    "added_at"?: string,"added_by"?: string | null,"candidate_id"?: string,"shortlist_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlist_members_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "shortlist_members_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlist_members_shortlist_id_fkey"
      columns: ["shortlist_id"]
isOneToOne: false
      referencedRelation: "shortlists"
      referencedColumns: ["id"]
    }
                  ]
                },"shortlists": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"updated_at": string
                  }
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shortlists_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shortlists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "recruiters"
      referencedColumns: ["user_id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "company_id": string,"current_period_end": string | null,"customer_id": string | null,"id": string,"last_event_created": number,"last_event_id": string,"last_event_rank": number,"status": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"current_period_end"?: string | null,"customer_id"?: string | null,"id": string,"last_event_created": number,"last_event_id": string,"last_event_rank": number,"status": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"current_period_end"?: string | null,"customer_id"?: string | null,"id"?: string,"last_event_created"?: number,"last_event_id"?: string,"last_event_rank"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_subscription_event":
{ Args: { "p_company_slug": string,"p_current_period_end": number,"p_customer_id": string,"p_event_created": number,"p_event_id": string,"p_event_type": string,"p_status": string,"p_subscription_id": string }; Returns: string
                           },
"begin_search":
{ Args: { "p_company_id": string }; Returns: Json
                           },
"finish_search":
{ Args: { "p_brief": string,"p_company_id": string,"p_filters": Json,"p_page_size"?: number,"p_recruiter_id": string,"p_unsupported": Json }; Returns: Json
                           },
"my_plan":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"record_ignored_billing_event":
{ Args: { "p_event_created": number,"p_event_id": string,"p_event_type": string }; Returns: string
                           },
"refund_search":
{ Args: { "p_company_id": string }; Returns: undefined
                           },
"search_page":
{ Args: { "p_page": number,"p_page_size"?: number,"p_search_id": string }; Returns: Json
                           },
"search_vocabulary":
{ Args: Record<PropertyKey, never>; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
