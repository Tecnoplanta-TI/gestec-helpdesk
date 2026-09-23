"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter } from "next/navigation";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { FilterIcon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";

export type ReportFilters = {
  from: string;
  to: string;
  costCenter: string;
  manualProject: string;
  billable: string;
  userId: string;
  ticket: string;
};

type Option = { value: string; label: string };

function selectedRange(filters: ReportFilters): DateRange | undefined {
  const from = parseISO(filters.from);
  const to = parseISO(filters.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()))
    return undefined;
  return { from, to };
}

function dateLabel(range: DateRange | undefined) {
  if (!range?.from) return "Selecionar período";
  if (!range.to) return format(range.from, "dd/MM/yyyy", { locale: ptBR });
  return `${format(range.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(range.to, "dd/MM/yyyy", { locale: ptBR })}`;
}

export function ReportsFiltersSheet({
  filters,
  costCenters,
  projects,
  users,
}: {
  filters: ReportFilters;
  costCenters: Option[];
  projects: Option[];
  users: Option[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);

  function openSheet(next: boolean) {
    if (next) setDraft(filters);
    setOpen(next);
  }

  function apply() {
    const params = new URLSearchParams({ from: draft.from, to: draft.to });
    if (draft.costCenter !== "all") params.set("costCenter", draft.costCenter);
    if (draft.manualProject !== "all") {
      params.set("manualProject", draft.manualProject);
    }
    if (draft.billable !== "all") params.set("billable", draft.billable);
    if (draft.userId !== "all") params.set("userId", draft.userId);
    if (draft.ticket.trim()) params.set("ticket", draft.ticket.trim());
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  function reset() {
    const cleared: ReportFilters = {
      ...filters,
      costCenter: "all",
      manualProject: "all",
      billable: "all",
      ticket: "",
    };
    setDraft(cleared);
    const params = new URLSearchParams({
      from: cleared.from,
      to: cleared.to,
    });
    if (cleared.userId !== "all") params.set("userId", cleared.userId);
    router.push(`${pathname}?${params.toString()}`);
    setOpen(false);
  }

  const range = selectedRange(draft);

  return (
    <Sheet open={open} onOpenChange={openSheet}>
      <SheetTrigger render={<Button type="button" variant="outline" />}>
        <HugeiconsIcon data-icon="inline-start" icon={FilterIcon} />
        Filtros
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros do relatório</SheetTitle>
          <SheetDescription>
            Escolha o período e os critérios dos apontamentos exibidos.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <FieldGroup>
            <Field>
              <FieldLabel>Período</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  {dateLabel(range)}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={(nextRange) => {
                      if (!nextRange?.from) return;
                      const nextFrom = format(nextRange.from, "yyyy-MM-dd");
                      const nextTo = format(
                        nextRange.to ?? nextRange.from,
                        "yyyy-MM-dd",
                      );
                      setDraft((current) => ({
                        ...current,
                        from: nextFrom,
                        to: nextTo,
                      }));
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </Field>
            <Field>
              <FieldLabel>Centro de custo</FieldLabel>
              <Select
                value={draft.costCenter}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    costCenter: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    {costCenters.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Projeto Semear</FieldLabel>
              <Select
                value={draft.manualProject}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    manualProject: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos</SelectItem>
                    {projects.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Faturabilidade</FieldLabel>
              <Select
                value={draft.billable}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    billable: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="billable">Faturável</SelectItem>
                    <SelectItem value="non-billable">Não faturável</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Usuário</FieldLabel>
              <Select
                value={draft.userId}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    userId: value ?? "all",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {users.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="report-filter-ticket">
                Ticket ou descrição
              </FieldLabel>
              <Input
                id="report-filter-ticket"
                value={draft.ticket}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    ticket: event.target.value,
                  }))
                }
                placeholder="#1842 ou termo"
              />
            </Field>
          </FieldGroup>
        </div>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            Redefinir
          </Button>
          <Button type="button" onClick={apply}>
            Aplicar filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
