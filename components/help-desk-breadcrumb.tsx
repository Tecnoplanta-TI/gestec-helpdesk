"use client";

import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const labels: Record<string, string> = {
  tickets: "Tickets",
  kanban: "Kanban",
  "minha-caixa": "Minha Caixa",
  solicitacoes: "Acompanhar",
  jornada: "Jornada",
  ativos: "Ativos de TI",
  relatorios: "Relatórios",
  admin: "Admin",
  grupos: "Grupos",
  metas: "Metas",
  usuarios: "Usuários",
  apontamentos: "Apontamentos",
  projetos: "Projetos",
  "centros-de-custo": "Clientes",
  servicos: "Serviços",
  timers: "Timers",
  auditoria: "Auditoria",
};

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function crumbLabel(part: string) {
  if (labels[part]) return labels[part];
  if (UUID_LIKE.test(part) || /^\d+$/.test(part)) return "Detalhe";
  return part;
}

export function HelpDeskBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "gestec_help_desk") return null;
  const crumbs = parts.slice(1);
  if (!crumbs.length) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap max-sm:[&>li:not(:last-child)]:hidden">
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/gestec_help_desk/tickets" />}>
            Help Desk
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((part, index) => {
          const href = `/gestec_help_desk/${crumbs.slice(0, index + 1).join("/")}`;
          const current = index === crumbs.length - 1;
          const label = crumbLabel(part);
          return (
            <Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {current ? (
                  <BreadcrumbPage className="max-w-40 truncate sm:max-w-none">
                    {label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="max-w-32 truncate"
                    render={<Link href={href} />}
                  >
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
