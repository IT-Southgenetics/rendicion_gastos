import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const PROTECTED_PREFIXES = ["/dashboard"];
const ADMIN_PREFIX = "/dashboard/admin";
const AUTH_PREFIXES = ["/login", "/register"];

function isPathInPrefixes(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));
}

export async function supabaseMiddleware(req: NextRequest) {
  const url = req.nextUrl;
  const res = NextResponse.next();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = url.pathname;

  const isAuthRoute = isPathInPrefixes(pathname, AUTH_PREFIXES);
  const isProtected = isPathInPrefixes(pathname, PROTECTED_PREFIXES);
  const isAdminRoute = pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);

  // Sin sesión: redirigir todo lo protegido a /login
  if (!session && isProtected) {
    const redirectUrl = new URL("/login", url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Con sesión: evitar visitar /login y /register
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", url));
  }

  // Verificación de rol para rutas admin
  if (session && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*"],
};

