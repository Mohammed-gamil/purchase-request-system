import { apiClient } from './api';
import { ApiResponse, DashboardStats } from '@/types';

export interface ActivityLog {
  id: string;
  user_id: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  action: string;
  entity_type: string;
  entity_id: string;
  meta?: any;
  ip?: string;
  user_agent?: string;
  created_at: string;
}

export interface ExtendedDashboardStats extends DashboardStats {
  // Additional fields from API
  recentActivity?: ActivityLog[];
  monthlyTrends?: Array<{
    month: string;
    requests: number;
    approvals: number;
    value: number;
  }>;
  topCategories?: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  approvalMetrics?: {
    averageApprovalTime: number;
    approvalRate: number;
    rejectionRate: number;
  };
}

// Dashboard API for statistics and activity
export const dashboardApi = {
  // Get dashboard statistics based on user role
  getStats: async (): Promise<ApiResponse<ExtendedDashboardStats>> => {
    return apiClient.get('/dashboard/stats');
  },

  // Get recent activity logs
  getRecentActivity: async (params?: { limit?: number }): Promise<ApiResponse<ActivityLog[]>> => {
    return apiClient.get('/dashboard/recent-activity', params);
  },
};

// Dashboard service layer with role-based data transformation
export const dashboardService = {
  // Get dashboard statistics with fallback
  getStats: async (): Promise<ExtendedDashboardStats> => {
    try {
      const response = await dashboardApi.getStats();
      return response.data || {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalSpent: 0,
        pendingApprovals: 0,
        totalApprovals: 0,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        averageApprovalTime: 0,
        budgetUtilization: 0,
        totalProjects: 0,
        totalProjectValue: 0,
        totalProjectBenefit: 0,
        projectsCompletionRate: 0,
        recentActivity: [],
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Return default stats structure
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalSpent: 0,
        pendingApprovals: 0,
        totalApprovals: 0,
        approvedThisMonth: 0,
        rejectedThisMonth: 0,
        averageApprovalTime: 0,
        budgetUtilization: 0,
        totalProjects: 0,
        totalProjectValue: 0,
        totalProjectBenefit: 0,
        projectsCompletionRate: 0,
        recentActivity: [],
      };
    }
  },

  // Get recent activity with error handling
  getRecentActivity: async (limit: number = 10): Promise<ActivityLog[]> => {
    try {
      const response = await dashboardApi.getRecentActivity({ limit });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      return [];
    }
  },

  // Get role-specific dashboard data
  getRoleDashboardData: async (userRole: string): Promise<{
    stats: ExtendedDashboardStats;
    activity: ActivityLog[];
  }> => {
    try {
      const [stats, activity] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getRecentActivity(10)
      ]);

      return { stats, activity };
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      return {
        stats: await dashboardService.getStats(),
        activity: []
      };
    }
  },

  // Format currency for display
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },

  // Calculate percentage change
  calculatePercentageChange: (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Get trend indicator
  getTrendIndicator: (change: number): 'up' | 'down' | 'neutral' => {
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'neutral';
  },

  // Get budget status
  getBudgetStatus: (utilization: number): 'healthy' | 'warning' | 'critical' => {
    if (utilization < 70) return 'healthy';
    if (utilization < 90) return 'warning';
    return 'critical';
  },

  // Format activity action for display
  formatActivityAction: (action: string): string => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  },

  // Get activity icon based on action
  getActivityIcon: (action: string): string => {
    const actionMap: Record<string, string> = {
      'created': '➕',
      'updated': '✏️',
      'submitted': '📤',
      'approved': '✅',
      'rejected': '❌',
      'transferred': '💰',
      'deleted': '🗑️',
    };

    const key = action.toLowerCase().split('_')[0];
    return actionMap[key] || '📄';
  },
};

export default dashboardService;
