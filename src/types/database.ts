
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "application_events": {
                  Row: {
                    "application_id": string,"changed_by": string | null,"created_at": string,"from_status": Database["public"]['Enums']["application_status"] | null,"id": string,"to_status": Database["public"]['Enums']["application_status"]
                  }
                  Insert: {
                    "application_id": string,"changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: string,"to_status": Database["public"]['Enums']["application_status"]
                  }
                  Update: {
                    "application_id"?: string,"changed_by"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["application_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_events_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "application_events_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {"answers": Json;
                    "cover_note": string | null,"created_at": string,"id": string,"job_id": string,"resume_path": string | null,"seeker_id": string,"status": Database["public"]['Enums']["application_status"],"updated_at": string
                  }
                  Insert: {"answers"?: Json;
                    "cover_note"?: string | null,"created_at"?: string,"id"?: string,"job_id": string,"resume_path"?: string | null,"seeker_id": string,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string
                  }
                  Update: {"answers"?: Json;
                    "cover_note"?: string | null,"created_at"?: string,"id"?: string,"job_id"?: string,"resume_path"?: string | null,"seeker_id"?: string,"status"?: Database["public"]['Enums']["application_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "applications_seeker_id_fkey"
      columns: ["seeker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "created_at": string,"description": string | null,"headquarters": string | null,"id": string,"logo_url": string | null,"name": string,"size": string | null,"slug": string,"tagline": string | null,"website": string | null
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"headquarters"?: string | null,"id"?: string,"logo_url"?: string | null,"name": string,"size"?: string | null,"slug": string,"tagline"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"headquarters"?: string | null,"id"?: string,"logo_url"?: string | null,"name"?: string,"size"?: string | null,"slug"?: string,"tagline"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"experiences": {
                  Row: {
                    "company": string,"created_at": string,"description": string | null,"end_date": string | null,"id": string,"location": string | null,"start_date": string,"title": string,"user_id": string
                  }
                  Insert: {
                    "company": string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"location"?: string | null,"start_date": string,"title": string,"user_id": string
                  }
                  Update: {
                    "company"?: string,"created_at"?: string,"description"?: string | null,"end_date"?: string | null,"id"?: string,"location"?: string | null,"start_date"?: string,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {"city": string | null;"state": string | null;"min_yoe": number | null;"max_yoe": number | null;"questions": Json;
                    "company_id": string,"created_at": string,"description": string,"employment_type": Database["public"]['Enums']["employment_type"],"experience_level": Database["public"]['Enums']["experience_level"],"id": string,"is_remote": boolean,"location": string,"pay_max": number,"pay_min": number,"pay_period": Database["public"]['Enums']["pay_period"],"recruiter_id": string | null,"search": unknown,"skills": (string)[],"status": Database["public"]['Enums']["job_status"],"title": string,"updated_at": string
                  }
                  Insert: {"city"?: string | null;"state"?: string | null;"min_yoe"?: number | null;"max_yoe"?: number | null;"questions"?: Json;
                    "company_id"?: string,"created_at"?: string,"description": string,"employment_type"?: Database["public"]['Enums']["employment_type"],"experience_level": Database["public"]['Enums']["experience_level"],"id"?: string,"is_remote"?: boolean,"location": string,"pay_max": number,"pay_min": number,"pay_period"?: Database["public"]['Enums']["pay_period"],"recruiter_id"?: string | null,"search"?: never,"skills"?: (string)[],"status"?: Database["public"]['Enums']["job_status"],"title": string,"updated_at"?: string
                  }
                  Update: {"city"?: string | null;"state"?: string | null;"min_yoe"?: number | null;"max_yoe"?: number | null;"questions"?: Json;
                    "company_id"?: string,"created_at"?: string,"description"?: string,"employment_type"?: Database["public"]['Enums']["employment_type"],"experience_level"?: Database["public"]['Enums']["experience_level"],"id"?: string,"is_remote"?: boolean,"location"?: string,"pay_max"?: number,"pay_min"?: number,"pay_period"?: Database["public"]['Enums']["pay_period"],"recruiter_id"?: string | null,"search"?: never,"skills"?: (string)[],"status"?: Database["public"]['Enums']["job_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_recruiter_id_fkey"
      columns: ["recruiter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"full_name": string,"id": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id": string,"role": Database["public"]['Enums']["user_role"]
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"full_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["user_role"]
                  }
                  Relationships: [
                    
                  ]
                },"recruiters": {
                  Row: {
                    "company_id": string,"title": string | null,"user_id": string
                  }
                  Insert: {
                    "company_id": string,"title"?: string | null,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"title"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recruiters_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recruiters_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"seeker_profiles": {
                  Row: {"city": string | null;"state": string | null;
                    "bio": string | null,"headline": string | null,"location": string | null,"pref_employment_types": (Database["public"]['Enums']["employment_type"])[],"pref_experience_level": Database["public"]['Enums']["experience_level"] | null,"pref_locations": (string)[],"pref_min_pay": number | null,"pref_remote": boolean,"resume_filename": string | null,"resume_path": string | null,"skills": (string)[],"updated_at": string,"user_id": string
                  }
                  Insert: {"city"?: string | null;"state"?: string | null;
                    "bio"?: string | null,"headline"?: string | null,"location"?: string | null,"pref_employment_types"?: (Database["public"]['Enums']["employment_type"])[],"pref_experience_level"?: Database["public"]['Enums']["experience_level"] | null,"pref_locations"?: (string)[],"pref_min_pay"?: number | null,"pref_remote"?: boolean,"resume_filename"?: string | null,"resume_path"?: string | null,"skills"?: (string)[],"updated_at"?: string,"user_id": string
                  }
                  Update: {"city"?: string | null;"state"?: string | null;
                    "bio"?: string | null,"headline"?: string | null,"location"?: string | null,"pref_employment_types"?: (Database["public"]['Enums']["employment_type"])[],"pref_experience_level"?: Database["public"]['Enums']["experience_level"] | null,"pref_locations"?: (string)[],"pref_min_pay"?: number | null,"pref_remote"?: boolean,"resume_filename"?: string | null,"resume_path"?: string | null,"skills"?: (string)[],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seeker_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "can_view_application":
{ Args: { "target_application": string }; Returns: boolean
                           },
"can_view_seeker":
{ Args: { "target_seeker": string }; Returns: boolean
                           },
"has_applied_to_job":
{ Args: { "target_job": string }; Returns: boolean
                           },
"is_company_recruiter":
{ Args: { "target_company": string }; Returns: boolean
                           },
"my_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           }
          }
          Enums: {
            "application_status": "applied"|"reviewing"|"interviewing"|"offer"|"rejected"|"withdrawn","employment_type": "full_time"|"part_time"|"contract"|"internship","experience_level": "intern"|"entry"|"mid"|"senior"|"lead","job_status": "draft"|"open"|"closed","pay_period": "year"|"hour","user_role": "seeker"|"recruiter"
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
  "public": {
          Enums: {
            "application_status": ["applied", "reviewing", "interviewing", "offer", "rejected", "withdrawn"],"employment_type": ["full_time", "part_time", "contract", "internship"],"experience_level": ["intern", "entry", "mid", "senior", "lead"],"job_status": ["draft", "open", "closed"],"pay_period": ["year", "hour"],"user_role": ["seeker", "recruiter"]
          }
        }
} as const
