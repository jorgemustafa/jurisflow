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
import { LoadingState } from "src/components/ui/LoadingState.js";
import { Tabs } from "src/components/ui/Tabs.js";

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

      <Tabs ariaLabel="Filtros de notificações" tabs={tabs} value={status} onChange={setStatus} />

      {notifications.isLoading ? <LoadingState label="Carregando notificações" variant="list" /> : null}
      {notifications.isError ? <p className="alert">Não foi possível carregar as notificações.</p> : null}
      {notifications.data?.length === 0 ? (
        <p className="empty">
          <BellRing size={18} /> Nenhuma notificação por aqui.
        </p>
      ) : null}

      {notifications.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Status</th><th>Notificação</th><th>Data</th></tr></thead>
            <tbody>
              {notifications.data.map((item) => (
                <tr className={item.readAt ? undefined : "notification-unread"} key={item.id}>
                  <td><span className="notification-dot" aria-hidden={item.readAt ? "true" : undefined} /></td>
                  <td className="table-text-cell">
                    <button className="notification-table-button" type="button" onClick={() => openNotification(item)}>
                      <strong>{item.title}</strong>
                      {item.body ? <small>{item.body}</small> : null}
                    </button>
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
};
