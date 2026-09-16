import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient, isSupabaseAuthEnabled } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isSupabaseAuthEnabled()) {
    redirect("/gestec_help_desk/jornada");
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/gestec_help_desk/jornada");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">G</div>
          <CardTitle className="text-xl">Acessar Gestec Help Desk</CardTitle>
          <CardDescription>Entre com a conta cadastrada para você no Gestec.</CardDescription>
        </CardHeader>
        <CardContent><LoginForm /></CardContent>
      </Card>
    </main>
  );
}
