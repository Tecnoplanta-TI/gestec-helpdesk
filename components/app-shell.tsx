"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/client-enums";
import {
  ChartBarLineIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ComputerIcon,
  DashboardSquare01Icon,
  InboxIcon,
  KanbanIcon,
  Ticket01Icon,
} from "@/lib/icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

const navigation: Array<{
  href: string;
  label: string;
  icon: typeof Ticket01Icon;
  permission: Permission;
  group: "Atendimento" | "Operação" | "Configurações";
}> = [
  {
    href: "/gestec_help_desk/tickets",
    label: "Tickets",
    icon: Ticket01Icon,
    permission: "tickets:view",
    group: "Atendimento",
  },
  {
    href: "/gestec_help_desk/kanban",
    label: "Kanban",
    icon: KanbanIcon,
    permission: "tickets:view",
    group: "Atendimento",
  },
  {
    href: "/gestec_help_desk/minha-caixa",
    label: "Minha Caixa",
    icon: InboxIcon,
    permission: "notifications:view",
    group: "Atendimento",
  },
  {
    href: "/gestec_help_desk/solicitacoes",
    label: "Acompanhar",
    icon: CheckmarkCircle02Icon,
    permission: "tickets:view",
    group: "Atendimento",
  },
  {
    href: "/gestec_help_desk/jornada",
    label: "Jornada",
    icon: Clock01Icon,
    permission: "time:view",
    group: "Operação",
  },
  {
    href: "/gestec_help_desk/ativos",
    label: "Ativos de TI",
    icon: ComputerIcon,
    permission: "assets:view",
    group: "Operação",
  },
  {
    href: "/gestec_help_desk/relatorios",
    label: "Relatórios",
    icon: ChartBarLineIcon,
    permission: "reports:view",
    group: "Operação",
  },
  {
    href: "/gestec_help_desk/admin",
    label: "Admin",
    icon: DashboardSquare01Icon,
    permission: "admin:manage",
    group: "Configurações",
  },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: UserRole };
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const visibleNavigation = navigation.filter((item) =>
    hasPermission(user.role, item.permission),
  );
  const groups = (["Atendimento", "Operação", "Configurações"] as const).filter(
    (group) => visibleNavigation.some((item) => item.group === group),
  );

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex h-12 items-center gap-3 px-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              G
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Gestec</p>
              <p className="truncate text-xs text-muted-foreground">
                Help Desk
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleNavigation
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          render={<Link href={item.href} prefetch={true} />}
                          isActive={
                            item.href === "/gestec_help_desk/tickets"
                              ? pathname === item.href ||
                                pathname.startsWith(`${item.href}/`)
                              : pathname.startsWith(item.href)
                          }
                          tooltip={item.label}
                        >
                          <>
                            <HugeiconsIcon icon={item.icon} strokeWidth={1.8} />
                            <span>{item.label}</span>
                          </>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 rounded-lg p-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-8">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm text-muted-foreground">
            Gestec / Help Desk
          </span>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
