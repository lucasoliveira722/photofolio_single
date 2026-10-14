// Supabase database types, in the format of `supabase gen types typescript`.
// Mirrors supabase/schema.sql; regenerate with `npm run gen:types` after schema changes.

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
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          height: number
          id: string
          is_featured: boolean
          storage_path: string
          title: string
          width: number
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          height: number
          id?: string
          is_featured?: boolean
          storage_path: string
          title: string
          width: number
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          height?: number
          id?: string
          is_featured?: boolean
          storage_path?: string
          title?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
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

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
