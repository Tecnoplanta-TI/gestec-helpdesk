"use client";

import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Login02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("E-mail ou senha inválidos. Confira os dados e tente novamente.");
        return;
      }
      window.location.assign("/gestec_help_desk/jornada");
    } catch {
      setError("Não foi possível iniciar a sessão. Tente novamente em alguns instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="w-full" onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <Button className="w-full" size="lg" disabled={submitting} type="submit">
          <HugeiconsIcon icon={Login02Icon} />
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
        <FieldDescription className="text-center">
          Seu acesso é administrado com segurança pela equipe Gestec.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
