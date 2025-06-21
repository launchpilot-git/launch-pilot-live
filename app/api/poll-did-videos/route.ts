import { NextResponse } from "next/server";
import { pollPendingDIDVideos } from "@/lib/poll-did-videos";

// This endpoint can be called manually or via a cron job
export async function GET() {
  try {
    const result = await pollPendingDIDVideos();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in poll-did-videos endpoint:", error);
    return NextResponse.json(
      { error: "Failed to poll DID videos", details: error.message },
      { status: 500 }
    );
  }
}
