"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/gestec_help_desk/admin", label: "Início", exact: true },
  { href: "/gestec_help_desk/admin/usuarios", label: "Usuários" },
  { href: "/gestec_help_desk/admin/tickets", label: "Tickets" },
  { href: "/gestec_help_desk/admin/apontamentos", label: "Apontamentos" },
  { href: "/gestec_help_desk/admin/projetos", label: "Projetos" },
  {
    href: "/gestec_help_desk/admin/centros-de-custo",
    label: "Centros de custo",
  },
  { href: "/gestec_help_desk/admin/servicos", label: "Serviços" },
  { href: "/gestec_help_desk/admin/ativos", label: "Ativos" },
  { href: "/gestec_help_desk/admin/timers", label: "Timers" },
  { href: "/gestec_help_desk/admin/auditoria", label: "Auditoria" },
];

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Button
            key={item.href}
            size="sm"
            variant={active ? "default" : "outline"}
            render={<Link href={item.href} prefetch={true} />}
            className={cn(!active && "bg-background")}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
