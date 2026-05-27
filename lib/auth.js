// Read tokens from cookies and refresh them if expired.
// Called by any API route that needs to talk to Spotify.

import { cookies } from "next/headers";
import { refreshAccessToken } from "./spotify.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

/**
 * Save tokens into HTTP-only cookies after login or refresh.
 */
export async function setAuthCookies({ access_token, refresh_token, expires_in }) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + expires_in * 1000;

  cookieStore.set("sp_access_token", access_token, {
    ...COOKIE_OPTIONS,
    maxAge: expires_in,
  });
  cookieStore.set("sp_expires_at", String(expiresAt), {
    ...COOKIE_OPTIONS,
    maxAge: expires_in,
  });
  if (refresh_token) {
    cookieStore.set("sp_refresh_token", refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

/**
 * Clear all auth cookies.
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete("sp_access_token");
  cookieStore.delete("sp_refresh_token");
  cookieStore.delete("sp_expires_at");
}

/**
 * Returns a valid access token, refreshing if needed.
 * Returns null if the user is not authenticated.
 */
export async function getValidAccessToken() {
  const cookieStore = await cookies();
  const access = cookieStore.get("sp_access_token")?.value;
  const refresh = cookieStore.get("sp_refresh_token")?.value;
  const expiresAt = Number(cookieStore.get("sp_expires_at")?.value || 0);

  // Still valid (with 60s buffer)
  if (access && Date.now() < expiresAt - 60_000) {
    return access;
  }

  // Need to refresh
  if (!refresh) return null;

  try {
    const data = await refreshAccessToken(refresh);
    await setAuthCookies({
      access_token: data.access_token,
      refresh_token: data.refresh_token, // may be undefined; setAuthCookies handles that
      expires_in: data.expires_in,
    });
    return data.access_token;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sp_refresh_token")?.value;
}
