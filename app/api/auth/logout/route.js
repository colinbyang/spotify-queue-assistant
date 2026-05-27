import { NextResponse } from "next/server";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

// Set each cookie to empty with maxAge: 0 to delete it.
// Setting cookies on a NextResponse.json() body is reliable across browsers,
// unlike cookies().delete() which can stage but not always emit headers.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of [
    "sp_access_token",
    "sp_refresh_token",
    "sp_expires_at",
    "sp_oauth_state",
  ]) {
    response.cookies.set(name, "", { ...COOKIE_OPTS, maxAge: 0 });
  }
  return response;
}
