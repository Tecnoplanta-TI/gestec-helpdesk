import { redirect } from "next/navigation";

export default async function MyTimeRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  const raw = await searchParams;
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  const query = params.toString();
  redirect(
    query ? `/gestec_help_desk/jornada?${query}` : "/gestec_help_desk/jornada",
  );
}
