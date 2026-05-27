import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth";
import { spotifyGet } from "@/lib/spotify";

// /api/spotify/search?q=foo&type=track,album&limit=8
export async function GET(request) {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "track,album";
  const limit = Math.min(Number(searchParams.get("limit")) || 8, 20);

  if (!q) return NextResponse.json({ tracks: [], albums: [] });

  const params = new URLSearchParams({ q, type, limit: String(limit) });
  const data = await spotifyGet(token, `/search?${params.toString()}`);
  if (!data) {
    return NextResponse.json({ tracks: [], albums: [] });
  }

  const tracks =
    data.tracks?.items?.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists.map((a) => a.name).join(", "),
      album: t.album?.name,
      albumArt: t.album?.images?.[2]?.url ?? t.album?.images?.[0]?.url ?? null,
    })) ?? [];

  const albums =
    data.albums?.items?.map((a) => ({
      id: a.id,
      name: a.name,
      artist: a.artists.map((ar) => ar.name).join(", "),
      totalTracks: a.total_tracks,
      albumArt: a.images?.[2]?.url ?? a.images?.[0]?.url ?? null,
    })) ?? [];

  return NextResponse.json({ tracks, albums });
}
