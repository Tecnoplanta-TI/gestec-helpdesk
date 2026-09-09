"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { Add01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { apiRequest } from "@/lib/http/client";
import type { TimeProject } from "@/components/time/project-combobox";

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
  showTrigger = true,
  successMessage = "Projeto criado e selecionado.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (project: TimeProject) => void;
  showTrigger?: boolean;
  successMessage?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [availableToAll, setAvailableToAll] = useState(true);
  const [billableByDefault, setBillableByDefault] = useState(false);
  const [active, setActive] = useState(true);
  const dirty =
    name.trim().length > 0 ||
    color !== "#10b981" ||
    !availableToAll ||
    billableByDefault ||
    !active;

  function reset() {
    setName("");
    setColor("#10b981");
    setAvailableToAll(true);
    setBillableByDefault(false);
    setActive(true);
  }

  function handleOpenChange(next: boolean) {
    if (
      !next &&
      dirty &&
      !window.confirm("Há alterações não salvas. Deseja descartá-las?")
    )
      return;
    if (!next) reset();
    onOpenChange(next);
  }

  function createProject() {
    startTransition(async () => {
      try {
        const project = await apiRequest<TimeProject>(
          "/api/v1/gestec-help-desk/projects",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              color,
              availableToAll,
              billableByDefault,
              active,
            }),
          },
        );
        toast.success(successMessage);
        onCreated({
          id: project.id,
          name: project.name,
          code: null,
          billableByDefault: project.billableByDefault,
        });
        reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar o projeto.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger ? (
        <DialogTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Criar projeto" />
          }
        >
          <HugeiconsIcon icon={Add01Icon} />
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar projeto</DialogTitle>
          <DialogDescription>
            Cadastre um projeto manual. Centros de custo continuam com código
            próprio.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="project-name">Nome do projeto</FieldLabel>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Evolução da plataforma"
              aria-invalid={name.length > 0 && name.trim().length < 2}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="project-color">
              Cor de identificação
            </FieldLabel>
            <Input
              id="project-color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="w-20 p-1"
            />
          </Field>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={availableToAll}
              onCheckedChange={(value) => setAvailableToAll(Boolean(value))}
            />
            <span>
              <span className="block text-sm font-medium">
                Disponível para todos
              </span>
              <span className="block text-xs text-muted-foreground">
                Usuários autorizados poderão selecionar este projeto.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox
              checked={billableByDefault}
              onCheckedChange={(value) => setBillableByDefault(Boolean(value))}
            />
            <span>
              <span className="block text-sm font-medium">
                Faturável por padrão
              </span>
              <span className="block text-xs text-muted-foreground">
                Novos registros iniciam como faturáveis.
              </span>
            </span>
          </label>
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Status ativo</span>
              <span className="block text-xs text-muted-foreground">
                Disponível imediatamente no seletor.
              </span>
            </span>
            <Switch
              checked={active}
              onCheckedChange={(value) => setActive(Boolean(value))}
            />
          </label>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancelar
          </DialogClose>
          <Button
            disabled={pending || name.trim().length < 2}
            onClick={createProject}
          >
            {pending ? "Criando…" : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
