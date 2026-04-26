import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const db = getAdminClient();

    const [usersRes, booksRes, reviewsRes, sessionsRes] = await Promise.all([
        db.from('users').select('id, name, "totalPoints", streak, last_points_date').order('"totalPoints"', { ascending: false }),
        db.from('books').select('id, title, "fileId", "coverUrl", avg_rating, review_count'),
        db.from('book_reviews').select('book_id, user_id, rating, created_at'),
        db.from('reading_sessions').select('user_id, book_id').eq('completed', true),
    ]);

    return NextResponse.json({
        users: usersRes.data || [],
        books: booksRes.data || [],
        reviews: reviewsRes.data || [],
        sessions: sessionsRes.data || [],
    });
}
