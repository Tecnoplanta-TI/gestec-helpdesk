"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";
import { CreateProjectDialog } from "@/components/time/create-project-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { formatCurrencyFromCents, formatHoursMinutes } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";
import { Add01Icon, SearchIcon } from "@/lib/icons";

export type ProjectListItem = {
  id: string;
  kind: "manual";
  name: string;
  code: string | null;
  color: string | null;
  availableToAll: boolean;
  active: boolean;
  billableByDefault: boolean;
  hourlyRateCents: number | null;
  hourlyRateEffectiveFrom: string | Date | null;
  monthSeconds: number;
};

export function ProjectList({
  projects,
  canManage,
}: {
  projects: ProjectListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProjectListItem | null>(null);
  const [query, setQuery] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProjectListItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    color: "#10b981",
    availableToAll: true,
    billableByDefault: false,
    active: true,
    hourlyRate: "",
    hourlyRateEffectiveFrom: new Date().toISOString().slice(0, 10),
  });
  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return projects;
    return projects.filter(
      (project) =>
        project.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
        project.code?.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [projects, query]);

  function openEditor(project: ProjectListItem) {
    setEditing(project);
    setForm({
      name: project.name,
      color: project.color ?? "#10b981",
      availableToAll: project.availableToAll,
      billableByDefault: project.billableByDefault,
      active: project.active,
      hourlyRate: "",
      hourlyRateEffectiveFrom: new Date().toISOString().slice(0, 10),
    });
  }

  function saveProject() {
    if (!editing) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/projects/${editing.id.replace("manual:", "")}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ...form,
              ...(form.hourlyRate.trim()
                ? { hourlyRate: Number(form.hourlyRate.replace(",", ".")) }
                : { hourlyRate: undefined, hourlyRateEffectiveFrom: undefined }),
            }),
          },
        );
        toast.success(
          form.active
            ? "Projeto atualizado."
            : "Projeto arquivado e preservado no histórico.",
        );
        setEditing(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o projeto.",
        );
      }
    });
  }

  function deleteTarget() {
    if (!deleting) return;
    const id = deleting.id.replace("manual:", "");
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/projects/${id}`,
          { method: "DELETE" },
        );
        toast.success(
          "Projeto excluído.",
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
            Projetos do programa Semear usados para classificar as horas da
            Jornada. Clientes são administrados separadamente.
          </p>
        </div>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateProjectOpen(true)}>
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
              Criar projeto
            </Button>
          </div>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Nenhum projeto disponível</EmptyTitle>
            <EmptyDescription>
              Crie um projeto Semear para começar.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <HugeiconsIcon
              icon={SearchIcon}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar por nome ou código"
              aria-label="Pesquisar projetos"
              className="pl-9"
            />
          </div>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor-hora</TableHead>
                  <TableHead>Horas no mês</TableHead>
                  <TableHead>Faturável por padrão</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? (
                    <TableHead className="text-right">Ações</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.length ? (
                  visibleProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrencyFromCents(project.hourlyRateCents)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatHoursMinutes(project.monthSeconds)}
                      </TableCell>
                      <TableCell>
                        {project.billableByDefault ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={project.active ? "secondary" : "outline"}
                        >
                          {project.active ? "Ativo" : "Arquivado"}
                        </Badge>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditor(project)}>
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleting(project)}>
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 6 : 5}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Nenhum projeto corresponde à pesquisa.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
              Altere os dados ou arquive o projeto sem apagar o histórico.
              {editing?.hourlyRateCents !== null && editing?.hourlyRateCents !== undefined
                ? ` Valor-hora atual: ${formatCurrencyFromCents(editing.hourlyRateCents)}.`
                : " Nenhum valor-hora foi informado ainda."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="project-edit-name">Nome</FieldLabel>
                <Input
                  id="project-edit-name"
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
                <FieldLabel htmlFor="project-edit-hourly-rate">Novo valor-hora (R$)</FieldLabel>
                <Input
                  id="project-edit-hourly-rate"
                  inputMode="decimal"
                  value={form.hourlyRate}
                  onChange={(event) => setForm((current) => ({ ...current, hourlyRate: event.target.value }))}
                  placeholder="Deixe em branco para manter o valor atual"
                />
              </Field>
              {form.hourlyRate.trim() ? (
                <Field>
                  <FieldLabel htmlFor="project-edit-rate-effective-from">Válido a partir de</FieldLabel>
                  <Input
                    id="project-edit-rate-effective-from"
                    type="date"
                    value={form.hourlyRateEffectiveFrom}
                    onChange={(event) => setForm((current) => ({ ...current, hourlyRateEffectiveFrom: event.target.value }))}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="project-edit-color">
                  Cor de identificação
                </FieldLabel>
                <Input
                  id="project-edit-color"
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
                    Se desmarcado, somente gestores podem registrar horas.
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
              <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span>
                  <span className="block text-sm font-medium">
                    Status ativo
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Projetos arquivados permanecem no histórico.
                  </span>
                </span>
                <Switch
                  checked={form.active}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, active: value }))
                  }
                />
              </label>
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
              onClick={saveProject}
              disabled={pending || form.name.trim().length < 2}
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {canManage ? (
        <CreateProjectDialog
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
          showTrigger={false}
          successMessage="Projeto criado."
          onCreated={() => router.refresh()}
        />
      ) : null}
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title={
          "Excluir projeto"
        }
        description={
          deleting
            ? `Excluir “${deleting.name}”? Só é possível se não houver apontamentos ou timer ativo. Com histórico, inative para preservar os registros.`
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
