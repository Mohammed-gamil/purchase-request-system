import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { User, LoginCredentials, AuthResponse, ApiResponse, Request, DashboardStats } from '@/types';
import { config } from '@/config/app';

// API Configuration
const API_BASE_URL = config.api.baseUrl;

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: (): string | null => localStorage.getItem(config.auth.tokenKey),
  setToken: (token: string): void => {
    localStorage.setItem(config.auth.tokenKey, token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  removeToken: (): void => {
    localStorage.removeItem(config.auth.tokenKey);
    delete axiosInstance.defaults.headers.common['Authorization'];
  },
  isAuthenticated: (): boolean => !!localStorage.getItem(config.auth.tokenKey),
};

// Set token on app initialization if it exists
const existingToken = tokenManager.getToken();
if (existingToken) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
}

// Request interceptor for adding auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    const axiosError = error as any;
    if (axiosError.response?.status === 401) {
      tokenManager.removeToken();
      // Do not hard-redirect on 401. Let callers handle it (e.g., show "Invalid credentials").
      // Hard-redirecting to '/login' can cause 404s on static hosts without SPA rewrites.
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: async (credentials: LoginCredentials & { remember?: boolean }): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post('/auth/login', credentials);
      const { user, token, expires_at } = response.data.data;
      
      tokenManager.setToken(token);
      
      return { user, token, expires_at };
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.removeToken();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await axiosInstance.get('/auth/me');
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Failed to get user';
      throw new Error(errorMessage);
    }
  },

  getProfile: async (): Promise<User> => {
    try {
      const response = await axiosInstance.get('/auth/profile');
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Failed to get profile';
      throw new Error(errorMessage);
    }
  },

  updateProfile: async (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: string;
    language_preference?: string;
    timezone?: string;
    currency?: string;
  }): Promise<User> => {
    try {
      const response = await axiosInstance.put('/auth/profile', data);
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Failed to update profile';
      throw new Error(errorMessage);
    }
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> => {
    try {
      await axiosInstance.post('/auth/change-password', data);
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Failed to change password';
      throw new Error(errorMessage);
    }
  },

  refreshToken: async (): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post('/auth/refresh');
      const { user, token, expires_at } = response.data.data;
      
      tokenManager.setToken(token);
      
      return { user, token, expires_at };
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Token refresh failed';
      throw new Error(errorMessage);
    }
  },
};

// Generic API client
export const apiClient = {
  get: async <T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosInstance.get(url, { params });
      return response.data;
    } catch (error: unknown) {
      const errorMessage = (error as any)?.response?.data?.error?.message || 'Request failed';
      throw new Error(errorMessage);
    }
  },

  post: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosInstance.post(url, data);
      return response.data;
    } catch (error: unknown) {
      const err = (error as any)?.response?.data?.error;
      const details: string[] | undefined = err?.details;
      const errorMessage = err?.message || 'Request failed';
      const composed = details && details.length ? `${errorMessage}: ${details.join('; ')}` : errorMessage;
      throw new Error(composed);
    }
  },

  put: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosInstance.put(url, data);
      return response.data;
    } catch (error: unknown) {
      const err = (error as any)?.response?.data?.error;
      const details: string[] | undefined = err?.details;
      const errorMessage = err?.message || 'Request failed';
      const composed = details && details.length ? `${errorMessage}: ${details.join('; ')}` : errorMessage;
      throw new Error(composed);
    }
  },

  patch: async <T>(url: string, data?: unknown): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosInstance.patch(url, data);
      return response.data;
    } catch (error: unknown) {
      const err = (error as any)?.response?.data?.error;
      const details: string[] | undefined = err?.details;
      const errorMessage = err?.message || 'Request failed';
      const composed = details && details.length ? `${errorMessage}: ${details.join('; ')}` : errorMessage;
      throw new Error(composed);
    }
  },

  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    try {
      const response = await axiosInstance.delete(url);
      return response.data;
    } catch (error: unknown) {
      const err = (error as any)?.response?.data?.error;
      const details: string[] | undefined = err?.details;
      const errorMessage = err?.message || 'Request failed';
      const composed = details && details.length ? `${errorMessage}: ${details.join('; ')}` : errorMessage;
      throw new Error(composed);
    }
  },

  upload: async <T>(url: string, formData: FormData): Promise<ApiResponse<T>> => {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const token = tokenManager.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await axios.post(API_BASE_URL + url, formData, {
        headers,
        timeout: config.api.timeout,
      });
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Upload failed';
      throw new Error(errorMessage);
    }
  },

  download: async (url: string, filename?: string): Promise<void> => {
    try {
      const response = await axiosInstance.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Download failed';
      throw new Error(errorMessage);
    }
  },
};

