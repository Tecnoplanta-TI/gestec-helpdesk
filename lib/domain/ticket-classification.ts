import { normalizeRequestType } from "@/lib/domain/request-types";

function normalizeGroup(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function ticketClassificationFields(input: {
  requestType: string | null | undefined;
  serviceGroup: string | null | undefined;
}) {
  const group = normalizeGroup(input.serviceGroup);
  const isZeevGroup = group === "zeev";
  const isAcquisitionGroup = group === "aquisicao / alocacao";
  const isInterruption =
    normalizeRequestType(input.requestType) === "interrupcao_servico";

  return {
    showApplicationOrProcess: isZeevGroup,
    showAssetCode: isInterruption || isAcquisitionGroup,
  };
}
