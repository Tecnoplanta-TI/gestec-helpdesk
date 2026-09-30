const root = globalThis as typeof globalThis & { global?: typeof globalThis };

if (root.global == null) {
  root.global = root;
}
