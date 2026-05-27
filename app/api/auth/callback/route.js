import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/spotify";
import { consumeOAuthState } from "@/lib/store";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Step 2: Spotify redirects the user back here with `code` and `state`.
// We verify state, exchange the code for tokens, and store the tokens
// in HTTP-only cookies.
//
// IMPORTANT: We use a 200 HTML response with a JS redirect, NOT a 307,
// because Set-Cookie headers don't reliably stick across redirects in
// Next.js 15's dev server. A normal 200 response with cookies works
// every time, and the meta-refresh + JS fallback navigates afterward.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return htmlRedirect(`/?error=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return htmlRedirect("/?error=missing_params");
  }

  if (!consumeOAuthState(state)) {
    console.warn("[auth/callback] state not found or expired:", state);
    return htmlRedirect("/?error=state_mismatch");
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error(err);
    return htmlRedirect("/?error=token_exchange_failed");
  }

  console.log("[auth/callback] tokens received, setting cookies");

  const response = htmlRedirect("/");

  response.cookies.set("sp_access_token", tokens.access_token, {
    ...COOKIE_OPTS,
    maxAge: tokens.expires_in,
  });
  response.cookies.set(
    "sp_expires_at",
    String(Date.now() + tokens.expires_in * 1000),
    { ...COOKIE_OPTS, maxAge: tokens.expires_in }
  );
  response.cookies.set("sp_refresh_token", tokens.refresh_token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

function htmlRedirect(path) {
  // Tiny HTML page that immediately navigates client-side.
  // Returning HTML (not a 307) lets Set-Cookie headers stick reliably.
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Redirecting...</title>
<meta http-equiv="refresh" content="0;url=${path}">
</head><body>
<script>window.location.replace(${JSON.stringify(path)});</script>
<p>Redirecting...</p>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
