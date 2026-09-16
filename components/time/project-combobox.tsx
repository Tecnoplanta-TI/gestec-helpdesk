"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowDown01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export type TimeProject = {
  id: string;
  kind?: "cost-center" | "manual";
  name: string;
  code: string | null;
  billableByDefault: boolean;
};

function projectLabel(project: TimeProject) {
  if (project.kind === "cost-center" && project.code) {
    return `${project.code} · ${project.name}`;
  }
  return project.code ? `${project.name} · ${project.code}` : project.name;
}

function isCostCenter(project: TimeProject) {
  return (
    project.kind === "cost-center" || project.id.startsWith("cost-center:")
  );
}

export function ProjectCombobox({
  projects,
  recentProjectIds,
  value,
  placeholder = "Selecionar centro de custo ou projeto",
  disabled = false,
  allowClear = false,
  onChange,
}: {
  projects: TimeProject[];
  recentProjectIds: string[];
  value: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  onChange: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((project) => project.id === value);
  const recent = useMemo(() => {
    const byId = new Map(projects.map((project) => [project.id, project]));
    return recentProjectIds.flatMap((id) => {
      const project = byId.get(id);
      return project ? [project] : [];
    });
  }, [projects, recentProjectIds]);
  const remaining = useMemo(() => {
    const recentIds = new Set(recent.map((project) => project.id));
    return projects.filter((project) => !recentIds.has(project.id));
  }, [projects, recent]);

  function select(projectId: string) {
    onChange(projectId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-w-0 flex-1 justify-between font-normal"
            aria-label="Centro de custo ou projeto"
          />
        }
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? projectLabel(selected) : placeholder}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-4 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <Command>
          <CommandInput placeholder="Buscar por nome ou código" />
          <CommandList>
            <CommandEmpty>
              Nenhum centro de custo ou projeto encontrado.
            </CommandEmpty>
            {allowClear && value ? (
              <CommandGroup>
                <CommandItem value="limpar-filtro" onSelect={() => select("")}>
                  Todos os projetos
                </CommandItem>
              </CommandGroup>
            ) : null}
            {recent.length > 0 ? (
              <CommandGroup heading="Recentes">
                {recent.map((project) => (
                  <CommandItem
                    key={`recent-${project.id}`}
                    value={`recentes ${project.name} ${project.code ?? ""} ${project.id}`}
                    data-checked={value === project.id || undefined}
                    onSelect={() => select(project.id)}
                  >
                    {projectLabel(project)}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {(["cost-center", "manual"] as const).map((kind) => {
              const items = (recent.length > 0 ? remaining : projects).filter(
                (project) =>
                  kind === "cost-center"
                    ? isCostCenter(project)
                    : !isCostCenter(project),
              );
              if (!items.length) return null;
              return (
                <CommandGroup
                  key={kind}
                  heading={
                    kind === "cost-center"
                      ? "Centros de custo"
                      : "Projetos Semear"
                  }
                >
                  {items.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={`${project.name} ${project.code ?? ""} ${project.id}`}
                      data-checked={value === project.id || undefined}
                      onSelect={() => select(project.id)}
                    >
                      {projectLabel(project)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
