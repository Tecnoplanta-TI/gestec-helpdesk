import type { ReactNode } from "react";

import { JornadaSubnav } from "@/components/time/jornada-subnav";

export default function JornadaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <JornadaSubnav />
      {children}
    </div>
  );
}
