import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth";
import { spotifyGet } from "@/lib/spotify";

export async function GET() {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json(
      { authenticated: false, playing: false },
      { status: 401 }
    );
  }

  const data = await spotifyGet(token, "/me/player/currently-playing");
  if (!data || !data.item) {
    return NextResponse.json({ authenticated: true, playing: false });
  }

  return NextResponse.json({
    authenticated: true,
    playing: data.is_playing ?? true,
    track: {
      id: data.item.id,
      name: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(", "),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url ?? null,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
    },
  });
}
