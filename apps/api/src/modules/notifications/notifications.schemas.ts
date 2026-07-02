import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  status: z.enum(["all", "unread"]).default("all")
});

export const notificationParamsSchema = z.object({
  id: z.string().uuid()
});

export type NotificationListFilters = z.infer<typeof listNotificationsQuerySchema>;
