import Link from "next/link";
import {
  Boxes,
  Clock3,
  FolderKanban,
  Goal,
  ScrollText,
  Server,
  Ticket,
  TimerReset,
  Users,
  UsersRound,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const sections = [
  {
    href: "/gestec_help_desk/admin/grupos",
    title: "Grupos de usuários",
    description: "Cadastre e organize equipes de usuários.",
    icon: UsersRound,
  },
  {
    href: "/gestec_help_desk/admin/metas",
    title: "Metas de horas",
    description: "Defina metas individuais em horas por dia.",
    icon: Goal,
  },
  {
    href: "/gestec_help_desk/admin/usuarios",
    title: "Usuários",
    description: "Nome, e-mail, perfil e status local do UserRef.",
    icon: Users,
  },
  {
    href: "/gestec_help_desk/admin/tickets",
    title: "Tickets",
    description:
      "Criar tickets e editar todos os campos, inclusive status, responsável e datas.",
    icon: Ticket,
  },
  {
    href: "/gestec_help_desk/admin/apontamentos",
    title: "Apontamentos",
    description:
      "Criar e corrigir duração, projeto, faturabilidade e validade.",
    icon: Clock3,
  },
  {
    href: "/gestec_help_desk/admin/projetos",
    title: "Projetos",
    description:
      "Edite nome, visibilidade, faturabilidade, valor-hora, vigência e status.",
    icon: FolderKanban,
  },
  {
    href: "/gestec_help_desk/admin/centros-de-custo",
    title: "Clientes",
    description: "Código, nome e ativação dos clientes/centros de custo.",
    icon: Boxes,
  },
  {
    href: "/gestec_help_desk/admin/servicos",
    title: "Serviços",
    description: "Grupos e itens do catálogo usados na abertura.",
    icon: Wrench,
  },
  {
    href: "/gestec_help_desk/admin/ativos",
    title: "Ativos",
    description: "Patrimônio, status e vínculo com tickets.",
    icon: Server,
  },
  {
    href: "/gestec_help_desk/admin/timers",
    title: "Timers",
    description: "Descartar um timer ativo que ficou preso.",
    icon: TimerReset,
  },
  {
    href: "/gestec_help_desk/admin/auditoria",
    title: "Auditoria",
    description: "Histórico das alterações manuais e operacionais.",
    icon: ScrollText,
  },
];

export default function AdminHubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Crie cadastros e ajuste manualmente o Help Desk. A fila operacional
          continua com as regras de atendimento.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              prefetch={true}
              className="block rounded-4xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <Card className="h-full transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
