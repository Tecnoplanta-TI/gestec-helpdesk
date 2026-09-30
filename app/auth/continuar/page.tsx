import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { passwordFlowFromTokenType } from "@/lib/auth/password-flow";
import { isSupabaseAuthEnabled } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContinueAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isSupabaseAuthEnabled()) redirect("/login");

  const params = await searchParams;
  const tokenHash = firstValue(params.token_hash) ?? "";
  const code = firstValue(params.code) ?? "";
  const type = firstValue(params.type) ?? "";
  const flow = passwordFlowFromTokenType(type);
  if (
    (tokenHash && (!flow || tokenHash.length > 2048)) ||
    (!tokenHash && (!code || code.length > 8192))
  ) {
    redirect(`/login?${type === "recovery" ? "recovery" : "invite"}=invalid`);
  }

  const isRecovery = flow === "recovery";
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
            G
          </div>
          <CardTitle className="text-xl">
            {isRecovery ? "Redefinir sua senha" : "Ativar seu acesso"}
          </CardTitle>
          <CardDescription>
            {isRecovery
              ? "Confirme que deseja continuar para escolher uma nova senha."
              : "Confirme que deseja continuar para criar sua senha e acessar o Gestec Help Desk."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/confirm" method="post" className="space-y-4">
            {tokenHash ? (
              <>
                <input type="hidden" name="token_hash" value={tokenHash} />
                <input type="hidden" name="type" value={type} />
              </>
            ) : (
              <>
                <input type="hidden" name="code" value={code} />
                {type ? <input type="hidden" name="type" value={type} /> : null}
              </>
            )}
            <Button className="w-full sm:w-auto" size="lg" type="submit">
              {isRecovery ? "Continuar para redefinir senha" : "Continuar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Por segurança, o link só será validado depois de você confirmar.
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
