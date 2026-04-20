import { NextRequest, NextResponse } from "next/server";
import { calendarGetEvent, calendarUpdateEvent } from "@/lib/google/client";

// GET - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || undefined;
    const event = await calendarGetEvent(eventId, calendarId);
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || undefined;
    const body = await request.json();
    const event = await calendarUpdateEvent(eventId, body, calendarId);
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
