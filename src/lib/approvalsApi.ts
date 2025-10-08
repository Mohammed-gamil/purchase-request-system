import { apiClient } from './api';
import { ApiResponse } from '@/types';

export interface ApprovalAction {
  comment?: string;
  payout_channel?: 'WALLET' | 'COMPANY' | 'COURIER';
}

export interface RejectionAction {
  comment: string; // Mandatory for rejections
}

export interface FundsTransferAction {
  payout_reference: string;
}

export interface ApprovalHistoryItem {
  id: string;
  request_id: string;
  stage: string;
  approver_id: string;
  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  decision: 'APPROVED' | 'REJECTED';
  comment?: string;
  payout_channel?: string;
  decided_at: string;
  created_at: string;
}

// Approvals API for workflow management
export const approvalsApi = {
  // Approve request (managers/accountants only)
  approveRequest: async (requestId: string, data: ApprovalAction): Promise<ApiResponse<any>> => {
    return apiClient.post(`/approvals/${requestId}/approve`, data);
  },

  // Reject request with mandatory comment
  rejectRequest: async (requestId: string, data: RejectionAction): Promise<ApiResponse<any>> => {
    return apiClient.post(`/approvals/${requestId}/reject`, data);
  },

  // Transfer funds (admin only)
  transferFunds: async (requestId: string, data: FundsTransferAction): Promise<ApiResponse<any>> => {
    return apiClient.post(`/approvals/${requestId}/transfer-funds`, data);
  },

  // Get complete approval history for a request
  getApprovalHistory: async (requestId: string): Promise<ApiResponse<ApprovalHistoryItem[]>> => {
    return apiClient.get(`/approvals/${requestId}/history`);
  },
};

// Approvals service layer with enhanced functionality
export const approvalsService = {
  // Approve request with validation
  approveRequest: async (requestId: string, options: {
    comment?: string;
    payoutChannel?: 'WALLET' | 'COMPANY' | 'COURIER';
  }): Promise<any> => {
    try {
      const data: ApprovalAction = {};
      
      if (options.comment) {
        data.comment = options.comment;
      }
      
      if (options.payoutChannel) {
        data.payout_channel = options.payoutChannel;
      }

      const response = await approvalsApi.approveRequest(requestId, data);
      return response.data;
    } catch (error) {
      console.error('Failed to approve request:', error);
      throw error;
    }
  },

  // Reject request with mandatory comment
  rejectRequest: async (requestId: string, comment: string): Promise<any> => {
    try {
      if (!comment.trim()) {
        throw new Error('Comment is required for rejection');
      }

      const response = await approvalsApi.rejectRequest(requestId, { comment });
      return response.data;
    } catch (error) {
      console.error('Failed to reject request:', error);
      throw error;
    }
  },

  // Transfer funds (admin only)
  transferFunds: async (requestId: string, payoutReference: string): Promise<any> => {
    try {
      if (!payoutReference.trim()) {
        throw new Error('Payout reference is required');
      }

      const response = await approvalsApi.transferFunds(requestId, { payout_reference: payoutReference });
      return response.data;
    } catch (error) {
      console.error('Failed to transfer funds:', error);
      throw error;
    }
  },

  // Get approval history with error handling
  getApprovalHistory: async (requestId: string): Promise<ApprovalHistoryItem[]> => {
    try {
      const response = await approvalsApi.getApprovalHistory(requestId);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
      return [];
    }
  },

  // Helper method to check if user can approve based on request state and user role
  canApprove: (requestState: string, userRole: string): boolean => {
    switch (requestState) {
      case 'SUBMITTED':
        return userRole === 'DIRECT_MANAGER';
      case 'DM_APPROVED':
        return userRole === 'ACCOUNTANT';
      case 'ACCT_APPROVED':
        return userRole === 'FINAL_MANAGER';
      default:
        return false;
    }
  },

  // Helper method to check if user can transfer funds
  canTransferFunds: (requestState: string, userRole: string): boolean => {
    return requestState === 'FINAL_APPROVED' && userRole === 'ADMIN';
  },

  // Get next approval stage
  getNextApprovalStage: (currentState: string): string | null => {
    switch (currentState) {
      case 'SUBMITTED':
        return 'Direct Manager Approval';
      case 'DM_APPROVED':
        return 'Accountant Approval';
      case 'ACCT_APPROVED':
        return 'Final Manager Approval';
      case 'FINAL_APPROVED':
        return 'Funds Transfer';
      default:
        return null;
    }
  },

  // Get approval stage display name
  getStageDisplayName: (stage: string): string => {
    switch (stage) {
      case 'DM':
        return 'Direct Manager';
      case 'ACCT':
        return 'Accountant';
      case 'FINAL':
        return 'Final Manager';
      default:
        return stage;
    }
  },
};

export default approvalsService;
