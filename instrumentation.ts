export async function register() {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  // pg-boss is initialized from the authenticated module layout. Keeping it
  // outside this graph avoids bundling `pg` for the Edge instrumentation build.
}
