import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/auth/callback", "/api/health", "/manifest.webmanifest"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/legal/") || pathname.startsWith("/pwa-icon/")) return true;
  return false;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (isPublicPath(request.nextUrl.pathname)) return supabaseResponse;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname) || pathname.startsWith("/api/")) return supabaseResponse;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    const next = `${pathname}${search}`;
    if (next && next !== "/login") login.searchParams.set("next", next);
    else login.search = "";
    return NextResponse.redirect(login);
  }

  const { data: profile } = await supabase.from("profiles").select("onboarding_done").eq("id", user.id).maybeSingle();
  const onboardingDone = Boolean(profile?.onboarding_done);

  if (pathname === "/login" || pathname === "/signup" || (onboardingDone && pathname.startsWith("/onboarding"))) {
    const dest = request.nextUrl.clone();
    dest.pathname = onboardingDone ? "/dashboard" : "/onboarding";
    dest.search = "";
    const redirect = NextResponse.redirect(dest);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (!onboardingDone && !pathname.startsWith("/onboarding") && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/onboarding";
    dest.search = "";
    const redirect = NextResponse.redirect(dest);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}
