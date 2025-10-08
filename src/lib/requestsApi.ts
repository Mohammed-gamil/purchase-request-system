import { requestsApi, dashboardApi } from './api';
import { Request, DashboardStats, CreateRequestForm, ApiResponse } from '@/types';

// Request service layer
export const requestService = {
  // Get all requests with filtering
  getRequests: async (filters?: {
    per_page?: number;
    type?: 'purchase' | 'project';
    state?: string;
    search?: string;
  }): Promise<Request[]> => {
    try {
      const response = await requestsApi.getRequests(filters);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      throw error;
    }
  },

  // Get user's own requests
  getUserRequests: async (userId: string): Promise<Request[]> => {
    try {
      const response = await requestsApi.getUserRequests(userId);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch user requests:', error);
      throw error;
    }
  },

  // Get single request
  getRequest: async (id: string): Promise<Request> => {
    try {
      const response = await requestsApi.getRequest(id);
      if (!response.data) {
        throw new Error('Request not found');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch request:', error);
      throw error;
    }
  },

  // Create new request
  createRequest: async (data: CreateRequestForm): Promise<Request> => {
    try {
      // Transform frontend data to match Laravel backend format
      const requestData = {
        type: data.type,
        title: data.title,
        description: data.description,
        category: data.category,
        desired_cost: data.desiredCost,
        currency: data.currency,
        needed_by_date: data.neededByDate instanceof Date 
          ? data.neededByDate.toISOString().split('T')[0] 
          : data.neededByDate,
        submit_immediately: true, // Auto-submit by default
        
        // Add items for purchase requests
        ...(data.type === 'purchase' && {
          items: data.items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            vendor_hint: item.vendorHint
          }))
        }),

        // Add project-specific fields
        ...(data.type === 'project' && {
          client_name: (data as any).clientName,
          project_description: (data as any).projectDescription,
          total_cost: (data as any).totalCost,
          total_benefit: (data as any).totalBenefit,
          total_price: (data as any).totalPrice,
          items: data.items?.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            vendor_hint: item.vendorHint
          }))
        })
      };

      const response = await requestsApi.createRequest(requestData);
      if (!response.data) {
        throw new Error('Failed to create request');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to create request:', error);
      throw error;
    }
  },

  // Update request
  updateRequest: async (id: string, data: Partial<CreateRequestForm>): Promise<Request> => {
    try {
      // Transform camelCase to snake_case fields for backend
      const updateData: any = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.desiredCost !== undefined && { desired_cost: data.desiredCost }),
        ...(data.neededByDate !== undefined && {
          needed_by_date: data.neededByDate instanceof Date
            ? data.neededByDate.toISOString().split('T')[0]
            : (data.neededByDate as any),
        }),
      };

      if (data.type === 'project') {
        updateData.client_name = (data as any).clientName;
        updateData.project_description = (data as any).projectDescription;
        updateData.total_cost = (data as any).totalCost;
        updateData.total_benefit = (data as any).totalBenefit;
        updateData.total_price = (data as any).totalPrice;
      }

      if (data.items) {
        updateData.items = data.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice ?? item.unit_price,
          vendor_hint: item.vendorHint ?? item.vendor_hint,
        }));
      }

      const response = await requestsApi.updateRequest(id, updateData);
      if (!response.data) {
        throw new Error('Failed to update request');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to update request:', error);
      throw error;
    }
  },

  // Submit request for approval
  submitRequest: async (id: string): Promise<Request> => {
    try {
      const response = await requestsApi.submitRequest(id);
      if (!response.data) {
        throw new Error('Failed to submit request');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to submit request:', error);
      throw error;
    }
  },

  // Delete request
  deleteRequest: async (id: string): Promise<void> => {
    try {
      await requestsApi.deleteRequest(id);
    } catch (error) {
      console.error('Failed to delete request:', error);
      throw error;
    }
  },

  // Get pending approvals (for managers/approvers)
  getPendingApprovals: async (perPage?: number): Promise<Request[]> => {
    try {
      const response = await requestsApi.getPendingApprovals({ per_page: perPage });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      throw error;
    }
  },
};

// Dashboard service
export const dashboardService = {
  // Get dashboard statistics
  getStats: async (): Promise<DashboardStats> => {
    try {
      const response = await dashboardApi.getStats();
      return response.data || {};
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return empty stats on error
      return {};
    }
  },

  // Get recent activity
  getRecentActivity: async (): Promise<any[]> => {
    try {
      const response = await dashboardApi.getRecentActivity();
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  },
};
