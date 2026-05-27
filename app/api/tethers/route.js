import { NextResponse } from "next/server";
import { getTethers, addTether, clearTethers } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getTethers());
}

export async function POST(request) {
  const body = await request.json();
  const { triggerId, triggerName, triggerArtist, followId, followName, followArtist } = body;

  if (!triggerId || !followId) {
    return NextResponse.json(
      { error: "Both triggerId and followId are required" },
      { status: 400 }
    );
  }
  if (triggerId === followId) {
    return NextResponse.json(
      { error: "A song can't tether to itself" },
      { status: 400 }
    );
  }

  const updated = addTether({
    triggerId,
    triggerName: triggerName ?? "Unknown",
    triggerArtist: triggerArtist ?? "Unknown",
    followId,
    followName: followName ?? "Unknown",
    followArtist: followArtist ?? "Unknown",
  });
  return NextResponse.json(updated);
}

export async function DELETE() {
  return NextResponse.json(clearTethers());
}
