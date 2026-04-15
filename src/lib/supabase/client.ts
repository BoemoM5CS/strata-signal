import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rjiysvvlbgrwbkzzzfki.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXlzdnZsYmdyd2Jrenp6ZmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTM1NDEsImV4cCI6MjA5MTYyOTU0MX0.4ZmvXhk_zPFtA1X_TBfXV8LRaEGb-_AobuqyQoN6ikM";

export const createClient = () => createBrowserClient(URL, KEY);