// Request Management API
export const requestsApi = {
  // Get all requests (with filtering and pagination)
  getRequests: async (params?: {
    per_page?: number;
    type?: 'purchase' | 'project';
    state?: string;
    search?: string;
  }): Promise<ApiResponse<Request[]>> => {
    return apiClient.get('/requests', params);
  },

  // Get user's own requests
  getUserRequests: async (userId: string): Promise<ApiResponse<Request[]>> => {
    return apiClient.get(`/requests/user/${userId}`);
  },

  // Get single request details
  getRequest: async (id: string): Promise<ApiResponse<Request>> => {
    return apiClient.get(`/requests/${id}`);
  },

  // Create new request (purchase or project)
  createRequest: async (data: {
    type: 'purchase' | 'project';
    title: string;
    description: string;
    category: string;
    direct_manager_id?: number;
    location?: string;
    desired_cost: number;
    currency: string;
    needed_by_date: string;
    start_time?: string;
    end_time?: string;
    submit_immediately?: boolean;
    items?: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      vendor_hint?: string;
    }>;
    // Project-specific fields
    client_name?: string;
    project_description?: string;
    total_cost?: number;
    total_benefit?: number;
    total_price?: number;
  }): Promise<ApiResponse<Request>> => {
    return apiClient.post('/requests', data);
  },

  // Update request (only allowed in DRAFT state)
  updateRequest: async (id: string, data: {
    title?: string;
    description?: string;
    desired_cost?: number;
    needed_by_date?: string;
    items?: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      vendor_hint?: string;
    }>;
    // Project-specific fields
    client_name?: string;
    project_description?: string;
    total_cost?: number;
    total_benefit?: number;
    total_price?: number;
  }): Promise<ApiResponse<Request>> => {
    return apiClient.put(`/requests/${id}`, data);
  },

  // Submit request for approval
  submitRequest: async (id: string): Promise<ApiResponse<Request>> => {
    return apiClient.post(`/requests/${id}/submit`);
  },

  // Create a vendor quote using a remote URL (JSON)
  uploadQuoteUrl: async (
    id: string,
    data: { vendor_name: string; quote_total: number; file_url: string; notes?: string }
  ): Promise<ApiResponse<Request>> => {
    return apiClient.post(`/requests/${id}/quotes`, data);
  },

  // Comments
  getComments: async (id: string): Promise<ApiResponse<Array<{ id: number; author: string; author_id: number; content: string; created_at: string }>>> => {
    return apiClient.get(`/requests/${id}/comments`);
  },
  addComment: async (id: string, data: { content: string }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/requests/${id}/comments`, data);
  },

  // Delete request (only allowed in DRAFT state)
  deleteRequest: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/requests/${id}`);
  },

  // Get pending approvals (for managers/accountants only)
  getPendingApprovals: async (params?: { per_page?: number }): Promise<ApiResponse<Request[]>> => {
    return apiClient.get('/requests/pending-approvals', params);
  },
};

// Dashboard API
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return apiClient.get('/dashboard/stats');
  },

  // Get recent activity
  getRecentActivity: async (params?: { limit?: number }): Promise<ApiResponse<Record<string, any>[]>> => {
    return apiClient.get('/dashboard/recent-activity', params);
  },
};

// Approval API
export const approvalsApi = {
  // Approve request (managers/accountants only)
  approveRequest: async (requestId: string, data: {
    comment?: string;
    payout_channel?: 'WALLET' | 'COMPANY' | 'COURIER';
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/approve`, data);
  },

  // Reject request with mandatory comment
  rejectRequest: async (requestId: string, data: {
    comment: string; // Made mandatory as per API docs
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/reject`, data);
  },

  // Transfer funds (admin only)
  transferFunds: async (requestId: string, data: {
    payout_reference: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/transfer-funds`, data);
  },

  // Select quote for a request (Final Manager only)
  selectQuote: async (requestId: string, data?: { quote_id?: number; auto_lowest?: boolean }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/select-quote`, data);
  },

  // Project: requester marks project as done
  markProjectDone: async (requestId: string): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/mark-done`);
  },

  // Project: accountant confirms client paid
  confirmClientPaid: async (requestId: string, data?: { payout_reference?: string }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/approvals/${requestId}/confirm-paid`, data);
  },

  // Get complete approval history for a request
  getApprovalHistory: async (requestId: string): Promise<ApiResponse<Record<string, any>[]>> => {
    return apiClient.get(`/approvals/${requestId}/history`);
  },
};

// Admin API
export const adminApi = {
  // User management
  getUsers: async (params?: {
    per_page?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<ApiResponse<User[]>> => {
    return apiClient.get('/admin/users', params);
  },

  getUser: async (id: string): Promise<ApiResponse<User>> => {
    return apiClient.get(`/admin/users/${id}`);
  },

  createUser: async (data: {
    name: string;
    email: string;
    password: string;
    role: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: string;
    team_id?: number;
    department_id?: number;
    language_preference?: string;
    timezone?: string;
    currency?: string;
  }): Promise<ApiResponse<User>> => {
    return apiClient.post('/admin/users', data);
  },

  updateUser: async (id: string, data: {
    name?: string;
    role?: string;
    position?: string;
    status?: string;
    [key: string]: any;
  }): Promise<ApiResponse<User>> => {
    return apiClient.put(`/admin/users/${id}`, data);
  },

  deleteUser: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/admin/users/${id}`);
  },

  toggleUserStatus: async (id: string): Promise<ApiResponse<User>> => {
    return apiClient.post(`/admin/users/${id}/toggle-status`);
  },

  // Reports
  getAdminOverview: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/admin/reports/overview');
  },

  getRequestsReport: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/admin/reports/requests');
  },

  getUsersReport: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/admin/reports/users');
  },

  // Admin-only: delete any request/project by id
  deleteRequest: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/admin/requests/${id}`);
  },
};

