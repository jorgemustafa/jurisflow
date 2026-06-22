import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
  type NotificationStatus
} from "src/services/notifications.js";
import { formatDate } from "src/utils/format.js";

const tabs: { value: NotificationStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "Não lidas" }
];

export const NotificationsPage = () => {
  const [status, setStatus] = useState<NotificationStatus>("all");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications", status],
    queryFn: () => listNotifications(status)
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
    ]);
  };

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate
  });

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate
  });

  const openNotification = (item: Notification) => {
    if (!item.readAt) readMutation.mutate(item.id);
    navigate(`/cases/${item.caseId}`);
  };

  return (
    <>
      <header className="page-header row-header">
        <div>
          <span>Notificações</span>
          <h1>Atualizações de processos</h1>
          <p>Cada notificação corresponde a um processo com novos andamentos no DataJud. Clique para abrir o processo.</p>
        </div>
        <button
          className="button"
          type="button"
          disabled={readAllMutation.isPending}
          onClick={() => readAllMutation.mutate()}
        >
          <CheckCheck size={18} />
          Marcar todas como lidas
        </button>
      </header>

      <div className="chip-row notifications-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`chip ${status === tab.value ? "chip-active" : ""}`}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notifications.isLoading ? <p>Carregando notificações...</p> : null}
      {notifications.isError ? <p className="alert">Não foi possível carregar as notificações.</p> : null}
      {notifications.data?.length === 0 ? (
        <p className="empty">
          <BellRing size={18} /> Nenhuma notificação por aqui.
        </p>
      ) : null}

      {notifications.data?.length ? (
        <div className="notifications-list">
          {notifications.data.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`notification-row ${item.readAt ? "" : "notification-unread"}`}
              onClick={() => openNotification(item)}
            >
              <span className="notification-dot" aria-hidden={item.readAt ? "true" : undefined} />
              <span className="notification-main">
                <strong>{item.title}</strong>
                {item.body ? <small>{item.body}</small> : null}
              </span>
              <time>{formatDate(item.createdAt)}</time>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
};
