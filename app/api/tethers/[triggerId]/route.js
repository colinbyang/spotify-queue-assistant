import { NextResponse } from "next/server";
import { removeTether } from "@/lib/store";

export async function DELETE(_request, { params }) {
  const { triggerId } = await params;
  return NextResponse.json(removeTether(triggerId));
}
