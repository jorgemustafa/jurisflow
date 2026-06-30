import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  getUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification
} from "src/services/notifications.js";
import { formatDate } from "src/utils/format.js";
import { LoadingState } from "src/components/ui/LoadingState.js";

export const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: getUnreadNotificationsCount,
    refetchInterval: 60_000
  });
  const unreadCount = unread.data?.count ?? 0;

  const notifications = useQuery({
    queryKey: ["notifications", "panel"],
    queryFn: () => listNotifications("all"),
    enabled: open
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] })
    ]);
  };

  const readMutation = useMutation({ mutationFn: (id: string) => markNotificationRead(id), onSuccess: invalidate });
  const readAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openNotification = (item: Notification) => {
    if (!item.readAt) readMutation.mutate(item.id);
    setOpen(false);
    navigate(`/cases/${item.caseId}`);
  };

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button
        type="button"
        className="notifications-bell-button"
        aria-label={unreadCount > 0 ? `Notificações, ${unreadCount} não lidas` : "Notificações"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unreadCount > 0 ? <span className="notifications-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notifications-popover" role="dialog" aria-label="Notificações">
          <header className="notifications-popover-header">
            <strong>Notificações</strong>
            <button
              type="button"
              className="notifications-popover-action"
              disabled={readAllMutation.isPending || unreadCount === 0}
              onClick={() => readAllMutation.mutate()}
            >
              <CheckCheck size={16} />
              Marcar todas
            </button>
          </header>

          <div className="notifications-popover-body">
            {notifications.isLoading ? <LoadingState label="Carregando notificações" variant="list" items={2} /> : null}
            {notifications.isError ? <p className="notifications-popover-empty">Não foi possível carregar as notificações.</p> : null}
            {notifications.data?.length === 0 ? <p className="notifications-popover-empty">Nenhuma notificação por aqui.</p> : null}
            {notifications.data?.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`notifications-popover-row ${item.readAt ? "" : "is-unread"}`}
                onClick={() => openNotification(item)}
              >
                <span className="notifications-popover-dot" data-read={item.readAt ? "true" : "false"} />
                <span className="notifications-popover-main">
                  <strong>{item.title}</strong>
                  {item.body ? <small>{item.body}</small> : null}
                  <time>{formatDate(item.createdAt)}</time>
                </span>
              </button>
            ))}
          </div>

          <Link className="notifications-popover-footer" to="/notifications" onClick={() => setOpen(false)}>
            Ver todas as notificações
          </Link>
        </div>
      ) : null}
    </div>
  );
};
