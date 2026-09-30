"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";

export function ApontamentosPeriodFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);

  function apply() {
    const params = new URLSearchParams({ from: fromValue, to: toValue });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <Field className="w-auto gap-1">
        <FieldLabel htmlFor="apontamentos-from">De</FieldLabel>
        <DateField
          id="apontamentos-from"
          value={fromValue}
          onChange={setFromValue}
        />
      </Field>
      <Field className="w-auto gap-1">
        <FieldLabel htmlFor="apontamentos-to">Até</FieldLabel>
        <DateField
          id="apontamentos-to"
          value={toValue}
          onChange={setToValue}
          min={fromValue}
        />
      </Field>
      <Button type="submit">Filtrar</Button>
    </form>
  );
}
