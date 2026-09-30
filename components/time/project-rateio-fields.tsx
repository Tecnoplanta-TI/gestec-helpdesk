"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCatalogLabel,
  formatSharePercent,
  RATEIO_TOTAL_BPS,
} from "@/lib/format";
import { apiRequest } from "@/lib/http/client";
import { appendRateioShare, type RateioShareDraft } from "@/lib/domain/rateio-draft";
import { Add01Icon, Cancel01Icon } from "@/lib/icons";
import { HugeiconsIcon } from "@/components/icon";

export type { RateioShareDraft } from "@/lib/domain/rateio-draft";
export { appendRateioShare } from "@/lib/domain/rateio-draft";

export type RateioShareValue = {
  costCenterId: string;
  code: string;
  name: string;
  shareBps: number;
};

type CostCenterOption = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

function compareCostCenterCode(left: string, right: string) {
  const leftCode = Number(left);
  const rightCode = Number(right);
  if (
    Number.isFinite(leftCode) &&
    Number.isFinite(rightCode) &&
    leftCode !== rightCode
  ) {
    return leftCode - rightCode;
  }
  return left.localeCompare(right, "pt-BR", { numeric: true });
}

function parsePercentBps(value: string) {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function sharesFromRateio(
  rateio: RateioShareValue[] | undefined,
): RateioShareDraft[] {
  return (rateio ?? []).map((share) => ({
    id: share.costCenterId,
    costCenterId: share.costCenterId,
    percent: formatSharePercent(share.shareBps),
  }));
}

export function rateioPayload(shares: RateioShareDraft[]) {
  return shares
    .filter((share) => share.costCenterId && share.percent.trim())
    .map((share) => ({
      costCenterId: share.costCenterId,
      percent: Number(share.percent.replace(",", ".")),
    }));
}

export function isRateioDraftValid(shares: RateioShareDraft[]) {
  const filled = shares.filter(
    (share) => share.costCenterId || share.percent.trim(),
  );
  if (!filled.length) return true;
  if (filled.some((share) => !share.costCenterId || !share.percent.trim())) {
    return false;
  }
  const ids = new Set(filled.map((share) => share.costCenterId));
  if (ids.size !== filled.length) return false;
  const total = filled.reduce((sum, share) => {
    const bps = parsePercentBps(share.percent);
    return sum + (bps ?? Number.NaN);
  }, 0);
  return total === RATEIO_TOTAL_BPS;
}

export function ProjectRateioFields({
  shares,
  onChange,
}: {
  shares: RateioShareDraft[];
  onChange: (shares: RateioShareDraft[]) => void;
}) {
  const [costCenters, setCostCenters] = useState<CostCenterOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<CostCenterOption[]>("/api/v1/gestec-help-desk/cost-centers")
      .then((items) => {
        if (!cancelled) setCostCenters(items);
      })
      .catch(() => {
        if (!cancelled) setCostCenters([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = new Set(
    shares.map((share) => share.costCenterId).filter(Boolean),
  );
  const options = useMemo(
    () =>
      [...costCenters].sort((left, right) =>
        compareCostCenterCode(left.code, right.code),
      ),
    [costCenters],
  );
  const totalBps = shares.reduce((sum, share) => {
    const bps = parsePercentBps(share.percent);
    return sum + (bps ?? 0);
  }, 0);

  function addShare() {
    onChange(appendRateioShare(shares));
  }

  return (
    <Field>
      <FieldLabel>Rateio por centro de custo</FieldLabel>
      <FieldDescription>
        Opcional. Distribua 100% entre um ou mais centros de custo, por exemplo
        50% e 50%.
      </FieldDescription>
      <div className="mt-2 flex flex-col gap-2">
        {shares.length ? (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[1fr_5.5rem_auto] gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Centro de custo</span>
              <span className="text-right">%</span>
              <span className="sr-only">Remover</span>
            </div>
            {shares.map((share) => {
              const available = options.filter(
                (center) =>
                  center.id === share.costCenterId ||
                  (center.active && !selected.has(center.id)),
              );
              const labels = Object.fromEntries(
                available.map((center) => [
                  center.id,
                  formatCatalogLabel(center.code, center.name),
                ]),
              );
              return (
                <div
                  key={share.id}
                  className="grid grid-cols-[1fr_5.5rem_auto] items-center gap-2 border-b px-3 py-2 last:border-b-0"
                >
                  <Select
                    value={share.costCenterId || undefined}
                    onValueChange={(value) =>
                      onChange(
                        shares.map((current) =>
                          current.id === share.id
                            ? { ...current, costCenterId: value ?? "" }
                            : current,
                        ),
                      )
                    }
                    items={labels}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {share.costCenterId
                          ? (labels[share.costCenterId] ?? "Centro de custo")
                          : "Selecionar"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {available.map((center) => (
                        <SelectItem key={center.id} value={center.id}>
                          {formatCatalogLabel(center.code, center.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    inputMode="decimal"
                    value={share.percent}
                    onChange={(event) =>
                      onChange(
                        shares.map((current) =>
                          current.id === share.id
                            ? { ...current, percent: event.target.value }
                            : current,
                        ),
                      )
                    }
                    className="text-right"
                    aria-label="Percentual do rateio"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover centro de custo"
                    onClick={() =>
                      onChange(
                        shares.filter((current) => current.id !== share.id),
                      )
                    }
                  >
                    <HugeiconsIcon icon={Cancel01Icon} />
                  </Button>
                </div>
              );
            })}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {totalBps === RATEIO_TOTAL_BPS
                  ? "Soma"
                  : "A soma precisa ser 100%. Os percentuais digitados foram mantidos."}
              </span>
              <span
                className={`tabular-nums ${
                  totalBps === RATEIO_TOTAL_BPS
                    ? "font-medium"
                    : "text-destructive"
                }`}
              >
                {formatSharePercent(totalBps)}
              </span>
            </div>
          </div>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={addShare}>
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          Adicionar centro de custo
        </Button>
      </div>
    </Field>
  );
}
