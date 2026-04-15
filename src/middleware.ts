import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPA_URL = "https://rjiysvvlbgrwbkzzzfki.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqaXlzdnZsYmdyd2Jrenp6ZmtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNTM1NDEsImV4cCI6MjA5MTYyOTU0MX0.4ZmvXhk_zPFtA1X_TBfXV8LRaEGb-_AobuqyQoN6ikM";

type CookieItem = { name: string; value: string; options?: Record<string, unknown> };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieItem[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          );
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;
    if (user && pathname === "/auth") return NextResponse.redirect(new URL("/chat", request.url));
    if (!user && pathname.startsWith("/chat")) return NextResponse.redirect(new URL("/auth", request.url));
  } catch { /* pass through */ }
  return response;
}

export const config = { matcher: ["/auth", "/chat/:path*"] };
