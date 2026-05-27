import { NextResponse } from "next/server";
import { isSessionActive } from "@/lib/session";

export async function GET() {
  return NextResponse.json({ active: isSessionActive() });
}
