import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth";
import { spotifyPost } from "@/lib/spotify";

export async function POST() {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const ok = await spotifyPost(token, "/me/player/next");
  if (!ok) {
    return NextResponse.json(
      { error: "Skip failed (no active device, or not Premium)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ skipped: true });
}
