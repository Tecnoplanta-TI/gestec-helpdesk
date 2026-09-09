"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AssetStatus } from "@/lib/client-enums";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Add01Icon, SearchIcon } from "@/lib/icons";
import { apiRequest } from "@/lib/http/client";
import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";

const statusLabels: Record<AssetStatus, string> = {
  IN_STOCK: "Em estoque",
  IN_USE: "Em uso",
  MAINTENANCE: "Manutenção",
  RETIRED: "Baixado",
};

type Asset = {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  serialNumber: string | null;
  status: AssetStatus;
  assignedToName: string | null;
  notes: string | null;
};

type AssetForm = {
  assetTag: string;
  name: string;
  category: string;
  serialNumber: string;
  status: AssetStatus;
  assignedToName: string;
  notes: string;
};

const emptyForm: AssetForm = {
  assetTag: "",
  name: "",
  category: "",
  serialNumber: "",
  status: AssetStatus.IN_STOCK,
  assignedToName: "",
  notes: "",
};

export function AssetManager({
  initialItems,
  canManage,
}: {
  initialItems: Asset[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [deleting, setDeleting] = useState<Asset | null>(null);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return initialItems;
    return initialItems.filter((item) =>
      [
        item.assetTag,
        item.name,
        item.category,
        item.serialNumber,
        item.assignedToName,
      ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [initialItems, query]);

  function resetDialog() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(asset: Asset) {
    setEditing(asset);
    setForm({
      assetTag: asset.assetTag,
      name: asset.name,
      category: asset.category,
      serialNumber: asset.serialNumber ?? "",
      status: asset.status,
      assignedToName: asset.assignedToName ?? "",
      notes: asset.notes ?? "",
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      try {
        await apiRequest(
          editing
            ? `/api/v1/gestec-help-desk/assets/${editing.id}`
            : "/api/v1/gestec-help-desk/assets",
          {
            method: editing ? "PATCH" : "POST",
            body: JSON.stringify(form),
          },
        );
        toast.success(editing ? "Ativo atualizado." : "Ativo cadastrado.");
        resetDialog();
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
        await apiRequest(`/api/v1/gestec-help-desk/assets/${deleting.id}`, {
          method: "DELETE",
        });
        toast.success("Ativo excluído.");
        setDeleting(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível excluir.",
        );
      }
    });
  }

  const valid = Boolean(
    form.assetTag.trim() &&
    form.name.trim().length >= 2 &&
    form.category.trim().length >= 2,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ativos de TI
          </h1>
          <p className="text-sm text-muted-foreground">
            Inventário de equipamentos vinculáveis aos atendimentos.
          </p>
        </div>
        {canManage && (
          <Button onClick={startCreate}>
            <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />{" "}
            Cadastrar ativo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Inventário</CardTitle>
            <CardDescription>
              {filtered.length} de {initialItems.length} ativo(s).
            </CardDescription>
          </div>
          <div className="relative max-w-md">
            <HugeiconsIcon
              icon={SearchIcon}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar patrimônio, ativo, série ou responsável"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patrimônio</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  {canManage && (
                    <TableHead className="text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length ? (
                  filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {item.assetTag}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.serialNumber ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === AssetStatus.RETIRED
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {statusLabels[item.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.assignedToName ?? "—"}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 7 : 6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      {query
                        ? "Nenhum ativo corresponde à busca."
                        : "Nenhum ativo cadastrado."}
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
          if (!next) resetDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar ativo" : "Cadastrar ativo"}
            </DialogTitle>
            <DialogDescription>
              Registre a identificação estável e o estado atual do equipamento.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="asset-tag">Patrimônio</FieldLabel>
                <Input
                  id="asset-tag"
                  value={form.assetTag}
                  onChange={(event) =>
                    setForm({ ...form, assetTag: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="asset-category">Categoria</FieldLabel>
                <Input
                  id="asset-category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="asset-name">Nome</FieldLabel>
              <Input
                id="asset-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="asset-serial">Número de série</FieldLabel>
                <Input
                  id="asset-serial"
                  value={form.serialNumber}
                  onChange={(event) =>
                    setForm({ ...form, serialNumber: event.target.value })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm({ ...form, status: value as AssetStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value) =>
                        statusLabels[value as AssetStatus] ??
                        "Selecionar status"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AssetStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="asset-assigned">
                Responsável ou local
              </FieldLabel>
              <Input
                id="asset-assigned"
                value={form.assignedToName}
                onChange={(event) =>
                  setForm({ ...form, assignedToName: event.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="asset-notes">Observações</FieldLabel>
              <Textarea
                id="asset-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
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
            <Button disabled={pending || !valid} onClick={save}>
              {pending
                ? "Salvando…"
                : editing
                  ? "Salvar alterações"
                  : "Cadastrar ativo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title="Excluir ativo"
        description={
          deleting
            ? `Excluir “${deleting.name}”? Só é possível se o ativo não estiver vinculado a tickets. Com histórico, mantenha o cadastro.`
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
