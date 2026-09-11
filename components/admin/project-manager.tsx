"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";
import { CreateProjectDialog } from "@/components/time/create-project-dialog";
import { Add01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { apiRequest } from "@/lib/http/client";
import { formatHoursMinutes } from "@/lib/format";

export type AdminProjectItem = {
  id: string;
  kind: "cost-center" | "manual";
  name: string;
  code: string | null;
  color: string | null;
  availableToAll: boolean;
  billableByDefault: boolean;
  active: boolean;
  monthSeconds: number;
};

export function AdminProjectManager({
  projects,
}: {
  projects: AdminProjectItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<AdminProjectItem | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminProjectItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    color: "#10b981",
    availableToAll: true,
    billableByDefault: false,
    active: true,
  });

  function openEditor(project: AdminProjectItem) {
    setEditing(project);
    setForm({
      name: project.name,
      code: project.code ?? "",
      color: project.color ?? "#10b981",
      availableToAll: project.availableToAll,
      billableByDefault: project.billableByDefault,
      active: project.active,
    });
  }

  function save() {
    if (!editing) return;
    const isCostCenter = editing.kind === "cost-center";
    const id = editing.id.replace(/^(manual:|cost-center:)/, "");
    startTransition(async () => {
      try {
        if (isCostCenter) {
          await apiRequest(`/api/v1/gestec-help-desk/cost-centers/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              code: form.code.trim(),
              name: form.name.trim(),
              active: form.active,
            }),
          });
        } else {
          await apiRequest(`/api/v1/gestec-help-desk/projects/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: form.name.trim(),
              color: form.color,
              availableToAll: form.availableToAll,
              billableByDefault: form.billableByDefault,
              active: form.active,
            }),
          });
        }
        toast.success("Projeto atualizado.");
        setEditing(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  function deleteTarget() {
    if (!deleting) return;
    const isCostCenter = deleting.kind === "cost-center";
    const id = deleting.id.replace(/^(manual:|cost-center:)/, "");
    startTransition(async () => {
      try {
        await apiRequest(
          isCostCenter
            ? `/api/v1/gestec-help-desk/cost-centers/${id}`
            : `/api/v1/gestec-help-desk/projects/${id}`,
          { method: "DELETE" },
        );
        toast.success(
          isCostCenter ? "Centro de custo excluído." : "Projeto excluído.",
        );
        setDeleting(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível excluir.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Projetos do programa Semear. Clientes são administrados em seu
            próprio cadastro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setCreateProjectOpen(true)}>
            <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
            Criar projeto
          </Button>
        </div>
      </div>
      {projects.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhum projeto cadastrado</EmptyTitle>
            <EmptyDescription>
              Crie um projeto Semear para começar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Horas no mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {project.color ? (
                        <span
                          className="size-3 rounded-full border"
                          style={{ backgroundColor: project.color }}
                        />
                      ) : null}
                      {project.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.kind === "cost-center"
                      ? "Centro de custo"
                      : "Manual"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {project.code ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatHoursMinutes(project.monthSeconds)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={project.active ? "secondary" : "outline"}>
                      {project.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditor(project)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(project)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Editar projeto</SheetTitle>
            <SheetDescription>
              {editing?.kind === "cost-center"
                ? "Altere código, nome e status deste centro de custo."
                : "Altere o cadastro completo do projeto manual, inclusive visibilidade e faturabilidade padrão."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="admin-project-name">Nome</FieldLabel>
                <Input
                  id="admin-project-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              {editing?.kind === "cost-center" ? (
                <Field>
                  <FieldLabel htmlFor="admin-project-code">Código</FieldLabel>
                  <Input
                    id="admin-project-code"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                  />
                </Field>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="admin-project-color">
                      Cor de identificação
                    </FieldLabel>
                    <Input
                      id="admin-project-color"
                      type="color"
                      value={form.color}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          color: event.target.value,
                        }))
                      }
                      className="w-20 p-1"
                    />
                  </Field>
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={form.availableToAll}
                      onCheckedChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          availableToAll: Boolean(value),
                        }))
                      }
                    />
                    <span>
                      <span className="block text-sm font-medium">
                        Disponível para todos
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Se desmarcado, só gestores lançam neste projeto.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <Checkbox
                      checked={form.billableByDefault}
                      onCheckedChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          billableByDefault: Boolean(value),
                        }))
                      }
                    />
                    <span className="text-sm font-medium">
                      Faturável por padrão
                    </span>
                  </label>
                </>
              )}
              <Field>
                <FieldLabel>Ativo</FieldLabel>
                <Switch
                  checked={form.active}
                  onCheckedChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      active: Boolean(value),
                    }))
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={pending || form.name.trim().length < 2}
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        showTrigger={false}
        successMessage="Projeto criado."
        onCreated={() => router.refresh()}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title={
          deleting?.kind === "cost-center"
            ? "Excluir centro de custo"
            : "Excluir projeto"
        }
        description={
          deleting
            ? `Excluir “${deleting.name}”? Só é possível se não houver tickets, apontamentos ou timer ativo. Com histórico, inative para preservar os registros.`
            : ""
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={deleteTarget}
      />
    </div>
  );
}
