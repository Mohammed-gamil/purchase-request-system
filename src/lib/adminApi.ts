import { apiClient } from './api';
import { ApiResponse, User } from '@/types';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSystemRequests: number;
  pendingSystemApprovals: number;
  totalSystemValue: number;
  usersByRole: Record<string, number>;
  requestsByState: Record<string, number>;
  monthlyRequestTrends: Array<{
    month: string;
    count: number;
    value: number;
  }>;
}

export interface RequestsReport {
  totalRequests: number;
  requestsByType: Record<string, number>;
  requestsByState: Record<string, number>;
  averageProcessingTime: number;
  topCategories: Array<{
    category: string;
    count: number;
    totalValue: number;
  }>;
}

export interface UsersReport {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  usersByDepartment: Record<string, number>;
  recentRegistrations: User[];
  topRequesters: Array<{
    user: User;
    requestCount: number;
    totalValue: number;
  }>;
}

// Admin API for user management and system administration
export const adminApi = {
  // User Management
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

  // Admin Reports
  getAdminOverview: async (): Promise<ApiResponse<AdminStats>> => {
    return apiClient.get('/admin/reports/overview');
  },

  getRequestsReport: async (): Promise<ApiResponse<RequestsReport>> => {
    return apiClient.get('/admin/reports/requests');
  },

  getUsersReport: async (): Promise<ApiResponse<UsersReport>> => {
    return apiClient.get('/admin/reports/users');
  },
};

// Admin service layer with error handling and data transformation
export const adminService = {
  // User management with enhanced error handling
  getUsers: async (filters?: {
    per_page?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<User[]> => {
    try {
      const response = await adminApi.getUsers(filters);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  },

  createUser: async (userData: {
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
  }): Promise<User> => {
    try {
      const response = await adminApi.createUser(userData);
      if (!response.data) {
        throw new Error('Failed to create user');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  updateUser: async (id: string, userData: {
    name?: string;
    role?: string;
    position?: string;
    status?: string;
    [key: string]: any;
  }): Promise<User> => {
    try {
      const response = await adminApi.updateUser(id, userData);
      if (!response.data) {
        throw new Error('Failed to update user');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      await adminApi.deleteUser(id);
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },

  toggleUserStatus: async (id: string): Promise<User> => {
    try {
      const response = await adminApi.toggleUserStatus(id);
      if (!response.data) {
        throw new Error('Failed to toggle user status');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      throw error;
    }
  },

  // Reports with fallback data
  getAdminOverview: async (): Promise<AdminStats> => {
    try {
      const response = await adminApi.getAdminOverview();
      return response.data || {
        totalUsers: 0,
        activeUsers: 0,
        totalSystemRequests: 0,
        pendingSystemApprovals: 0,
        totalSystemValue: 0,
        usersByRole: {},
        requestsByState: {},
        monthlyRequestTrends: []
      };
    } catch (error) {
      console.error('Failed to fetch admin overview:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSystemRequests: 0,
        pendingSystemApprovals: 0,
        totalSystemValue: 0,
        usersByRole: {},
        requestsByState: {},
        monthlyRequestTrends: []
      };
    }
  },

  getRequestsReport: async (): Promise<RequestsReport> => {
    try {
      const response = await adminApi.getRequestsReport();
      return response.data || {
        totalRequests: 0,
        requestsByType: {},
        requestsByState: {},
        averageProcessingTime: 0,
        topCategories: []
      };
    } catch (error) {
      console.error('Failed to fetch requests report:', error);
      return {
        totalRequests: 0,
        requestsByType: {},
        requestsByState: {},
        averageProcessingTime: 0,
        topCategories: []
      };
    }
  },

  getUsersReport: async (): Promise<UsersReport> => {
    try {
      const response = await adminApi.getUsersReport();
      return response.data || {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: {},
        usersByDepartment: {},
        recentRegistrations: [],
        topRequesters: []
      };
    } catch (error) {
      console.error('Failed to fetch users report:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: {},
        usersByDepartment: {},
        recentRegistrations: [],
        topRequesters: []
      };
    }
  },
};

export default adminService;
