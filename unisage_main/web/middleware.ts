import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for token in cookies or localStorage isn't accessible in middleware
  // We rely on cookie-based auth check here
  const token = request.cookies.get("token")?.value;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  const isProtectedPage =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/subjects") ||
    request.nextUrl.pathname.startsWith("/content") ||
    request.nextUrl.pathname.startsWith("/progress") ||
    request.nextUrl.pathname.startsWith("/profile");

  // Note: Since we use localStorage for token storage (client-side),
  // the middleware won't have access to the token.
  // Auth protection is primarily handled client-side in the AuthProvider.
  // This middleware serves as an additional layer for cookie-based tokens.

  if (isProtectedPage && !token) {
    // Don't redirect here since we use localStorage on client side
    // Client-side auth hook handles redirects
    return NextResponse.next();
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/subjects/:path*",
    "/content/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/login",
    "/signup",
  ],
};
