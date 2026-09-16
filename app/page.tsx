import { redirect } from "next/navigation";

import { getGestecSession } from "@/lib/auth/session";
import { ApiError } from "@/lib/http/api-error";

export default async function Page() {
  try {
    await getGestecSession();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
  redirect("/gestec_help_desk/jornada");
}
