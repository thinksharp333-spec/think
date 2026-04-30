import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch books with correctly-quoted camelCase columns
    const { data: books, error } = await supabase
        .from('books')
        .select('id, title, "fileId", "pdfUrl", pages')
        .order('id', { ascending: true })
        .limit(5); // Test first 5 only

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = [];

    for (const book of (books || [])) {
        const fileId = (book as any).fileId || (book as any).fileid || '';
        const pdfUrl = (book as any).pdfUrl || (book as any).pdfurl || '';

        let fetchUrl = '';
        if (fileId && !fileId.startsWith('http')) {
            fetchUrl = `https://docs.google.com/uc?export=download&id=${fileId}&key=${process.env.GOOGLE_DRIVE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY}`;
        } else if (fileId.startsWith('http')) {
            fetchUrl = fileId;
        } else if (pdfUrl) {
            fetchUrl = pdfUrl;
        }

        let status = 'no_url';
        let contentType = '';
        let size = 0;

        if (fetchUrl) {
            try {
                const r = await fetch(fetchUrl, { signal: AbortSignal.timeout(10000) });
                status = r.ok ? 'ok' : `http_${r.status}`;
                contentType = r.headers.get('content-type') || '';
                if (r.ok) {
                    const buf = await r.arrayBuffer();
                    size = buf.byteLength;
                }
            } catch (e: any) {
                status = `error: ${e.message}`;
            }
        }

        results.push({
            id: book.id,
            title: book.title,
            fileId: fileId || null,
            pdfUrl: pdfUrl ? pdfUrl.slice(0, 80) + '…' : null,
            fetchUrl: fetchUrl ? fetchUrl.slice(0, 80) + '…' : null,
            status,
            contentType,
            sizeKB: Math.round(size / 1024),
        });
    }

    return NextResponse.json({ results });
}
