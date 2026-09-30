const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

function scoreText(query: string, text: string) {
  if (!text) return 0;
  if (text === query) return 500;
  if (text.startsWith(query)) return 400;
  if (text.split(/\s+/).some((part) => part.startsWith(query))) return 300;
  if (text.includes(query)) return 200;
  return 0;
}

export function rankProjectQuery(
  search: string,
  value: string,
  keywords: string[] = [],
) {
  const query = normalize(search);
  if (!query) return 1;
  const candidates = [
    value.replace(UUID_PATTERN, " "),
    ...keywords,
  ];
  return candidates.reduce(
    (best, candidate) => Math.max(best, scoreText(query, normalize(candidate))),
    0,
  );
}
