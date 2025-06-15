export interface Database {
  public: {
    Tables: {
      queries: {
        Row: {
          id: string;
          resident_name: string;
          resident_email: string;
          resident_phone?: string;
          service_type: 'blue_badge' | 'missed_bin' | 'housing_benefit' | 'pothole_report' | 'planning_permission' | 'noise_complaint' | 'council_tax_reduction' | 'street_lighting' | 'other';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'in_progress' | 'completed' | 'requires_info' | 'cancelled';
          conversation_log: ConversationMessage[];
          collected_data: Record<string, any>;
          staff_notes?: string;
          assigned_to?: string;
          created_at: string;
          updated_at: string;
          email_sent: boolean;
        };
        Insert: {
          id?: string;
          resident_name: string;
          resident_email: string;
          resident_phone?: string;
          service_type: 'blue_badge' | 'missed_bin' | 'housing_benefit' | 'pothole_report' | 'planning_permission' | 'noise_complaint' | 'council_tax_reduction' | 'street_lighting' | 'other';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'requires_info' | 'cancelled';
          conversation_log?: ConversationMessage[];
          collected_data?: Record<string, any>;
          staff_notes?: string;
          assigned_to?: string;
          email_sent?: boolean;
        };
        Update: {
          id?: string;
          resident_name?: string;
          resident_email?: string;
          resident_phone?: string;
          service_type?: 'blue_badge' | 'missed_bin' | 'housing_benefit' | 'pothole_report' | 'planning_permission' | 'noise_complaint' | 'council_tax_reduction' | 'street_lighting' | 'other';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'requires_info' | 'cancelled';
          conversation_log?: ConversationMessage[];
          collected_data?: Record<string, any>;
          staff_notes?: string;
          assigned_to?: string;
          email_sent?: boolean;
        };
      };
    };
  };
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type Query = Database['public']['Tables']['queries']['Row'];
export type QueryInsert = Database['public']['Tables']['queries']['Insert'];
export type QueryUpdate = Database['public']['Tables']['queries']['Update'];