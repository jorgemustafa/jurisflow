import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma.js";
import type { NotificationListFilters } from "./notifications.schemas.js";
import type { NotificationRecord } from "./notifications.service.js";

type DbNotification = {
  id: string;
  caseId: string;
  title: string;
  body: string | null;
  newMovements: number;
  readAt: Date | null;
  createdAt: Date;
  case?: { title: string } | null;
};

const includeCase = { case: { select: { title: true } } } satisfies Prisma.NotificationInclude;

function toRecord(item: DbNotification): NotificationRecord {
  return {
    id: item.id,
    caseId: item.caseId,
    caseTitle: item.case?.title ?? null,
    title: item.title,
    body: item.body,
    newMovements: item.newMovements,
    readAt: item.readAt,
    createdAt: item.createdAt
  };
}

export const notificationsRepository = {
  async list(userId: string, filters: NotificationListFilters): Promise<NotificationRecord[]> {
    const items = await prisma.notification.findMany({
      where: { userId, ...(filters.status === "unread" ? { readAt: null } : {}) },
      include: includeCase,
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return items.map((item) => toRecord(item as DbNotification));
  },

  unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  async markRead(id: string, userId: string): Promise<NotificationRecord | null> {
    const result = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    const item = await prisma.notification.findFirst({ where: { id, userId }, include: includeCase });
    if (!item) return null;
    // updateMany count is 0 when the notification was already read; the record still belongs to the user.
    void result;
    return toRecord(item as DbNotification);
  },

  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return result.count;
  }
};
