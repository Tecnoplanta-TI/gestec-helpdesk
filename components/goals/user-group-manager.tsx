"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/http/client";

type User = { id: string; name: string };
type Group = {
  id: string;
  name: string;
  manager: User | null;
  members: Array<{ user: User }>;
};

export function UserGroupManager({
  initialGroups,
  users,
}: {
  initialGroups: Group[];
  users: User[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  function toggleMember(userId: string, checked: boolean) {
    setMemberIds((current) =>
      checked
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId),
    );
  }
  function create() {
    startTransition(async () => {
      try {
        const group = await apiRequest<Group>(
          "/api/v1/gestec-help-desk/user-groups",
          {
            method: "POST",
            body: JSON.stringify({
              name,
              managerId: managerId || null,
              memberIds,
            }),
          },
        );
        setGroups((current) =>
          [...current, group].sort((a, b) =>
            a.name.localeCompare(b.name, "pt-BR"),
          ),
        );
        setName("");
        setManagerId("");
        setMemberIds([]);
        toast.success("Grupo criado.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível criar o grupo.",
        );
      }
    });
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Grupos de usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          Use os grupos para distribuir metas de horas e notificações a uma
          equipe.
        </p>
      </div>
      <section className="rounded-xl border p-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="group-name">Nome do grupo</FieldLabel>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Equipe de suporte"
            />
          </Field>
          <Field>
            <FieldLabel>Gestor do grupo</FieldLabel>
            <Select
              value={managerId}
              onValueChange={(value) => setManagerId(value ?? "")}
            >
              <SelectTrigger id="group-manager" className="w-full">
                <SelectValue placeholder="Sem gestor definido" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {managerId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setManagerId("")}
              >
                Remover gestor
              </Button>
            ) : null}
          </Field>
          <Field>
            <FieldLabel id="group-members-label">Membros</FieldLabel>
            <div
              role="group"
              aria-labelledby="group-members-label"
              className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2"
            >
              {users.length ? (
                users.map((user) => {
                  const checkboxId = `group-member-${user.id}`;
                  return (
                    <label
                      key={user.id}
                      htmlFor={checkboxId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={memberIds.includes(user.id)}
                        onCheckedChange={(checked) =>
                          toggleMember(user.id, Boolean(checked))
                        }
                      />
                      <span className="truncate">{user.name}</span>
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário ativo disponível.
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Marque uma ou mais pessoas para compor o grupo.
            </p>
          </Field>
          <Button disabled={pending || name.trim().length < 2} onClick={create}>
            {pending ? "Criando…" : "Criar grupo"}
          </Button>
        </FieldGroup>
      </section>
      <section className="divide-y rounded-xl border">
        {groups.length ? (
          groups.map((group) => (
            <div className="p-4" key={group.id}>
              <p className="font-medium">{group.name}</p>
              <p className="text-sm text-muted-foreground">
                Gestor: {group.manager?.name ?? "Não definido"} ·{" "}
                {group.members.length} membro(s)
              </p>
            </div>
          ))
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nenhum grupo cadastrado.
          </p>
        )}
      </section>
    </div>
  );
}
