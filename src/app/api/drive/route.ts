import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ error: "Google Drive API key not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "contents") {
        const folderId = searchParams.get("folderId");
        if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 });

        const url = new URL("https://www.googleapis.com/drive/v3/files");
        url.searchParams.append("q", `'${folderId}' in parents and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.folder' or mimeType = 'application/vnd.google-apps.shortcut' or mimeType = 'image/jpeg' or mimeType = 'image/png') and trashed = false`);
        url.searchParams.append("fields", "files(id, name, mimeType, shortcutDetails)");
        url.searchParams.append("pageSize", "1000");
        url.searchParams.append("key", API_KEY);
        url.searchParams.append("supportsAllDrives", "true");
        url.searchParams.append("includeItemsFromAllDrives", "true");

        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json({ error: errorData.error?.message || `Drive API error ${response.status}` }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json(data.files || []);
    }

    if (type === "item") {
        const fileId = searchParams.get("fileId");
        if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });

        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType&key=${API_KEY}&supportsAllDrives=true`;
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const status = response.status;
            const msg = status === 404
                ? `File not found (${fileId}). Ensure folder is shared as 'Anyone with the link can view'.`
                : errorData.error?.message || `Drive API error ${status}`;
            return NextResponse.json({ error: msg }, { status });
        }
        return NextResponse.json(await response.json());
    }

    return NextResponse.json({ error: "type must be 'contents' or 'item'" }, { status: 400 });
}
