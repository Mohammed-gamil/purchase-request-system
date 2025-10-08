import { apiClient } from './api';
import { ApiResponse } from '@/types';

// Types for profile operations
export interface ProfileUpdateData {
  name: string;
  phone?: string;
  position?: string;
  bio?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  request_updates: boolean;
  approval_reminders: boolean;
  system_updates: boolean;
}

export interface AvatarUploadResponse {
  avatar_url: string;
  message: string;
}

// Profile API methods - Updated to match Laravel backend endpoints
export const profileApi = {
  // Get user profile (uses auth/profile endpoint)
  getProfile: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/auth/profile');
  },

  // Update user profile (uses auth/profile endpoint)
  updateProfile: async (data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: string;
    language_preference?: string;
    timezone?: string;
    currency?: string;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.put('/auth/profile', data);
  },

  // Change password (uses auth/change-password endpoint)
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string; // Note: Laravel uses confirmation field
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/auth/change-password', data);
  },

  // Upload avatar (keeping original endpoint for now)
  uploadAvatar: async (file: File): Promise<ApiResponse<AvatarUploadResponse>> => {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiClient.upload('/user/avatar', formData);
  },

  // Get notification preferences
  getNotificationPreferences: async (): Promise<ApiResponse<{ preferences: NotificationPreferences }>> => {
    return apiClient.get('/user/notification-preferences');
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.put('/user/notification-preferences', { preferences });
  },

  // Update user preferences (language, timezone, etc.) - integrated into profile update
  updatePreferences: async (preferences: {
    language_preference?: string;
    timezone?: string;
    date_format?: string;
    currency?: string;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.put('/auth/profile', preferences);
  }
};