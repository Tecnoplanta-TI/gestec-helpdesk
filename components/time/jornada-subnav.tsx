"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const items = [
  { href: "/gestec_help_desk/jornada", label: "Apontamentos", exact: true },
  { href: "/gestec_help_desk/jornada/painel", label: "Painel" },
  { href: "/gestec_help_desk/jornada/projetos", label: "Projetos" },
  { href: "/gestec_help_desk/jornada/equipe", label: "Equipe" },
];

export function JornadaSubnav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Jornada" className="flex flex-wrap gap-2">
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
