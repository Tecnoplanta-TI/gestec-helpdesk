"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function splitDatetimeLocal(value: string) {
  if (!value) return { date: "", time: "" };
  const [date = "", timePart = ""] = value.split("T");
  return { date, time: timePart.slice(0, 5) };
}

function joinDatetimeLocal(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

export function DateField({
  id,
  value,
  onChange,
  disabled = false,
  min,
  invalid = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  invalid?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const valid =
    selected instanceof Date && !Number.isNaN(selected.getTime());
  const minimum = min ? parseISO(min) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "justify-start font-normal",
              !valid && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        {valid ? format(selected, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={valid ? selected : undefined}
          disabled={
            minimum && !Number.isNaN(minimum.getTime())
              ? { before: minimum }
              : undefined
          }
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Date + time for values shaped like `yyyy-MM-ddTHH:mm` (datetime-local). */
export function DateTimeField({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const { date, time } = splitDatetimeLocal(value);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <DateField
        id={id}
        value={date}
        disabled={disabled}
        invalid={invalid}
        onChange={(nextDate) => onChange(joinDatetimeLocal(nextDate, time))}
        className="w-full sm:w-auto"
      />
      <Input
        type="time"
        aria-label={id ? `${id}-hora` : "Hora"}
        value={time}
        disabled={disabled || !date}
        aria-invalid={invalid || undefined}
        onChange={(event) =>
          onChange(joinDatetimeLocal(date, event.target.value))
        }
        className="w-full sm:w-auto"
      />
    </div>
  );
}
