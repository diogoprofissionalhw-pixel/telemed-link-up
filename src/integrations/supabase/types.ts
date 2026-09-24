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
      academy_company_members: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          invited_at: string | null
          network_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          invited_at?: string | null
          network_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          invited_at?: string | null
          network_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_company_members_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_members_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_members_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_members_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_company_track_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          module_id: string | null
          position: number
          track_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          module_id?: string | null
          position?: number
          track_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          module_id?: string | null
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_company_track_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_track_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_track_items_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "academy_company_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_company_tracks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          network_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          network_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          network_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_company_tracks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: true
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_company_tracks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: true
            referencedRelation: "networks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_courses: {
        Row: {
          accent: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          position: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          accent?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          accent?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          percent: number
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          percent?: number
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          percent?: number
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_intro: boolean
          is_published: boolean
          module_id: string | null
          position: number
          source_type: string
          summary: string | null
          summary_images: Json
          summary_references: string[]
          title: string
          updated_at: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_intro?: boolean
          is_published?: boolean
          module_id?: string | null
          position?: number
          source_type?: string
          summary?: string | null
          summary_images?: Json
          summary_references?: string[]
          title: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_intro?: boolean
          is_published?: boolean
          module_id?: string | null
          position?: number
          source_type?: string
          summary?: string | null
          summary_images?: Json
          summary_references?: string[]
          title?: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          attempt_no: number
          correct_count: number
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          total_count: number
          user_id: string
        }
        Insert: {
          attempt_no?: number
          correct_count?: number
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          total_count?: number
          user_id: string
        }
        Update: {
          attempt_no?: number
          correct_count?: number
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "academy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          label: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label: string
          position?: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "academy_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_questions: {
        Row: {
          created_at: string
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "academy_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quizzes: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          scope: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number
          module_id?: string | null
          scope: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          max_attempts?: number
          module_id?: string | null
          scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      doctor_availabilities: {
        Row: {
          available_date: string
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          available_date: string
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          available_date?: string
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_certifications: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          issued_year: number | null
          issuer: string | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          issued_year?: number | null
          issuer?: string | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          issued_year?: number | null
          issuer?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      doctor_courses: {
        Row: {
          completed_year: number | null
          created_at: string
          doctor_id: string
          hours: number | null
          id: string
          institution: string | null
          title: string
        }
        Insert: {
          completed_year?: number | null
          created_at?: string
          doctor_id: string
          hours?: number | null
          id?: string
          institution?: string | null
          title: string
        }
        Update: {
          completed_year?: number | null
          created_at?: string
          doctor_id?: string
          hours?: number | null
          id?: string
          institution?: string | null
          title?: string
        }
        Relationships: []
      }
      doctor_experiences: {
        Row: {
          created_at: string
          description: string | null
          doctor_id: string
          end_date: string | null
          id: string
          institution: string
          role: string
          start_date: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          doctor_id: string
          end_date?: string | null
          id?: string
          institution: string
          role: string
          start_date: string
        }
        Update: {
          created_at?: string
          description?: string | null
          doctor_id?: string
          end_date?: string | null
          id?: string
          institution?: string
          role?: string
          start_date?: string
        }
        Relationships: []
      }
      doctor_publications: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          journal: string | null
          title: string
          url: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          journal?: string | null
          title: string
          url?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          journal?: string | null
          title?: string
          url?: string | null
          year?: number | null
        }
        Relationships: []
      }
      doctor_weekly_availability: {
        Row: {
          doctor_id: string
          end_time: string
          id: string
          start_time: string
          timezone: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          doctor_id: string
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          doctor_id?: string
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      doctors: {
        Row: {
          avatar_url: string | null
          bank_account: string | null
          bank_account_digit: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          bio: string | null
          certifications: string | null
          cfm: string | null
          cfm_status: Database["public"]["Enums"]["cfm_status"]
          cfm_uf: string | null
          city: string | null
          consultation_fee: number | null
          country: string | null
          cpf: string | null
          created_at: string
          crm: string
          crm_document_url: string | null
          crm_status: Database["public"]["Enums"]["crm_status"]
          crm_uf: string
          cv_pdf_url: string | null
          diploma_url: string | null
          education: string | null
          email: string | null
          headline: string | null
          id: string
          id_document_url: string | null
          identity_verified: boolean
          identity_verified_at: string | null
          is_premium: boolean
          languages: string | null
          lattes_url: string | null
          linkedin_url: string | null
          medical_experience: string | null
          payment_method: string | null
          phone: string | null
          pix_key: string | null
          pix_key_type: string | null
          premium_since: string | null
          premium_until: string | null
          public_id: string | null
          rg_document_url: string | null
          selfie_url: string | null
          specialties: string[]
          specialty: string
          state: string | null
          timezone: string
          whatsapp: string | null
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_digit?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bio?: string | null
          certifications?: string | null
          cfm?: string | null
          cfm_status?: Database["public"]["Enums"]["cfm_status"]
          cfm_uf?: string | null
          city?: string | null
          consultation_fee?: number | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          crm: string
          crm_document_url?: string | null
          crm_status?: Database["public"]["Enums"]["crm_status"]
          crm_uf: string
          cv_pdf_url?: string | null
          diploma_url?: string | null
          education?: string | null
          email?: string | null
          headline?: string | null
          id: string
          id_document_url?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_premium?: boolean
          languages?: string | null
          lattes_url?: string | null
          linkedin_url?: string | null
          medical_experience?: string | null
          payment_method?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          premium_since?: string | null
          premium_until?: string | null
          public_id?: string | null
          rg_document_url?: string | null
          selfie_url?: string | null
          specialties?: string[]
          specialty: string
          state?: string | null
          timezone?: string
          whatsapp?: string | null
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bank_account?: string | null
          bank_account_digit?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          bio?: string | null
          certifications?: string | null
          cfm?: string | null
          cfm_status?: Database["public"]["Enums"]["cfm_status"]
          cfm_uf?: string | null
          city?: string | null
          consultation_fee?: number | null
          country?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string
          crm_document_url?: string | null
          crm_status?: Database["public"]["Enums"]["crm_status"]
          crm_uf?: string
          cv_pdf_url?: string | null
          diploma_url?: string | null
          education?: string | null
          email?: string | null
          headline?: string | null
          id?: string
          id_document_url?: string | null
          identity_verified?: boolean
          identity_verified_at?: string | null
          is_premium?: boolean
          languages?: string | null
          lattes_url?: string | null
          linkedin_url?: string | null
          medical_experience?: string | null
          payment_method?: string | null
          phone?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          premium_since?: string | null
          premium_until?: string | null
          public_id?: string | null
          rg_document_url?: string | null
          selfie_url?: string | null
          specialties?: string[]
          specialty?: string
          state?: string | null
          timezone?: string
          whatsapp?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          request_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          request_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          request_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "shift_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      network_doctor_tags: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          is_blocked: boolean
          is_favorite: boolean
          network_id: string
          notes: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          is_blocked?: boolean
          is_favorite?: boolean
          network_id: string
          notes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          is_blocked?: boolean
          is_favorite?: boolean
          network_id?: string
          notes?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      networks: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          cnae_code: string | null
          cnpj: string
          cnpj_activity: string | null
          cnpj_verified_at: string | null
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          legal_name: string | null
          linkedin_url: string | null
          network_name: string
          qualification_status: string
          qualified_at: string | null
          state: string | null
          website_url: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cnae_code?: string | null
          cnpj: string
          cnpj_activity?: string | null
          cnpj_verified_at?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_verified?: boolean
          legal_name?: string | null
          linkedin_url?: string | null
          network_name: string
          qualification_status?: string
          qualified_at?: string | null
          state?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          cnae_code?: string | null
          cnpj?: string
          cnpj_activity?: string | null
          cnpj_verified_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_verified?: boolean
          legal_name?: string | null
          linkedin_url?: string | null
          network_name?: string
          qualification_status?: string
          qualified_at?: string | null
          state?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networks_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          request_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          care_quality: number | null
          comment: string | null
          communication: number | null
          created_at: string
          doctor_id: string
          id: string
          network_id: string
          punctuality: number | null
          request_id: string
          stars: number
        }
        Insert: {
          care_quality?: number | null
          comment?: string | null
          communication?: number | null
          created_at?: string
          doctor_id: string
          id?: string
          network_id: string
          punctuality?: number | null
          request_id: string
          stars: number
        }
        Update: {
          care_quality?: number | null
          comment?: string | null
          communication?: number | null
          created_at?: string
          doctor_id?: string
          id?: string
          network_id?: string
          punctuality?: number | null
          request_id?: string
          stars?: number
        }
        Relationships: [
          {
            foreignKeyName: "ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "shift_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_requests: {
        Row: {
          agreed_value: number | null
          cancellation_reason: string | null
          created_at: string
          doctor_id: string
          duration_hours: number
          end_time: string
          id: string
          network_id: string
          notes: string | null
          responded_at: string | null
          response_message: string | null
          shift_date: string
          shift_period: Database["public"]["Enums"]["shift_period"]
          start_time: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          agreed_value?: number | null
          cancellation_reason?: string | null
          created_at?: string
          doctor_id: string
          duration_hours: number
          end_time: string
          id?: string
          network_id: string
          notes?: string | null
          responded_at?: string | null
          response_message?: string | null
          shift_date: string
          shift_period?: Database["public"]["Enums"]["shift_period"]
          start_time: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          agreed_value?: number | null
          cancellation_reason?: string | null
          created_at?: string
          doctor_id?: string
          duration_hours?: number
          end_time?: string
          id?: string
          network_id?: string
          notes?: string | null
          responded_at?: string | null
          response_message?: string | null
          shift_date?: string
          shift_period?: Database["public"]["Enums"]["shift_period"]
          start_time?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_requests_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_requests_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_chat_settings: {
        Row: {
          cleared_at: string | null
          created_at: string
          id: string
          muted_at: string | null
          peer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          muted_at?: string | null
          peer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          id?: string
          muted_at?: string | null
          peer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      doctors_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string | null
          city: string | null
          consultation_fee: number | null
          country: string | null
          created_at: string | null
          crm: string | null
          crm_status: Database["public"]["Enums"]["crm_status"] | null
          crm_uf: string | null
          cv_pdf_url: string | null
          education: string | null
          full_name: string | null
          headline: string | null
          id: string | null
          identity_verified: boolean | null
          identity_verified_at: string | null
          is_premium: boolean | null
          languages: string | null
          lattes_url: string | null
          linkedin_url: string | null
          medical_experience: string | null
          payment_method: string | null
          premium_since: string | null
          premium_until: string | null
          public_id: string | null
          specialties: string[] | null
          specialty: string | null
          state: string | null
          timezone: string | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      networks_public: {
        Row: {
          avatar_url: string | null
          city: string | null
          cnpj_activity: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_verified: boolean | null
          linkedin_url: string | null
          network_name: string | null
          state: string | null
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          cnpj_activity?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          network_name?: string | null
          state?: string | null
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          cnpj_activity?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_verified?: boolean | null
          linkedin_url?: string | null
          network_name?: string | null
          state?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networks_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auto_finalize_shifts: { Args: never; Returns: undefined }
      doctors_directory: {
        Args: never
        Returns: {
          avatar_url: string
          bio: string
          certifications: string
          cfm_status: Database["public"]["Enums"]["cfm_status"]
          city: string
          consultation_fee: number
          country: string
          created_at: string
          crm: string
          crm_status: Database["public"]["Enums"]["crm_status"]
          crm_uf: string
          cv_pdf_url: string
          education: string
          full_name: string
          headline: string
          id: string
          identity_verified: boolean
          is_premium: boolean
          languages: string
          lattes_url: string
          linkedin_url: string
          medical_experience: string
          public_id: string
          specialties: string[]
          specialty: string
          state: string
          timezone: string
          years_experience: number
        }[]
      }
      get_my_network: {
        Args: never
        Returns: {
          address: string | null
          avatar_url: string | null
          city: string | null
          cnae_code: string | null
          cnpj: string
          cnpj_activity: string | null
          cnpj_verified_at: string | null
          created_at: string
          description: string | null
          id: string
          is_verified: boolean
          legal_name: string | null
          linkedin_url: string | null
          network_name: string
          qualification_status: string
          qualified_at: string | null
          state: string | null
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "networks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_network: { Args: { _uid: string }; Returns: boolean }
      is_verified_network: { Args: { _uid: string }; Returns: boolean }
      networks_directory: {
        Args: never
        Returns: {
          avatar_url: string
          city: string
          cnpj_activity: string
          created_at: string
          description: string
          id: string
          is_verified: boolean
          linkedin_url: string
          network_name: string
          state: string
          website_url: string
        }[]
      }
      send_shift_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      account_type: "doctor" | "network"
      cfm_status: "verified" | "pending" | "invalid"
      crm_status: "verified" | "pending" | "invalid"
      request_status:
        | "pending"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
      shift_period: "morning" | "night" | "custom"
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
  public: {
    Enums: {
      account_type: ["doctor", "network"],
      cfm_status: ["verified", "pending", "invalid"],
      crm_status: ["verified", "pending", "invalid"],
      request_status: [
        "pending",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
      shift_period: ["morning", "night", "custom"],
    },
  },
} as const
