"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/client-enums";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { userRoleLabels } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  externalId: string;
  role: UserRole;
  active: boolean;
};

const emptyForm: {
  name: string;
  email: string;
  externalId: string;
  role: UserRole;
  active: boolean;
} = {
  name: "",
  email: "",
  externalId: "",
  role: UserRole.TECHNICIAN,
  active: true,
};

export function AdminUserManager({
  initialItems,
  currentUserId,
}: {
  initialItems: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyForm);

  function close() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(item: AdminUser) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email,
      externalId: item.externalId,
      role: item.role,
      active: item.active,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      try {
        await apiRequest(
          editing
            ? `/api/v1/gestec-help-desk/admin/users/${editing.id}`
            : "/api/v1/gestec-help-desk/admin/users",
          {
            method: editing ? "PATCH" : "POST",
            body: JSON.stringify(form),
          },
        );
        toast.success(
          editing ? "Usuário atualizado." : "Usuário criado no Help Desk.",
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

  function toggle(item: AdminUser) {
    startTransition(async () => {
      try {
        await apiRequest(`/api/v1/gestec-help-desk/admin/users/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !item.active }),
        });
        toast.success(item.active ? "Usuário inativado." : "Usuário ativado.");
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
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro local usado em atribuições, apontamentos e auditoria.
          </p>
        </div>
        <Button onClick={startCreate}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} /> Novo
          usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UserRef</CardTitle>
          <CardDescription>
            O seu próprio perfil volta a ser o do Gestec na próxima requisição.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialItems.length ? (
                  initialItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        {item.id === currentUserId ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            você
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.externalId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {userRoleLabels[item.role]}
                        </Badge>
                      </TableCell>
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
                          <Switch
                            checked={item.active}
                            disabled={pending || item.id === currentUserId}
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
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Nenhum usuário sincronizado ainda.
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
              {editing ? "Editar usuário" : "Criar usuário"}
            </DialogTitle>
            <DialogDescription>
              Use o identificador externo do Gestec quando existir. Em
              desenvolvimento, qualquer valor único serve.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-user-name">Nome</FieldLabel>
              <Input
                id="admin-user-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-email">E-mail</FieldLabel>
              <Input
                id="admin-user-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-user-external">
                Identificador externo
              </FieldLabel>
              <Input
                id="admin-user-external"
                value={form.externalId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    externalId: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Perfil</FieldLabel>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    role: (value ?? current.role) as UserRole,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value) => userRoleLabels[String(value)] ?? "Perfil"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((role) => (
                    <SelectItem key={role} value={role}>
                      {userRoleLabels[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Ativo</FieldLabel>
              <Switch
                checked={form.active}
                disabled={editing?.id === currentUserId}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, active: Boolean(value) }))
                }
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
              disabled={
                pending ||
                form.name.trim().length < 2 ||
                !form.email.trim() ||
                !form.externalId.trim()
              }
              onClick={save}
            >
              {pending ? "Salvando…" : editing ? "Salvar" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
