import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/auth";
import { spotifyGet } from "@/lib/spotify";

// Returns every track in the given album, paginated through Spotify's
// 50-per-page limit. Responses are normalized to match track search results.
export async function GET(_request, { params }) {
  const token = await getValidAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  // First fetch the album to get artist info and name (album tracks endpoint
  // doesn't include album metadata on each track).
  const album = await spotifyGet(token, `/albums/${id}`);
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const albumName = album.name;
  const albumArtist = album.artists.map((a) => a.name).join(", ");

  let tracks = [];
  let next = `/albums/${id}/tracks?limit=50&offset=0`;

  while (next) {
    // spotifyGet expects a path; accept either full URL or relative
    const path = next.startsWith("http")
      ? next.replace("https://api.spotify.com/v1", "")
      : next;
    const page = await spotifyGet(token, path);
    if (!page) break;

    for (const t of page.items) {
      tracks.push({
        id: t.id,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", ") || albumArtist,
        album: albumName,
      });
    }
    next = page.next; // null when there are no more pages
  }

  return NextResponse.json({ albumName, albumArtist, tracks });
}
