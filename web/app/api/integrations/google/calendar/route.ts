import { NextRequest, NextResponse } from "next/server";
import { calendarListEvents, calendarCreateEvent } from "@/lib/google/client";

// GET - List calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get("calendarId") || undefined;
    const timeMin = searchParams.get("timeMin") || undefined;
    const timeMax = searchParams.get("timeMax") || undefined;
    const maxResults = searchParams.get("maxResults")
      ? Number(searchParams.get("maxResults"))
      : undefined;

    const events = await calendarListEvents({ calendarId, timeMin, timeMax, maxResults });
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await calendarCreateEvent(body);
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
