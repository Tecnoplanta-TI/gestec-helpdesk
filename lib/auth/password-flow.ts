export type PasswordFlow = "invite" | "recovery";

export function passwordFlowFromTokenType(value: string | null): PasswordFlow | null {
  return value === "invite" || value === "recovery" ? value : null;
}

export function passwordFlowDestination(flow: PasswordFlow) {
  return flow === "recovery" ? "/redefinir-senha" : "/criar-senha";
}
