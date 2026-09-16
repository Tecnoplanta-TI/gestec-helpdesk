export async function register() {
  // Jornada is the only feature enabled for this release. Intentionally do
  // not import the Zeev worker here: instrumentation is bundled for more than
  // one runtime, and loading pg-boss would also pull Node-only database code
  // into the client build.
  return;
}
