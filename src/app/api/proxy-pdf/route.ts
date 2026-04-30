import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
        return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    try {
        let fetchUrl: string;
        const fetchHeaders: Record<string, string> = {};

        // If it looks like a full URL (Supabase storage, direct HTTPS, etc.) fetch it directly.
        // The proxy runs server-side so there are no CORS restrictions here.
        if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
            fetchUrl = fileId;
            // Add Supabase auth headers so storage requests work regardless of bucket policy
            if (fetchUrl.includes('.supabase.co/storage/')) {
                const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                if (anonKey) {
                    fetchHeaders['apikey'] = anonKey;
                    fetchHeaders['Authorization'] = `Bearer ${anonKey}`;
                }
            }
        } else {
            // Treat as a Google Drive file ID — use Drive API v3 with key for server-side access
            const apiKey = process.env.GOOGLE_DRIVE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
            if (apiKey) {
                fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
            } else {
                // Fall back to public share URL (works for "anyone with link" files)
                fetchUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            }
        }

        const response = await fetch(fetchUrl, {
            headers: fetchHeaders,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ProxyPDF] Fetch error (${response.status}) for: ${fetchUrl.slice(0, 80)}`, errorText.slice(0, 200));
            return NextResponse.json(
                { error: `Upstream responded with ${response.status}` },
                { status: response.status }
            );
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Cache-Control', 'public, max-age=31536000, immutable');

        return new NextResponse(blob, { status: 200, headers });

    } catch (error: any) {
        console.error('[ProxyPDF] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
