"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: React.ReactNode
    isActive?: boolean
    blocked?: boolean
    items?: {
      title: string
      url: string
      isActive?: boolean
      blocked?: boolean
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            defaultOpen={item.isActive}
            render={<SidebarMenuItem />}
          >
            <SidebarMenuButton
              tooltip={
                item.blocked
                  ? `${item.title} — indisponível nesta fase`
                  : item.title
              }
              aria-disabled={item.blocked || undefined}
              className={
                item.blocked
                  ? "cursor-not-allowed text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
                  : undefined
              }
              render={
                item.blocked || !item.url ? <span /> : <a href={item.url} />
              }
            >
              {item.icon}
              <span className={item.blocked ? "line-through" : undefined}>
                {item.title}
              </span>
            </SidebarMenuButton>
            {item.items?.length ? (
              <>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuAction className="aria-expanded:rotate-90" />
                  }
                >
                  <ChevronRightIcon
                  />
                  <span className="sr-only">Toggle</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          isActive={subItem.isActive}
                          aria-disabled={subItem.blocked || undefined}
                          className={
                            subItem.blocked
                              ? "cursor-not-allowed text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
                              : undefined
                          }
                          render={
                            subItem.blocked || !subItem.url ? (
                              <span />
                            ) : (
                              <a href={subItem.url} />
                            )
                          }
                        >
                          <span className={subItem.blocked ? "line-through" : undefined}>
                            {subItem.title}
                          </span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </>
            ) : null}
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
