"use client";

import { useState, useTransition } from "react";
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
import { apiRequest } from "@/lib/http/client";

export function CreateCostCenterDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  function close() {
    setCode("");
    setName("");
    onOpenChange(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await apiRequest("/api/v1/gestec-help-desk/cost-centers", {
          method: "POST",
          body: JSON.stringify({ code, name, active: true }),
        });
        toast.success("Centro de custo criado.");
        onCreated?.();
        close();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar o centro de custo.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar centro de custo</DialogTitle>
          <DialogDescription>
            O código precisa ser único. Centros ativos aparecem como projeto na
            jornada.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="admin-cc-code">Código</FieldLabel>
            <Input
              id="admin-cc-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Ex.: FIN"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-cc-name">Nome</FieldLabel>
            <Input
              id="admin-cc-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Financeiro"
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancelar
          </DialogClose>
          <Button
            disabled={pending || !code.trim() || name.trim().length < 2}
            onClick={save}
          >
            {pending ? "Criando…" : "Criar centro de custo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
