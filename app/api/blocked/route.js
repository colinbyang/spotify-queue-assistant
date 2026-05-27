import { NextResponse } from "next/server";
import { getBlocked, addBlocked, clearBlocked } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getBlocked());
}

export async function DELETE() {
  return NextResponse.json(clearBlocked());
}

export async function POST(request) {
  const body = await request.json();

  // Bulk add (e.g. all tracks of an album)
  if (Array.isArray(body.tracks)) {
    let updated = getBlocked();
    for (const t of body.tracks) {
      if (!t?.id) continue;
      updated = addBlocked({
        id: t.id,
        name: t.name ?? "Unknown",
        artist: t.artist ?? "Unknown",
      });
    }
    return NextResponse.json(updated);
  }

  // Single add
  if (!body.id) {
    return NextResponse.json({ error: "Track id required" }, { status: 400 });
  }
  const updated = addBlocked({
    id: body.id,
    name: body.name ?? "Unknown",
    artist: body.artist ?? "Unknown",
  });
  return NextResponse.json(updated);
}
