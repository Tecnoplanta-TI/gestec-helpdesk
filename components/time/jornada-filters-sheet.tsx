"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ProjectCombobox,
  type TimeProject,
} from "@/components/time/project-combobox";
import { FilterIcon } from "@/lib/icons";
import type { TimeBillableFilter } from "@/lib/domain/time-query";
import { HugeiconsIcon } from "@hugeicons/react";

export type JornadaFilters = {
  from: string;
  project: string;
  ticket: string;
  billable: TimeBillableFilter;
};

export function JornadaFiltersSheet({
  filters,
  projects,
  recentProjectIds,
  onApply,
}: {
  filters: JornadaFilters;
  projects: TimeProject[];
  recentProjectIds: string[];
  onApply: (filters: JornadaFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  function openSheet(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function apply() {
    onApply(draft);
    setOpen(false);
  }

  function reset() {
    const cleared: JornadaFilters = {
      from: filters.from,
      project: "",
      ticket: "",
      billable: "all",
    };
    setDraft(cleared);
    onApply(cleared);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={openSheet}>
      <SheetTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon data-icon="inline-start" icon={FilterIcon} />
        Filtros
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Preencha os campos para realizar o filtro
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="jornada-filter-date">Data</FieldLabel>
              <Input
                id="jornada-filter-date"
                type="date"
                value={draft.from}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel>Centro de custo ou projeto</FieldLabel>
              <ProjectCombobox
                projects={projects}
                recentProjectIds={recentProjectIds}
                value={draft.project}
                allowClear
                placeholder="Todos os centros de custo ou projetos"
                onChange={(project) =>
                  setDraft((current) => ({ ...current, project }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="jornada-filter-ticket">Ticket</FieldLabel>
              <Input
                id="jornada-filter-ticket"
                value={draft.ticket}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ticket: event.target.value,
                  }))
                }
                placeholder="Número ou referência"
              />
            </Field>
            <Field>
              <FieldLabel>Faturabilidade</FieldLabel>
              <Select
                value={draft.billable}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    billable: (value ?? "all") as TimeBillableFilter,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="billable">Faturável</SelectItem>
                  <SelectItem value="non-billable">Não faturável</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            Redefinir
          </Button>
          <Button type="button" onClick={apply}>
            Concluir
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
