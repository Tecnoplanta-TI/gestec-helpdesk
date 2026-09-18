"use client";

import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/redefinir-senha` },
      );
      if (recoveryError) {
        setError("Não foi possível enviar o link agora. Tente novamente em alguns instantes.");
        return;
      }
      setSent(true);
    } catch {
      setError("Não foi possível enviar o link agora. Tente novamente em alguns instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3" role="status">
        <p className="text-sm leading-6 text-foreground">
          Se existir uma conta para esse e-mail, você receberá um link para redefinir a senha.
        </p>
        <p className="text-sm text-muted-foreground">
          Verifique também a caixa de spam. O link expira por segurança.
        </p>
      </div>
    );
  }

  return (
    <form className="w-full" onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="recovery-email">E-mail</FieldLabel>
          <Input
            autoComplete="email"
            id="recovery-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </Field>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button className="w-full" disabled={submitting} size="lg" type="submit">
          {submitting ? "Enviando link..." : "Enviar link de recuperação"}
        </Button>
        <FieldDescription className="text-center">
          Enviaremos instruções apenas se houver uma conta cadastrada.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
