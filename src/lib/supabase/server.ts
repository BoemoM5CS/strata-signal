import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rjiysvvlbgrwbkzzzfki.supabase.co";
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXlzdnZsYmdyd2Jrenp6ZmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTM1NDEsImV4cCI6MjA5MTYyOTU0MX0.4ZmvXhk_zPFtA1X_TBfXV8LRaEGb-_AobuqyQoN6ikM";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPA_URL, SUPA_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch { /* ok in server components */ }
      },
    },
  });
}
