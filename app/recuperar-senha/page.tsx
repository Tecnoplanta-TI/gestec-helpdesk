import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient, isSupabaseAuthEnabled } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RecoverPasswordPage() {
  if (!isSupabaseAuthEnabled()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/gestec_help_desk/jornada");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">G</div>
          <CardTitle className="text-xl">Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber um link seguro de redefinição de senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordRecoveryForm />
          <Link
            className="block w-full rounded-md px-4 py-2 text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/login"
          >
            Voltar para o login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
