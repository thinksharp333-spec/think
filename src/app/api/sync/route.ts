import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBookRatingStats } from '@/lib/book-ratings';

const getAdminClient = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: Request) {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        const db = getAdminClient();
        const { type, payload, userId: targetUserId } = await request.json();

        if (type === 'READ_LOG') {
            const { data: userData } = await db.from('users').select('"totalPoints", name').eq('id', targetUserId).single();
            const currentPoints = (userData as any)?.totalPoints ?? 0;
            const newTotal = currentPoints + (payload.pointsEarned || 0);

            await db.from('users').update({ '"totalPoints"': newTotal }).eq('id', targetUserId);

            const { error: sessionError } = await db.from('reading_sessions').insert({
                user_id: targetUserId,
                book_id: String(payload.bookId),
                book_title: payload.bookTitle || 'Unknown Book',
                duration_seconds: payload.duration || 0,
                pages_read: payload.pagesRead || 0,
                points_earned: payload.pointsEarned || 0,
                completed: payload.completed || false,
                start_time: new Date(payload.startTime || Date.now()).toISOString(),
                end_time: new Date(payload.endTime || Date.now()).toISOString(),
            });
            if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

        } else if (type === 'UPDATE_POINTS') {
            const { data: userData } = await db.from('users').select('"totalPoints"').eq('id', targetUserId).single();
            const currentPoints = (userData as any)?.totalPoints ?? 0;

            let newTotal: number;
            const updateObj: any = {};

            if (payload.pointsDelta !== undefined) {
                newTotal = currentPoints + payload.pointsDelta;
            } else {
                newTotal = payload.totalPoints ?? currentPoints;
            }
            updateObj['"totalPoints"'] = newTotal;
            if (payload.streak !== undefined) {
                updateObj.streak = payload.streak;
                updateObj.last_points_date = payload.lastPointsDate;
            }

            const { error } = await db.from('users').update(updateObj).eq('id', targetUserId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        } else if (type === 'SUBMIT_QUIZ') {
            const { bookId, score, totalQuestions, answers, completedAt } = payload;
            const { error } = await db.from('quiz_attempts').insert([{
                book_id: String(bookId),
                user_id: targetUserId,
                score,
                total_questions: totalQuestions,
                answers: answers || [],
                completed_at: new Date(completedAt).toISOString(),
            }]);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        } else if (type === 'SUBMIT_REVIEW') {
            const { bookId, rating, reviewText } = payload;
            const bIdNum = Number(bookId);
            if (isNaN(bIdNum)) return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });

            const { error: upsertError } = await db.from('book_reviews').upsert([{
                book_id: bIdNum,
                user_id: targetUserId,
                rating,
                review_text: reviewText || null,
            }], { onConflict: 'book_id,user_id' });
            if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });

            const { data: syncedReviews } = await db.from('book_reviews')
                .select('user_id, rating, created_at').eq('book_id', bIdNum);

            const stats = getBookRatingStats(
                (syncedReviews || []).map((r: any) => ({
                    userId: r.user_id, rating: r.rating, createdAt: new Date(r.created_at).getTime(),
                }))
            );
            await db.from('books').update({ avg_rating: stats.averageRating, review_count: stats.reviewCount }).eq('id', bIdNum);

        } else if (type === 'BOOK_QUIZ') {
            const { bookId, questions } = payload;
            const { error } = await db.from('books').update({ questions }).eq('id', bookId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[API/sync] failed:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
