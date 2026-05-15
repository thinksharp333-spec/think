import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBookRatingStats } from '@/lib/book-ratings';

const getAdminClient = () =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        const db = getAdminClient();
        const { type, payload, userId: targetUserId } = await request.json();

        // Verify the caller owns the userId they're syncing for
        const sessionUserId = request.cookies.get('user_session')?.value;
        if (!sessionUserId || sessionUserId !== targetUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (type === 'READ_LOG') {
            // UPDATE_POINTS tasks are queued separately for incremental point deltas.
            // READ_LOG only logs the session record; it must NOT also update totalPoints
            // or the final batch gets counted twice (once by UPDATE_POINTS, once here).
            const startTimeIso = new Date(payload.startTime || Date.now()).toISOString();

            // Idempotency guard: skip if a session with the same user+book+start already
            // exists (handles network-retry duplicates where the server succeeded but the
            // client didn't receive the response and requeued the task).
            const { data: existing } = await db
                .from('reading_sessions')
                .select('id')
                .eq('user_id', targetUserId)
                .eq('book_id', String(payload.bookId))
                .eq('start_time', startTimeIso)
                .limit(1);
            if (existing && existing.length > 0) {
                // Already recorded — skip without error so the sync task is deleted.
            } else {
                const { error: sessionError } = await db.from('reading_sessions').insert({
                    user_id: targetUserId,
                    book_id: String(payload.bookId),
                    book_title: payload.bookTitle || 'Unknown Book',
                    duration_seconds: payload.duration || 0,
                    pages_read: payload.pagesRead || 0,
                    points_earned: payload.pointsEarned || 0,
                    completed: payload.completed || false,
                    start_time: startTimeIso,
                    end_time: new Date(payload.endTime || Date.now()).toISOString(),
                });
                if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });
            }

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
            updateObj['totalPoints'] = newTotal;
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

        } else if (type === 'UPDATE_BOOKS_READ') {
            // Max-merge: never let a stale client overwrite a higher server value
            const { data: currentData } = await db.from('users')
                .select('total_books_read')
                .eq('id', targetUserId)
                .single();
            const serverCount = (currentData as any)?.total_books_read ?? 0;
            const newCount = Math.max(serverCount, payload.totalBooksRead ?? 0);
            const { error } = await db.from('users')
                .update({ total_books_read: newCount })
                .eq('id', targetUserId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
