import { NextResponse } from "next/server";
import { removeBlocked } from "@/lib/store";

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const updated = removeBlocked(id);
  return NextResponse.json(updated);
}