// Lightweight directory endpoints (non-admin)
export const directoryApi = {
  getUsersByRole: async (role: string, params?: { per_page?: number }): Promise<ApiResponse<User[]>> => {
    return apiClient.get('/users/by-role', { role, ...(params || {}) });
  },
};

// Manager Reports API
export const managerReportsApi = {
  // Get team requests report
  getTeamRequests: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/reports/team-requests');
  },

  // Get budget utilization report
  getBudgetUtilization: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/reports/budget-utilization');
  },

  // Get approval times analytics
  getApprovalTimes: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/reports/approval-times');
  },
};

// Profile API (kept for backward compatibility)
export const profileApi = {
  // Get profile
  getProfile: async (): Promise<ApiResponse<User>> => {
    return authApi.getProfile().then(user => ({ success: true, data: user }));
  },

  // Update profile
  updateProfile: async (data: Record<string, any>): Promise<ApiResponse<User>> => {
    return authApi.updateProfile(data).then(user => ({ success: true, data: user }));
  },

  // Change password
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<ApiResponse<void>> => {
    return authApi.changePassword(data).then(() => ({ success: true }));
  },
};

// Health check
export const healthApi = {
  check: async (): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get('/health');
  },
};

// Inventory API
export const inventoryApi = {
  // Get all inventory items (with filtering and pagination)
  getItems: async (params?: {
    per_page?: number;
    category?: string;
    search?: string;
    in_stock_only?: boolean;
    active_only?: boolean;
  }): Promise<ApiResponse<Array<Record<string, any>>>> => {
    return apiClient.get('/inventory', params);
  },

  // Get single inventory item
  getItem: async (id: string | number): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.get(`/inventory/${id}`);
  },

  // Create inventory item (Manager/Admin only)
  createItem: async (data: {
    name: string;
    description?: string;
    category: string;
    quantity: number;
    unit: string;
    unit_cost?: number;
    location?: string;
    condition?: 'good' | 'fair' | 'needs_maintenance';
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    notes?: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post('/inventory', data);
  },

  // Update inventory item (Manager/Admin only)
  updateItem: async (id: string | number, data: {
    name?: string;
    description?: string;
    category?: string;
    unit?: string;
    unit_cost?: number;
    location?: string;
    condition?: 'good' | 'fair' | 'needs_maintenance';
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    is_active?: boolean;
    notes?: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.put(`/inventory/${id}`, data);
  },

  // Adjust inventory quantity (Manager/Admin only)
  adjustQuantity: async (id: string | number, data: {
    quantity: number;
    type: 'add' | 'remove' | 'set';
    notes?: string;
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/inventory/${id}/adjust`, data);
  },

  // Get inventory transactions
  getTransactions: async (id: string | number, params?: {
    per_page?: number;
  }): Promise<ApiResponse<Array<Record<string, any>>>> => {
    return apiClient.get(`/inventory/${id}/transactions`, params);
  },

  // Get available categories
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    return apiClient.get('/inventory/categories');
  },

  // Delete inventory item (Admin only)
  deleteItem: async (id: string | number): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/inventory/${id}`);
  },

  // Get inventory items for a request
  getRequestInventory: async (requestId: string | number): Promise<ApiResponse<Array<Record<string, any>>>> => {
    return apiClient.get(`/requests/${requestId}/inventory`);
  },

  // Attach inventory items to a request (DRAFT project only)
  attachToRequest: async (requestId: string | number, data: {
    inventory_items: Array<{
      inventory_item_id: number;
      quantity_requested: number;
      expected_return_date?: string;
    }>;
  }): Promise<ApiResponse<Record<string, any>>> => {
    return apiClient.post(`/requests/${requestId}/inventory`, data);
  },
};

// Notifications API
export const notificationsApi = {
  // Get all notifications for current user
  getNotifications: async (params?: {
    per_page?: number;
    unread_only?: boolean;
  }): Promise<ApiResponse<Array<{
    id: string | number;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    related_request_id?: string | number;
  }>>> => {
    return apiClient.get('/notifications', params);
  },

  // Mark notification as read
  markAsRead: async (id: string | number): Promise<ApiResponse<void>> => {
    return apiClient.put(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.put('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (id: string | number): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/notifications/${id}`);
  },

  // Get unread count
  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiClient.get('/notifications/unread-count');
  },
};

// Export default api object for backward compatibility
const api = {
  auth: authApi,
  requests: requestsApi,
  dashboard: dashboardApi,
  approvals: approvalsApi,
  admin: adminApi,
  directory: directoryApi,
  profile: profileApi,
  managerReports: managerReportsApi,
  inventory: inventoryApi,
  health: healthApi,
};

export default api;
