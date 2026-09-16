const allowedJornadaPaths = [
  "/gestec_help_desk/jornada",
  "/gestec_help_desk/relatorios",
  // Administração is protected by requirePagePermission("admin:manage").
  // It must remain reachable for the two configured administrators even when
  // the operational launch exposes only Jornada to regular users.
  "/gestec_help_desk/admin",
];

export function isJornadaOnlyModeEnabled() {
  return process.env.NEXT_PUBLIC_HELP_DESK_JORNADA_ONLY === "true";
}

export function isJornadaOnlyAllowedPath(pathname: string) {
  return allowedJornadaPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
