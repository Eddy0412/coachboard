import { NextResponse } from "next/server";

const PLAYLIST_ID = "PLmnyPEJCdBSBpfRqz04l6KI7OsZxYqd9M";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

interface PlaylistItem {
  snippet: {
    title: string;
    description: string;
    resourceId: { videoId: string };
    thumbnails: {
      medium?: { url: string };
      high?: { url: string };
    };
    position: number;
  };
}

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    const videos: { id: string; title: string; thumbnail: string }[] = [];
    let nextPageToken = "";

    // Paginate through all playlist items
    do {
      const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
      url.searchParams.set("part", "snippet");
      url.searchParams.set("playlistId", PLAYLIST_ID);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", apiKey);
      if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

      const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: "YouTube API error", details: err },
          { status: res.status }
        );
      }

      const data = await res.json();
      for (const item of data.items as PlaylistItem[]) {
        const { title, resourceId, thumbnails } = item.snippet;
        // Skip deleted/private videos
        if (title === "Deleted video" || title === "Private video") continue;
        videos.push({
          id: resourceId.videoId,
          title,
          thumbnail:
            thumbnails.high?.url ||
            thumbnails.medium?.url ||
            `https://i.ytimg.com/vi/${resourceId.videoId}/hqdefault.jpg`,
        });
      }

      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch playlist" },
      { status: 500 }
    );
  }
}
