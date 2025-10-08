import { apiClient } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number | string;
  data: any;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export const notificationsApi = {
  async list(params?: { page?: number; per_page?: number }): Promise<{ items: NotificationItem[]; pagination: { total: number; page: number; per_page: number } }>{
    const res = await apiClient.get<{ items: NotificationItem[]; pagination: { total: number; page: number; per_page: number } }>(
      "/notifications",
      params
    );
    return res.data!;
  },

  async unreadCount(): Promise<number> {
    const res = await apiClient.get<{ unread: number }>("/notifications/unread-count");
    return res.data!.unread;
  },

  async markAsRead(id: string) {
    await apiClient.post(`/notifications/${id}/read`, {});
  },

  async markAllAsRead() {
    await apiClient.post(`/notifications/mark-all-read`, {});
  },

  async delete(id: string) {
    await apiClient.delete(`/notifications/${id}`);
  },
};
