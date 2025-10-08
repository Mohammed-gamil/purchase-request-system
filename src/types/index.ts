// Purchase and Project Request Management System Types

export type UserRole = 'USER' | 'DIRECT_MANAGER' | 'ACCOUNTANT' | 'FINAL_MANAGER' | 'ADMIN';

export type PRState = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DM_APPROVED'
  | 'DM_REJECTED'
  | 'ACCT_APPROVED'
  | 'ACCT_REJECTED'
  | 'FINAL_APPROVED'
  | 'FINAL_REJECTED'
  | 'FUNDS_TRANSFERRED';

export type PayoutChannel = 'WALLET' | 'COMPANY' | 'COURIER';

export type Currency = 'EGP' | 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export type ApprovalStage = 'DM' | 'ACCT' | 'FINAL';

export type Decision = 'PENDING' | 'APPROVED' | 'REJECTED';

export type RequestType = 'purchase' | 'project';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: UserRole;
  team_id?: string | number;
  department_id?: string | number;
  status: 'active' | 'inactive';
  avatar?: string;
  phone?: string;
  position?: string;
  first_name?: string;
  last_name?: string;
  language_preference?: string;
  timezone?: string;
  date_format?: string;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
  team?: Team;
  department?: Department;
}

export interface Department {
  id: string | number;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface Team {
  id: string | number;
  name: string;
  manager_id?: string | number;
  manager?: User;
  description?: string;
}

export interface PRItem {
  id: string | number;
  request_id?: string | number;
  name: string;
  quantity: number;
  unit_price: number;
  vendor_hint?: string;
  total: number;
  created_at?: string;
  updated_at?: string;
}

export interface PRQuote {
  id: string;
  vendorName: string;
  quoteTotal: number;
  filePath: string;
  notes?: string;
  uploadedAt: Date;
}

export interface Approval {
  id: string;
  stage: ApprovalStage;
  approverId: string;
  approver?: User;
  decision: Decision;
  comment?: string;
  decidedAt?: Date;
  createdAt: Date;
}

export interface PRSelectedQuote {
  id: string | number;
  vendor_name?: string;
  vendorName?: string;
  quote_total?: number;
  quoteTotal?: number;
  file_path?: string;
  filePath?: string;
  notes?: string;
  uploaded_at?: string;
  uploadedAt?: string | Date;
}

// Base interface for both purchase and project requests
export interface BaseRequest {
  id: string | number;
  request_id?: string; // Laravel generated PR-2025-001 format
  requester_id: string | number;
  requester?: User;
  title: string;
  description: string;
  type: RequestType;
  category: string;
  location?: string;
  desired_cost: number;
  currency: Currency;
  needed_by_date: string; // ISO date string from Laravel
  start_time?: string; // ISO datetime (for project)
  end_time?: string;   // ISO datetime (for project)
  state: PRState;
  current_approver_id?: string | number;
  currentApprover?: User;
  payout_channel?: PayoutChannel;
  payout_reference?: string;
  funds_transferred_at?: string;
  active_from?: string; // project activation timestamp
  quotes?: PRQuote[] | Array<Record<string, any>>;
  selectedQuote?: PRSelectedQuote | Record<string, any>;
  approvals?: Approval[];
  inventoryItems?: RequestInventoryItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequest extends BaseRequest {
  type: 'purchase';
  items: PRItem[];
}

export interface ProjectRequest extends BaseRequest {
  type: 'project';
  client_name: string;
  project_description: string;
  total_cost: number;
  total_benefit: number;
  total_price: number;
  items?: PRItem[]; // Make items optional for project requests
}

// Union type for handling both request types
export type Request = PurchaseRequest | ProjectRequest;

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  entityType: string;
  entityId: string;
  meta?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface Budget {
  id: string;
  teamId: string;
  team?: Team;
  fiscalYear: number;
  cap: number;
  consumed: number;
  remaining: number;
  utilizationPercentage: number;
}

export interface DashboardStats {
  // Admin stats
  totalUsers?: number;
  activeUsers?: number;
  totalSystemRequests?: number;
  pendingSystemApprovals?: number;
  totalSystemValue?: number;
  
  // User stats
  totalRequests?: number;
  pendingRequests?: number;
  approvedRequests?: number;
  rejectedRequests?: number;
  totalSpent?: number;

  // Manager/Approver stats
  pendingApprovals?: number;
  totalApprovals?: number;
  approvedThisMonth?: number;
  rejectedThisMonth?: number;

  // Legacy fields for backward compatibility
  totalPRs?: number;
  averageApprovalTime?: number;
  budgetUtilization?: number;
  recentActivity?: AuditLog[];
  totalProjects?: number;
  totalProjectValue?: number;
  totalProjectBenefit?: number;
  projectsCompletionRate?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  error?: {
    code: number;
    message: string;
    details?: string[];
  };
}

// Form Types
export interface BaseCreateRequestForm {
  type: RequestType;
  title: string;
  description: string;
  category: string;
  desiredCost: number;
  currency: Currency;
  neededByDate: Date;
}

export interface CreatePurchaseRequestForm extends BaseCreateRequestForm {
  type: 'purchase';
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vendorHint?: string;
  }>;
}

export interface CreateProjectRequestForm extends BaseCreateRequestForm {
  type: 'project';
  clientName: string;
  projectDescription: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  totalCost: number;
  totalBenefit: number;
  totalPrice: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vendorHint?: string;
  }>;
}

// Union type for handling form data
export type CreateRequestForm = CreatePurchaseRequestForm | CreateProjectRequestForm;

// Inventory Types
export interface InventoryItem {
  id: string | number;
  name: string;
  code: string;
  description?: string;
  category: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit: string;
  unit_cost?: number;
  location?: string;
  condition: 'good' | 'fair' | 'needs_maintenance';
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  needs_maintenance?: boolean;
  is_active: boolean;
  is_in_stock: boolean;
  notes?: string;
  added_by: string | number;
  addedBy?: User;
  updated_by?: string | number;
  updatedBy?: User;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string | number;
  inventory_item_id: string | number;
  type: 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUSTMENT' | 'MAINTENANCE';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  related_request_id?: string | number;
  request?: Request;
  user_id: string | number;
  user?: User;
  notes?: string;
  created_at: string;
}

export interface RequestInventoryItem {
  id: string | number;
  request_id: string | number;
  inventory_item_id: string | number;
  inventoryItem?: InventoryItem;
  quantity_requested: number;
  quantity_allocated: number;
  status: 'PENDING' | 'RESERVED' | 'ALLOCATED' | 'RETURNED' | 'LOST';
  expected_return_date?: string;
  actual_return_date?: string;
  return_notes?: string;
  created_at: string;
  updated_at: string;
}

// For backward compatibility
export type CreatePRForm = CreatePurchaseRequestForm;

export interface ApprovalForm {
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  payoutChannel?: PayoutChannel;
}

export interface FundsTransferForm {
  payoutReference: string;
  transferredAt: Date;
}

// Filter and Search Types
export interface PRFilters {
  type?: RequestType[];
  state?: PRState[];
  requesterId?: string;
  teamId?: string;
  currentApproverId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  amountRange?: {
    min: number;
    max: number;
  };
}

export interface PRSearchParams {
  search?: string;
  filters?: PRFilters;
  sort?: {
    field: keyof BaseRequest;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}