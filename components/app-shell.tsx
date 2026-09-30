"use client"

import type { UserRole } from "@/lib/client-enums"

import { AppSidebar } from "@/components/app-sidebar"
import { HelpDeskBreadcrumb } from "@/components/help-desk-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name: string; email: string; role: UserRole }
}) {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" collapsible="icon" user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <HelpDeskBreadcrumb />
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
