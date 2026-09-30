import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient, isSupabaseAuthEnabled } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  if (!isSupabaseAuthEnabled()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?recovery=invalid");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">G</div>
          <CardTitle className="text-xl">Defina uma nova senha</CardTitle>
          <CardDescription>
            Escolha uma senha nova para recuperar o acesso ao Gestec Help Desk.
          </CardDescription>
        </CardHeader>
        <CardContent><SetPasswordForm /></CardContent>
      </Card>
    </main>
  );
}
