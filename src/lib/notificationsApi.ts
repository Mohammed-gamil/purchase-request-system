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
  async list(params?: { page?: number; per_page?: number }){
    // Backend returns { success: true, data: [...], meta: { pagination: { total, page, per_page, totalPages } } }
    const res = await apiClient.get<any>("/notifications", params);
    const items: NotificationItem[] = res.data ?? [];
    const pagination = res.meta?.pagination ? {
      total: res.meta.pagination.total ?? 0,
      page: res.meta.pagination.page ?? res.meta.pagination.current_page ?? 1,
      per_page: res.meta.pagination.per_page ?? res.meta.pagination.perPage ?? 20,
    } : { total: 0, page: 1, per_page: 20 };

    return { items, pagination };
  },

  async unreadCount(): Promise<number> {
    // Backend returns { success: true, data: { count: N } }
    const res = await apiClient.get<any>("/notifications/unread-count");
    return res.data?.count ?? res.data?.unread ?? 0;
  },

  async markAsRead(id: string) {
    // API route expects PUT {id}/read
    await apiClient.put(`/notifications/${id}/read`, {});
  },

  async markAllAsRead() {
    // API route expects PUT read-all
    await apiClient.put(`/notifications/read-all`, {});
  },

  async delete(id: string) {
    await apiClient.delete(`/notifications/${id}`);
  },
};
