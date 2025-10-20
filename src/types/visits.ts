// Sales Visit System Type Definitions

export type VisitStatus = 
  | 'draft'
  | 'submitted'
  | 'pending_review'
  | 'action_required'
  | 'approved'
  | 'quotation_sent'
  | 'closed_won'
  | 'closed_lost';

export interface BusinessType {
  id: number;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  sort_order: number;
}

export interface ProductCategory {
  id: number;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  sort_order: number;
}

export interface Client {
  id: number;
  store_name: string;
  contact_person: string;
  mobile: string;
  mobile_2?: string;
  address: string;
  business_type_id: number;
  business_type?: BusinessType;
  created_by_rep_id: number;
  created_at: string;
  updated_at: string;
}

export interface VisitFile {
  id: number;
  visit_id: number;
  file_type: 'photo' | 'video';
  original_filename: string;
  stored_filename: string;
  file_size_bytes: number;
  mime_type: string;
  storage_url: string;
  upload_status: 'uploading' | 'completed' | 'failed';
  uploaded_at: string;
}

export interface Visit {
  id: number;
  client_id: number;
  client?: Client;
  rep_id: number;
  rep_name?: string;
  visit_date: string;
  status: VisitStatus;
  
  // Client Needs
  has_previous_agency: boolean;
  previous_agency_name?: string;
  needs_voiceover: boolean;
  voiceover_language?: string;
  shooting_goals: string[]; // ['social_media', 'in_store', 'content_update', 'other']
  shooting_goals_other_text?: string;
  service_types: string[]; // ['product_photo', 'model_photo', 'video', 'other']
  service_types_other_text?: string;
  preferred_location: 'client_location' | 'action_studio' | 'external';
  
  // Product Details
  product_category_id?: number;
  product_category?: ProductCategory;
  product_description?: string;
  estimated_product_count?: number;
  
  // Timing & Budget
  preferred_shoot_date?: string;
  budget_range?: string;
  
  // Notes
  rep_notes?: string;
  admin_notes?: string;
  action_required_message?: string;
  
  // Files
  files?: VisitFile[];
  
  // Metadata
  submitted_at?: string;
  approved_at?: string;
  approved_by_admin_id?: number;
  created_at: string;
  updated_at: string;
}

export interface VisitStatusHistory {
  id: number;
  visit_id: number;
  from_status?: string;
  to_status: string;
  changed_by_user_id: number;
  changed_by_user_name?: string;
  notes?: string;
  created_at: string;
}

export interface VisitFormData {
  // Client selection or new client data
  client_id?: number;
  new_client?: {
    store_name: string;
    contact_person: string;
    mobile: string;
    mobile_2?: string;
    address: string;
    business_type_id: number;
  };
  
  visit_date: string;
  
  // Client Needs
  has_previous_agency: boolean;
  previous_agency_name?: string;
  needs_voiceover: boolean;
  voiceover_language?: string;
  shooting_goals: string[];
  shooting_goals_other_text?: string;
  service_types: string[];
  service_types_other_text?: string;
  preferred_location: 'client_location' | 'action_studio' | 'external';
  
  // Product Details
  product_category_id?: number;
  product_description?: string;
  estimated_product_count?: number;
  
  // Timing & Budget
  preferred_shoot_date?: string;
  budget_range?: string;
  
  // Notes
  rep_notes?: string;
  
  // Files (handled separately via upload)
  files?: File[];
}

export interface VisitFilters {
  search?: string;
  status?: VisitStatus[];
  rep_id?: number;
  date_from?: string;
  date_to?: string;
  business_type_id?: number;
  service_type?: string;
}

export interface VisitStats {
  total: number;
  draft: number;
  submitted: number;
  pending_review: number;
  approved: number;
  quotation_sent: number;
  closed_won: number;
  closed_lost: number;
  this_week: number;
  this_month: number;
}
