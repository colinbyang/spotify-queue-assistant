import { NextResponse } from "next/server";
import { stopSession } from "@/lib/session";

export async function POST() {
  stopSession();
  return NextResponse.json({ active: false });
}
