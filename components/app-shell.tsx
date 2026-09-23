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
  AccountSetting01Icon,
  ArrowDown01Icon,
  InboxIcon,
  KanbanIcon,
  Logout01Icon,
  Notification01Icon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { isJornadaOnlyModeEnabled } from "@/lib/features/jornada-only";

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

const jornadaOnlyAvailableRoutes = new Set([
  "/gestec_help_desk/jornada",
  "/gestec_help_desk/relatorios",
]);

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: UserRole };
}) {
  const pathname = usePathname();
  const jornadaOnlyMode = isJornadaOnlyModeEnabled();
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
                    .map((item) => {
                      const available =
                        !jornadaOnlyMode ||
                        jornadaOnlyAvailableRoutes.has(item.href) ||
                        (item.permission === "admin:manage" &&
                          hasPermission(user.role, "admin:manage"));

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            render={
                              available ? (
                                <Link href={item.href} prefetch={true} />
                              ) : (
                                <span />
                              )
                            }
                            aria-disabled={!available || undefined}
                            isActive={
                              available &&
                              (item.href === "/gestec_help_desk/tickets"
                                ? pathname === item.href ||
                                  pathname.startsWith(`${item.href}/`)
                                : pathname.startsWith(item.href))
                            }
                            tooltip={
                              available
                                ? item.label
                                : `${item.label} — indisponível nesta fase`
                            }
                            className={
                              available
                                ? undefined
                                : "cursor-not-allowed text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
                            }
                          >
                            <HugeiconsIcon icon={item.icon} strokeWidth={1.8} />
                            <span
                              className={available ? undefined : "line-through"}
                            >
                              {item.label}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuButton size="lg" tooltip="Conta" />}
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="ml-auto group-data-[collapsible=icon]:hidden"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {user.name}
                          </p>
                          <p className="truncate text-xs font-normal">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      render={<Link href="/gestec_help_desk/minha-caixa" />}
                    >
                      <HugeiconsIcon icon={Notification01Icon} />
                      Notificações
                    </DropdownMenuItem>
                    {hasPermission(user.role, "admin:manage") ? (
                      <DropdownMenuItem
                        render={<Link href="/gestec_help_desk/admin" />}
                      >
                        <HugeiconsIcon icon={AccountSetting01Icon} />
                        Administração
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <form action="/auth/sign-out" method="post">
                      <DropdownMenuItem
                        render={<button type="submit" />}
                        variant="destructive"
                      >
                        <HugeiconsIcon icon={Logout01Icon} />
                        Sair da conta
                      </DropdownMenuItem>
                    </form>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
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
