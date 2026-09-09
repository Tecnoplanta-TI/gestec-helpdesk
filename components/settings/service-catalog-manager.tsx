"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Add01Icon } from "@/lib/icons";
import { apiRequest } from "@/lib/http/client";
import { ConfirmDeleteDialog } from "@/components/catalog/confirm-delete-dialog";
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
  DialogTrigger,
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

type ServiceGroup = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  services: Array<{
    id: string;
    code: string;
    name: string;
    active: boolean;
    groupId: string;
  }>;
};

export function ServiceCatalogManager({
  initialGroups,
}: {
  initialGroups: ServiceGroup[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [groupOpen, setGroupOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [groupCode, setGroupCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [serviceGroupId, setServiceGroupId] = useState(
    initialGroups[0]?.id ?? "",
  );
  const [serviceCode, setServiceCode] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [deletingGroup, setDeletingGroup] = useState<ServiceGroup | null>(null);
  const [deletingService, setDeletingService] = useState<
    ServiceGroup["services"][number] | null
  >(null);
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null);
  const [editingService, setEditingService] = useState<
    ServiceGroup["services"][number] | null
  >(null);
  const [editGroupCode, setEditGroupCode] = useState("");
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupActive, setEditGroupActive] = useState(true);
  const [editServiceCode, setEditServiceCode] = useState("");
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceGroupId, setEditServiceGroupId] = useState("");
  const [editServiceActive, setEditServiceActive] = useState(true);

  function removeGroup() {
    if (!deletingGroup) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/service-groups/${deletingGroup.id}`,
          { method: "DELETE" },
        );
        toast.success("Grupo excluído.");
        setDeletingGroup(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o grupo.",
        );
      }
    });
  }

  function removeService() {
    if (!deletingService) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/services/${deletingService.id}`,
          { method: "DELETE" },
        );
        toast.success("Serviço excluído.");
        setDeletingService(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o serviço.",
        );
      }
    });
  }

  function openEditGroup(group: ServiceGroup) {
    setEditingGroup(group);
    setEditGroupCode(group.code);
    setEditGroupName(group.name);
    setEditGroupActive(group.active);
  }

  function openEditService(service: ServiceGroup["services"][number]) {
    setEditingService(service);
    setEditServiceCode(service.code);
    setEditServiceName(service.name);
    setEditServiceGroupId(service.groupId);
    setEditServiceActive(service.active);
  }

  function saveGroup() {
    if (!editingGroup) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/service-groups/${editingGroup.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              code: editGroupCode,
              name: editGroupName,
              active: editGroupActive,
            }),
          },
        );
        toast.success("Grupo atualizado.");
        setEditingGroup(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  function saveService() {
    if (!editingService) return;
    startTransition(async () => {
      try {
        await apiRequest(
          `/api/v1/gestec-help-desk/services/${editingService.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              code: editServiceCode,
              name: editServiceName,
              groupId: editServiceGroupId,
              active: editServiceActive,
            }),
          },
        );
        toast.success("Serviço atualizado.");
        setEditingService(null);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível salvar.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Catálogo de serviços
          </h1>
          <p className="text-sm text-muted-foreground">
            Grupos e serviços usados na triagem. Alterações não reclassificam
            tickets antigos.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
            <DialogTrigger render={<Button variant="outline" />}>
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} /> Grupo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo grupo</DialogTitle>
                <DialogDescription>
                  O código é único e estável.
                </DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="group-code">Código</FieldLabel>
                  <Input
                    id="group-code"
                    value={groupCode}
                    onChange={(event) => setGroupCode(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="group-name">Nome</FieldLabel>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await apiRequest("/api/v1/gestec-help-desk/services", {
                          method: "POST",
                          body: JSON.stringify({
                            code: groupCode,
                            name: groupName,
                          }),
                        });
                        toast.success("Grupo criado.");
                        setGroupOpen(false);
                        router.refresh();
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Falha ao salvar.",
                        );
                      }
                    })
                  }
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={serviceOpen} onOpenChange={setServiceOpen}>
            <DialogTrigger render={<Button />}>
              <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />{" "}
              Serviço
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo serviço</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel>Grupo</FieldLabel>
                  <Select
                    value={serviceGroupId}
                    onValueChange={(value) => setServiceGroupId(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {(value) =>
                          initialGroups.find((item) => item.id === value)
                            ?.name ?? "Selecionar grupo"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {initialGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-code">Código</FieldLabel>
                  <Input
                    id="service-code"
                    value={serviceCode}
                    onChange={(event) => setServiceCode(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="service-name">Nome</FieldLabel>
                  <Input
                    id="service-name"
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button
                  disabled={pending || !serviceGroupId}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await apiRequest("/api/v1/gestec-help-desk/services", {
                          method: "POST",
                          body: JSON.stringify({
                            groupId: serviceGroupId,
                            code: serviceCode,
                            name: serviceName,
                          }),
                        });
                        toast.success("Serviço criado.");
                        setServiceOpen(false);
                        router.refresh();
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Falha ao salvar.",
                        );
                      }
                    })
                  }
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {initialGroups.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>{group.code}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={group.active ? "secondary" : "outline"}>
                  {group.active ? "Ativo" : "Inativo"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditGroup(group)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeletingGroup(group)}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.services.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Nenhum serviço neste grupo.
                    </TableCell>
                  </TableRow>
                ) : (
                  group.services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-mono">
                        {service.code}
                      </TableCell>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={service.active ? "secondary" : "outline"}
                        >
                          {service.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditService(service)}
                          >
                            Editar
                          </Button>
                          <Switch
                            checked={service.active}
                            onCheckedChange={(checked) =>
                              startTransition(async () => {
                                try {
                                  await apiRequest(
                                    `/api/v1/gestec-help-desk/services/${service.id}`,
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({ active: checked }),
                                    },
                                  );
                                  toast.success("Serviço atualizado.");
                                  router.refresh();
                                } catch (error) {
                                  toast.error(
                                    error instanceof Error
                                      ? error.message
                                      : "Falha ao atualizar.",
                                  );
                                }
                              })
                            }
                            aria-label={`Ativar ${service.name}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingService(service)}
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      <ConfirmDeleteDialog
        open={Boolean(deletingGroup)}
        title="Excluir grupo"
        description={
          deletingGroup
            ? `Excluir “${deletingGroup.name}” e os serviços sem histórico? Se algum serviço já estiver em tickets, inative em vez de excluir.`
            : ""
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setDeletingGroup(null);
        }}
        onConfirm={removeGroup}
      />
      <ConfirmDeleteDialog
        open={Boolean(deletingService)}
        title="Excluir serviço"
        description={
          deletingService
            ? `Excluir “${deletingService.name}”? Só é possível se não houver tickets vinculados. Com histórico, inative para preservar os registros.`
            : ""
        }
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setDeletingService(null);
        }}
        onConfirm={removeService}
      />
      <Sheet
        open={Boolean(editingGroup)}
        onOpenChange={(open) => {
          if (!open) setEditingGroup(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar grupo</SheetTitle>
            <SheetDescription>
              Código, nome e status do grupo de serviços.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-group-code">Código</FieldLabel>
                <Input
                  id="edit-group-code"
                  value={editGroupCode}
                  onChange={(event) => setEditGroupCode(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-group-name">Nome</FieldLabel>
                <Input
                  id="edit-group-name"
                  value={editGroupName}
                  onChange={(event) => setEditGroupName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Ativo</FieldLabel>
                <Switch
                  checked={editGroupActive}
                  onCheckedChange={(value) =>
                    setEditGroupActive(Boolean(value))
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditingGroup(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                pending ||
                editGroupCode.trim().length < 1 ||
                editGroupName.trim().length < 2
              }
              onClick={saveGroup}
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <Sheet
        open={Boolean(editingService)}
        onOpenChange={(open) => {
          if (!open) setEditingService(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar serviço</SheetTitle>
            <SheetDescription>
              Código, nome, grupo e status do item de catálogo.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6">
            <FieldGroup>
              <Field>
                <FieldLabel>Grupo</FieldLabel>
                <Select
                  value={editServiceGroupId}
                  onValueChange={(value) =>
                    setEditServiceGroupId(value ?? editServiceGroupId)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value) =>
                        initialGroups.find((item) => item.id === value)?.name ??
                        "Grupo"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {initialGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-service-code">Código</FieldLabel>
                <Input
                  id="edit-service-code"
                  value={editServiceCode}
                  onChange={(event) => setEditServiceCode(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-service-name">Nome</FieldLabel>
                <Input
                  id="edit-service-name"
                  value={editServiceName}
                  onChange={(event) => setEditServiceName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Ativo</FieldLabel>
                <Switch
                  checked={editServiceActive}
                  onCheckedChange={(value) =>
                    setEditServiceActive(Boolean(value))
                  }
                />
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditingService(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                pending ||
                !editServiceGroupId ||
                editServiceCode.trim().length < 1 ||
                editServiceName.trim().length < 2
              }
              onClick={saveService}
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
