"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Add01Icon } from "@/lib/icons";
import { apiRequest } from "@/lib/http/client";
import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";

type CostCenter = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function CostCenterManager({
  initialItems,
}: {
  initialItems: CostCenter[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<CostCenter | null>(null);

  function close() {
    setOpen(false);
    setEditing(null);
    setCode("");
    setName("");
  }

  function startCreate() {
    close();
    setOpen(true);
  }

  function startEdit(item: CostCenter) {
    setEditing(item);
    setCode(item.code);
    setName(item.name);
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      try {
        await apiRequest(
          editing
            ? `/api/v1/gestec-help-desk/cost-centers/${editing.id}`
            : "/api/v1/gestec-help-desk/cost-centers",
          {
            method: editing ? "PATCH" : "POST",
            body: JSON.stringify(
              editing ? { code, name } : { code, name, active: true },
            ),
          },
        );
        toast.success(
          editing
            ? "Centro de custo atualizado."
            : "Centro de custo criado e disponibilizado na jornada.",
        );
        close();
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/cost-centers/${deleting.id}`,
          { method: "DELETE" },
        );
        toast.success("Centro de custo excluído.");
        setDeleting(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível excluir.",
        );
      }
    });
  }

  function toggle(item: CostCenter) {
    startTransition(async () => {
      try {
        await apiRequest(`/api/v1/gestec-help-desk/cost-centers/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !item.active }),
        });
        toast.success(
          item.active
            ? "Centro de custo inativado."
            : "Centro de custo ativado.",
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre os clientes e seus centros de custo. Projetos Semear são
            administrados separadamente.
          </p>
        </div>
        <Button onClick={startCreate}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} /> Novo
          cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>
            Inativar impede novos vínculos, mas preserva o histórico existente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialItems.length ? (
                  initialItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "secondary" : "outline"}>
                          {item.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleting(item)}
                          >
                            Excluir
                          </Button>
                          <Switch
                            checked={item.active}
                            disabled={pending}
                            onCheckedChange={() => toggle(item)}
                            aria-label={`${item.active ? "Inativar" : "Ativar"} ${item.name}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Nenhum cliente cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar cliente" : "Criar cliente"}
            </DialogTitle>
            <DialogDescription>
              O identificador interno permanece estável e o código não pode
              duplicar outro cadastro.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cc-code">Código</FieldLabel>
              <Input
                id="cc-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Ex.: 65"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cc-name">Nome</FieldLabel>
              <Input
                id="cc-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Tecnologia da Informação"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={pending} />}
            >
              Cancelar
            </DialogClose>
            <Button
              disabled={pending || !code.trim() || name.trim().length < 2}
              onClick={save}
            >
              {pending
                ? "Salvando…"
                : editing
                  ? "Salvar alterações"
                  : "Criar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir centro de custo"
        description={
          deleting
            ? `Excluir “${deleting.name}”? Só é possível se não houver tickets, apontamentos ou timer ativo. Com histórico, inative para preservar os registros.`
            : ""
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={remove}
      />
    </div>
  );
}
