"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const priorityLabel = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
} as const;

export function NotificationCenter({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const [items, setItems] = useState(initialNotifications);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter(
      (item) =>
        (!unreadOnly || !item.readAt) &&
        (!normalized ||
          `${item.title} ${item.description} ${item.source}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized)),
    );
  }, [items, query, unreadOnly]);
  const unreadCount = items.filter((item) => !item.readAt).length;

  function markRead(id: string) {
    startTransition(async () => {
      try {
        await apiRequest(`/api/v1/gestec-help-desk/notifications/${id}`, {
          method: "PATCH",
        });
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a notificação.",
        );
      }
    });
  }

  function markAllRead() {
    startTransition(async () => {
      try {
        await apiRequest("/api/v1/gestec-help-desk/notifications/read-all", {
          method: "POST",
        });
        setItems((current) =>
          current.map((item) => ({
            ...item,
            readAt: item.readAt ?? new Date().toISOString(),
          })),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar as notificações.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minha Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Notificações e avisos direcionados a você.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!unreadCount || pending}
          onClick={markAllRead}
        >
          Marcar todas como lidas
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar notificações"
          className="max-w-md"
        />
        <Button
          size="sm"
          variant={unreadOnly ? "default" : "outline"}
          onClick={() => setUnreadOnly((value) => !value)}
        >
          Não lidas{" "}
          <Badge variant="secondary" className="ml-2">
            {unreadCount}
          </Badge>
        </Button>
      </div>
      {visibleItems.length ? (
        <div className="divide-y rounded-xl border">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-4 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2
                    className={`min-w-0 flex-1 truncate font-medium ${item.readAt ? "text-muted-foreground" : ""}`}
                    title={item.title}
                  >
                    {item.title}
                  </h2>
                  <Badge
                    variant={
                      item.priority === "URGENT" || item.priority === "HIGH"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {priorityLabel[item.priority]}
                  </Badge>
                  {!item.readAt ? <Badge>Nova</Badge> : null}
                </div>
                <p
                  className="mt-1 truncate text-sm text-muted-foreground"
                  title={item.description}
                >
                  {item.description}
                </p>
                <p
                  className="mt-2 truncate text-xs text-muted-foreground"
                  title={`${item.source} · ${formatDateTime(item.createdAt)}`}
                >
                  {item.source} · {formatDateTime(item.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.href ? (
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={item.href} />}
                  >
                    Abrir
                  </Button>
                ) : null}
                {!item.readAt ? (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => markRead(item.id)}
                  >
                    Marcar como lida
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhuma notificação</EmptyTitle>
            <EmptyDescription>
              {unreadOnly
                ? "Você não possui notificações não lidas."
                : "Quando houver algo relevante para você, aparecerá aqui."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
