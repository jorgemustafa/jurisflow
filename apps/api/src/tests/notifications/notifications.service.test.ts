import { describe, expect, it } from "vitest";
import {
  createNotificationsService,
  NotificationNotFoundError,
  type NotificationRecord
} from "../../modules/notifications/notifications.service.js";

const record = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
  id: "notification-1",
  caseId: "case-1",
  caseTitle: "Ação trabalhista",
  title: "Atualização em Ação trabalhista",
  body: "2 novos andamentos encontrados no DataJud.",
  newMovements: 2,
  readAt: null,
  createdAt: new Date("2026-06-20T12:00:00.000Z"),
  ...overrides
});

function createFakeRepository(options: { found?: boolean } = {}) {
  return {
    listCalls: [] as { userId: string; status: string }[],
    async list(userId: string, filters: { status: "all" | "unread" }) {
      this.listCalls.push({ userId, status: filters.status });
      return [record()];
    },
    async unreadCount() {
      return 3;
    },
    async markRead(_id: string, _userId: string) {
      return options.found === false ? null : record({ readAt: new Date() });
    },
    async markAllRead() {
      return 5;
    }
  };
}

describe("notifications service", () => {
  it("lists notifications scoped to the user", async () => {
    const repository = createFakeRepository();
    const service = createNotificationsService(repository);

    const items = await service.list("user-1", { status: "unread" });

    expect(items).toHaveLength(1);
    expect(repository.listCalls).toEqual([{ userId: "user-1", status: "unread" }]);
  });

  it("returns the unread count", async () => {
    const service = createNotificationsService(createFakeRepository());
    expect(await service.unreadCount("user-1")).toEqual({ count: 3 });
  });

  it("marks a notification as read", async () => {
    const service = createNotificationsService(createFakeRepository());
    const item = await service.markRead("notification-1", "user-1");
    expect(item.readAt).not.toBeNull();
  });

  it("throws when the notification is not owned by the user", async () => {
    const service = createNotificationsService(createFakeRepository({ found: false }));
    await expect(service.markRead("notification-1", "user-2")).rejects.toBeInstanceOf(NotificationNotFoundError);
  });

  it("marks all notifications as read", async () => {
    const service = createNotificationsService(createFakeRepository());
    expect(await service.markAllRead("user-1")).toEqual({ updated: 5 });
  });
});
