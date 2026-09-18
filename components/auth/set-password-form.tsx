"use client";

import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

import { newPasswordValidationError } from "@/lib/auth/password-policy";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type SetPasswordFormProps = {
  successRedirectTo?: string;
};

export function SetPasswordForm({
  successRedirectTo = "/gestec_help_desk/jornada",
}: SetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = newPasswordValidationError(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError("Não foi possível definir sua senha. Abra novamente o convite e tente de novo.");
        return;
      }
      window.location.assign(successRedirectTo);
    } catch {
      setError("Não foi possível definir sua senha. Tente novamente em alguns instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="new-password">Crie sua senha</FieldLabel>
          <Input
            autoComplete="new-password"
            id="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password-confirmation">Confirme sua senha</FieldLabel>
          <Input
            autoComplete="new-password"
            id="password-confirmation"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </Field>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button className="w-full" disabled={submitting} size="lg" type="submit">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} />
          {submitting ? "Salvando senha..." : "Criar senha e entrar"}
        </Button>
        <FieldDescription className="text-center">
          Use pelo menos 8 caracteres. Esta será sua senha de acesso ao Gestec.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
