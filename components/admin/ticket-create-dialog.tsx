"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TicketPriority } from "@/lib/client-enums";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { kanbanColumns } from "@/lib/domain/request-types";
import { ticketPriorityLabels } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

type Lookup = { id: string; name: string };

export function AdminTicketCreateDialog({
  open,
  onOpenChange,
  users,
  costCenters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Lookup[];
  costCenters: Array<Lookup & { code: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [priority, setPriority] = useState<TicketPriority>(
    TicketPriority.MEDIUM,
  );
  const [requestType, setRequestType] = useState("solicitacao");
  const [assigneeId, setAssigneeId] = useState("none");
  const [costCenterId, setCostCenterId] = useState("none");

  function reset() {
    setTitle("");
    setDescription("");
    setRequesterName("");
    setPriority(TicketPriority.MEDIUM);
    setRequestType("solicitacao");
    setAssigneeId("none");
    setCostCenterId("none");
  }

  function save() {
    startTransition(async () => {
      try {
        const ticket = await apiRequest<{ id: string }>(
          "/api/v1/gestec-help-desk/admin/tickets",
          {
            method: "POST",
            body: JSON.stringify({
              title,
              description,
              requesterName,
              priority,
              requestType,
              assigneeId: assigneeId === "none" ? null : assigneeId,
              costCenterId: costCenterId === "none" ? null : costCenterId,
            }),
          },
        );
        toast.success("Ticket criado.");
        reset();
        onOpenChange(false);
        router.push(`/gestec_help_desk/admin/tickets/${ticket.id}`);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar o ticket.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo ticket</DialogTitle>
          <DialogDescription>
            Abertura manual no Help Desk. Depois você pode completar os demais
            campos.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-ticket-title">Título</FieldLabel>
            <Input
              id="new-ticket-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ticket-description">Descrição</FieldLabel>
            <Textarea
              id="new-ticket-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-ticket-requester">Solicitante</FieldLabel>
            <Input
              id="new-ticket-requester"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Prioridade</FieldLabel>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority((value ?? priority) as TicketPriority)
              }
            >
              <SelectTrigger>
                <SelectValue>
                  {(value) =>
                    ticketPriorityLabels[String(value)] ?? "Prioridade"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(TicketPriority).map((value) => (
                  <SelectItem key={value} value={value}>
                    {ticketPriorityLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Tipo</FieldLabel>
            <Select
              value={requestType}
              onValueChange={(value) => setRequestType(value ?? requestType)}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value) =>
                    kanbanColumns.find((column) => column.type === value)
                      ?.label ?? "Tipo"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kanbanColumns.map((column) => (
                  <SelectItem key={column.type} value={column.type}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Responsável</FieldLabel>
            <Select
              value={assigneeId}
              onValueChange={(value) => setAssigneeId(value ?? "none")}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value) =>
                    value === "none"
                      ? "Não atribuído"
                      : (users.find((user) => user.id === value)?.name ??
                        "Responsável")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não atribuído</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Centro de custo</FieldLabel>
            <Select
              value={costCenterId}
              onValueChange={(value) => setCostCenterId(value ?? "none")}
            >
              <SelectTrigger>
                <SelectValue>
                  {(value) => {
                    if (value === "none") return "Sem centro de custo";
                    const item = costCenters.find(
                      (center) => center.id === value,
                    );
                    return item
                      ? `${item.code} — ${item.name}`
                      : "Centro de custo";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem centro de custo</SelectItem>
                {costCenters.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancelar
          </DialogClose>
          <Button
            disabled={
              pending ||
              !title.trim() ||
              !description.trim() ||
              !requesterName.trim()
            }
            onClick={save}
          >
            {pending ? "Criando…" : "Criar ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
