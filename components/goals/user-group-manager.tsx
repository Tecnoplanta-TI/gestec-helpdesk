"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/http/client";

type User = { id: string; name: string };
type Group = { id: string; name: string; manager: User | null; members: Array<{ user: User }> };

export function UserGroupManager({ initialGroups, users }: { initialGroups: Group[]; users: User[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  function create() { startTransition(async () => { try { const group = await apiRequest<Group>("/api/v1/gestec-help-desk/user-groups", { method: "POST", body: JSON.stringify({ name, managerId: managerId || null, memberIds }) }); setGroups((current) => [...current, group].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))); setName(""); setManagerId(""); setMemberIds([]); toast.success("Grupo criado."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar o grupo."); } }); }
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-semibold tracking-tight">Grupos de usuários</h1><p className="text-sm text-muted-foreground">Use os grupos para distribuir metas de horas e notificações a uma equipe.</p></div><section className="rounded-xl border p-4"><FieldGroup><Field><FieldLabel htmlFor="group-name">Nome do grupo</FieldLabel><Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Equipe de suporte" /></Field><Field><FieldLabel htmlFor="group-manager">Gestor do grupo</FieldLabel><select id="group-manager" value={managerId} onChange={(event) => setManagerId(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="">Sem gestor definido</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><Field><FieldLabel htmlFor="group-members">Membros</FieldLabel><select id="group-members" multiple value={memberIds} onChange={(event) => setMemberIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))} className="min-h-32 rounded-md border bg-background p-2 text-sm">{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select><p className="text-xs text-muted-foreground">Use Ctrl para selecionar mais de uma pessoa.</p></Field><Button disabled={pending || name.trim().length < 2} onClick={create}>{pending ? "Criando…" : "Criar grupo"}</Button></FieldGroup></section><section className="divide-y rounded-xl border">{groups.length ? groups.map((group) => <div className="p-4" key={group.id}><p className="font-medium">{group.name}</p><p className="text-sm text-muted-foreground">Gestor: {group.manager?.name ?? "Não definido"} · {group.members.length} membro(s)</p></div>) : <p className="p-8 text-center text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>}</section></div>;
}
