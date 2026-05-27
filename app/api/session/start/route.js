import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { startSession } from "@/lib/session";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("sp_access_token")?.value;
  const refreshToken = cookieStore.get("sp_refresh_token")?.value;
  const expiresAt = Number(cookieStore.get("sp_expires_at")?.value || 0);

  if (!refreshToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  startSession({ accessToken, refreshToken, expiresAt });
  return NextResponse.json({ active: true });
}
