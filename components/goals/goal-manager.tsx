"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatHoursMinutes } from "@/lib/format";
import { apiRequest } from "@/lib/http/client";

type User = { id: string; name: string };
type Group = { id: string; name: string };
type Goal = { id: string; title: string; targetSeconds: number; startsOn: string; endsOn: string; active: boolean; targetUser: User | null; targetGroup: Group | null; project: { name: string } | null; client: { name: string } | null };

export function GoalManager({ goals: initialGoals, users, groups, canManage }: { goals: Goal[]; users: User[]; groups: Group[]; canManage: boolean }) {
  const [goals, setGoals] = useState(initialGoals);
  const [pending, startTransition] = useTransition();
  const [targetType, setTargetType] = useState<"user" | "group">("user");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(today);
  function create() { startTransition(async () => { try { const goal = await apiRequest<Goal>("/api/v1/gestec-help-desk/goals", { method: "POST", body: JSON.stringify({ title, targetSeconds: Math.round(Number(hours.replace(",", ".")) * 3600), startsOn, endsOn, targetUserId: targetType === "user" ? targetId : null, targetGroupId: targetType === "group" ? targetId : null }) }); setGoals((current) => [goal, ...current]); setTitle(""); setHours(""); setTargetId(""); toast.success("Meta criada e os envolvidos foram notificados."); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a meta."); } }); }
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-semibold tracking-tight">Metas de horas</h1><p className="text-sm text-muted-foreground">Metas individuais têm precedência sobre metas equivalentes de grupo.</p></div>{canManage ? <section className="rounded-xl border p-4"><h2 className="mb-4 font-medium">Nova meta</h2><FieldGroup><Field><FieldLabel>Nome da meta</FieldLabel><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Entregas de setembro" /></Field><Field><FieldLabel>Aplicar para</FieldLabel><Select value={targetType} onValueChange={(value) => { setTargetType(value as "user" | "group"); setTargetId(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="group">Grupo de usuários</SelectItem></SelectContent></Select></Field><Field><FieldLabel>{targetType === "user" ? "Usuário" : "Grupo"}</FieldLabel><Select value={targetId} onValueChange={(value) => setTargetId(value ?? "")}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{(targetType === "user" ? users : groups).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></Field><Field><FieldLabel>Meta em horas</FieldLabel><Input inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="Ex.: 160" /></Field><Field><FieldLabel>Início</FieldLabel><Input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></Field><Field><FieldLabel>Fim</FieldLabel><Input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></Field><Button disabled={pending || !title.trim() || !targetId || Number(hours.replace(",", ".")) <= 0} onClick={create}>{pending ? "Criando…" : "Criar meta"}</Button></FieldGroup></section> : null}<section className="overflow-hidden rounded-xl border"><div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b px-4 py-3 text-xs text-muted-foreground"><span>Meta</span><span>Destinatário</span><span>Horas</span></div>{goals.length ? goals.map((goal) => <div key={goal.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 border-b px-4 py-3 last:border-b-0"><span className="min-w-0"><strong className="block truncate">{goal.title}</strong><small className="text-muted-foreground">{new Date(goal.startsOn).toLocaleDateString("pt-BR")} a {new Date(goal.endsOn).toLocaleDateString("pt-BR")}</small></span><span className="max-w-40 truncate">{goal.targetUser?.name ?? goal.targetGroup?.name}</span><span className="tabular-nums">{formatHoursMinutes(goal.targetSeconds)}</span></div>) : <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma meta para este escopo.</p>}</section></div>;
}
