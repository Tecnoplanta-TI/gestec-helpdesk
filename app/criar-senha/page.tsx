import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient, isSupabaseAuthEnabled } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CreatePasswordPage() {
  if (!isSupabaseAuthEnabled()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?invite=invalid");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">G</div>
          <CardTitle className="text-xl">Crie sua senha</CardTitle>
          <CardDescription>
            Seu convite foi confirmado. Defina uma senha para acessar o Gestec Help Desk.
          </CardDescription>
        </CardHeader>
        <CardContent><SetPasswordForm /></CardContent>
      </Card>
    </main>
  );
}
