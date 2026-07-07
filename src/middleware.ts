import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
};

function applySecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  applySecurityHeaders(response);

  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const limit = checkRateLimit(`api:${ip}:${pathname}`, 120, 60_000);
    response.headers.set("X-RateLimit-Remaining", String(limit.remaining));

    if (!limit.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
    }
  }

  if (pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
