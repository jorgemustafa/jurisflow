import { request } from "src/services/http.js";

export type Notification = {
  id: string;
  caseId: string;
  caseTitle: string | null;
  title: string;
  body: string | null;
  newMovements: number;
  readAt: string | null;
  createdAt: string;
};

export type NotificationStatus = "all" | "unread";

export const listNotifications = (status: NotificationStatus) => {
  return request<Notification[]>(`/notifications${status === "unread" ? "?status=unread" : ""}`);
};

export const getUnreadNotificationsCount = () => {
  return request<{ count: number }>("/notifications/unread-count");
};

export const markNotificationRead = (id: string) => {
  return request<Notification>(`/notifications/${id}/read`, { method: "PATCH" });
};

export const markAllNotificationsRead = () => {
  return request<{ updated: number }>("/notifications/read-all", { method: "POST" });
};
