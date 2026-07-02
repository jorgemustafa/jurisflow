import type { NotificationListFilters } from "./notifications.schemas.js";

export type NotificationRecord = {
  id: string;
  caseId: string;
  caseTitle: string | null;
  title: string;
  body: string | null;
  newMovements: number;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationsRepository = {
  list(userId: string, filters: NotificationListFilters): Promise<NotificationRecord[]>;
  unreadCount(userId: string): Promise<number>;
  markRead(id: string, userId: string): Promise<NotificationRecord | null>;
  markAllRead(userId: string): Promise<number>;
};

export class NotificationNotFoundError extends Error {
  constructor() {
    super("Notification not found");
  }
}

export function createNotificationsService(repository: NotificationsRepository) {
  return {
    list(userId: string, filters: NotificationListFilters) {
      return repository.list(userId, filters);
    },

    async unreadCount(userId: string) {
      return { count: await repository.unreadCount(userId) };
    },

    async markRead(id: string, userId: string) {
      const item = await repository.markRead(id, userId);
      if (!item) throw new NotificationNotFoundError();
      return item;
    },

    async markAllRead(userId: string) {
      return { updated: await repository.markAllRead(userId) };
    }
  };
}
