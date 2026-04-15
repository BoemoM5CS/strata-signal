import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/chat");
    else redirect("/auth");
  } catch {
    redirect("/auth");
  }
}
