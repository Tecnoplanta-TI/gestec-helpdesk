import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

export function HugeiconsIcon({
  icon: Icon,
  strokeWidth,
  ...props
}: {
  icon: LucideIcon;
  strokeWidth?: number;
} & Omit<ComponentProps<LucideIcon>, "strokeWidth">) {
  return <Icon strokeWidth={strokeWidth} {...props} />;
}
