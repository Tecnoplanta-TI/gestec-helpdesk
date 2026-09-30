export type RateioShareDraft = {
  id: string;
  costCenterId: string;
  percent: string;
};

export function createRateioShareId() {
  return crypto.randomUUID();
}

export function appendRateioShare(
  shares: RateioShareDraft[],
): RateioShareDraft[] {
  return [
    ...shares,
    {
      id: createRateioShareId(),
      costCenterId: "",
      percent: shares.length === 0 ? "100" : "",
    },
  ];
}
