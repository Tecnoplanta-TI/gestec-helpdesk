"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  CheckCircle2Icon,
  ClockIcon,
  InboxIcon,
  KanbanIcon,
  MonitorIcon,
  Settings2Icon,
  TerminalIcon,
  TicketIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { hasPermission, type Permission } from "@/lib/auth/permissions"
import type { UserRole } from "@/lib/client-enums"
import { isJornadaOnlyAllowedPath } from "@/lib/features/jornada-only"

function childActive(pathname: string, href: string, exact?: boolean) {
  return exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; role: UserRole }
}) {
  const pathname = usePathname()
  const jornadaOnly =
    process.env.NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY === "true"

  function hrefFor(href: string, permission: Permission) {
    if (
      !jornadaOnly ||
      isJornadaOnlyAllowedPath(href) ||
      (permission === "admin:manage" &&
        hasPermission(user.role, "admin:manage"))
    ) {
      return href
    }
    return ""
  }

  function link(
    title: string,
    href: string,
    icon: React.ReactNode,
    permission: Permission,
  ) {
    if (!hasPermission(user.role, permission)) return null
    const url = hrefFor(href, permission)
    return {
      title,
      url,
      icon,
      blocked: url === "",
      isActive: pathname === href || pathname.startsWith(`${href}/`),
    }
  }

  function group(
    title: string,
    href: string,
    icon: React.ReactNode,
    permission: Permission,
    children: Array<{ title: string; href: string; exact?: boolean }>,
  ) {
    if (!hasPermission(user.role, permission)) return null
    const url = hrefFor(href, permission)
    return {
      title,
      url,
      icon,
      blocked: url === "",
      isActive: pathname === href || pathname.startsWith(`${href}/`),
      items: children.map((child) => {
        const childUrl = hrefFor(child.href, permission)
        return {
          title: child.title,
          url: childUrl,
          blocked: childUrl === "",
          isActive: childActive(pathname, child.href, child.exact),
        }
      }),
    }
  }

  const data = {
    user: {
      name: user.name,
      email: user.email,
      avatar: "",
      role: user.role,
    },
    navMain: [
      link("Tickets", "/gestec_help_desk/tickets", <TicketIcon />, "tickets:view"),
      link("Kanban", "/gestec_help_desk/kanban", <KanbanIcon />, "tickets:view"),
      link(
        "Minha Caixa",
        "/gestec_help_desk/minha-caixa",
        <InboxIcon />,
        "notifications:view",
      ),
      link(
        "Acompanhar",
        "/gestec_help_desk/solicitacoes",
        <CheckCircle2Icon />,
        "tickets:view",
      ),
      group("Jornada", "/gestec_help_desk/jornada", <ClockIcon />, "time:view", [
        { title: "Apontamentos", href: "/gestec_help_desk/jornada", exact: true },
        { title: "Painel", href: "/gestec_help_desk/jornada/painel" },
        { title: "Projetos", href: "/gestec_help_desk/jornada/projetos" },
        { title: "Equipe", href: "/gestec_help_desk/jornada/equipe" },
      ]),
      link(
        "Ativos de TI",
        "/gestec_help_desk/ativos",
        <MonitorIcon />,
        "assets:view",
      ),
      link(
        "Relatórios",
        "/gestec_help_desk/relatorios",
        <BarChart3Icon />,
        "reports:view",
      ),
      group(
        "Admin",
        "/gestec_help_desk/admin",
        <Settings2Icon />,
        "admin:manage",
        [
          { title: "Início", href: "/gestec_help_desk/admin", exact: true },
          { title: "Usuários", href: "/gestec_help_desk/admin/usuarios" },
          { title: "Tickets", href: "/gestec_help_desk/admin/tickets" },
          {
            title: "Apontamentos",
            href: "/gestec_help_desk/admin/apontamentos",
          },
          { title: "Projetos", href: "/gestec_help_desk/admin/projetos" },
          { title: "Metas", href: "/gestec_help_desk/admin/metas" },
          { title: "Grupos", href: "/gestec_help_desk/admin/grupos" },
          {
            title: "Centros de custo",
            href: "/gestec_help_desk/admin/centros-de-custo",
          },
          { title: "Serviços", href: "/gestec_help_desk/admin/servicos" },
          { title: "Ativos", href: "/gestec_help_desk/admin/ativos" },
          { title: "Timers", href: "/gestec_help_desk/admin/timers" },
          { title: "Auditoria", href: "/gestec_help_desk/admin/auditoria" },
        ],
      ),
    ].filter((item): item is NonNullable<typeof item> => item !== null),
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
              render={<a href="/gestec_help_desk/jornada" />}
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <TerminalIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">Gestec</span>
                <span className="truncate text-xs">Help Desk</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
