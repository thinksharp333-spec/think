import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '@/lib/supabase';
import { getBookRatingStats } from '@/lib/book-ratings';

const MAX_TASK_RETRIES = 3;

// IDs that must never be synced to Supabase
const GUEST_IDS = ['local-user', 'local-admin', 'local_user', 'undefined', 'null'];

type ErrorDetails = { code?: string; status?: number; message?: string };

function getErrorDetails(error: unknown): ErrorDetails {
    return error as ErrorDetails;
}

export function useSync() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    // Ref-based mutex prevents double-sync when state updates are batched
    const isSyncingRef = useRef(false);
    const syncQueueCount = useLiveQuery(() => db.syncQueue.count()) || 0;

    // attemptSync is stable via ref so event listeners never capture a stale copy
    const attemptSyncRef = useRef<(() => Promise<void>) | undefined>(undefined);

    const attemptSync = async () => {
        if (!navigator.onLine || isSyncingRef.current) return;

        isSyncingRef.current = true;
        setIsSyncing(true);
        try {
            const pendingTasks = await db.syncQueue.toArray();
            if (pendingTasks.length === 0) return;

            for (const task of pendingTasks) {
                // GAP-03: Drop tasks that have exceeded the retry budget
                if ((task.retryCount ?? 0) >= MAX_TASK_RETRIES) {
                    console.warn(`[Sync] Task ${task.id} (${task.type}) exceeded ${MAX_TASK_RETRIES} retries. Dropping.`);
                    if (task.id) await db.syncQueue.delete(task.id);
                    continue;
                }

                try {
                    const client = supabase;
                    if (!client) throw new Error("Supabase client not initialized");

                    if (!task.payload) {
                        console.warn(`[Sync] Task ${task.id} has no payload, deleting.`);
                        if (task.id) await db.syncQueue.delete(task.id);
                        continue;
                    }

                    if (task.type === 'READ_LOG') {
                        const userId = task.payload?.userId;
                        if (!userId || GUEST_IDS.includes(String(userId))) {
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        const { error } = await client
                            .from('reading_sessions')
                            .insert([{
                                user_id: task.payload?.userId,
                                book_id: String(task.payload?.bookId),
                                book_title: task.payload?.bookTitle || 'Unknown Book',
                                start_time: new Date(task.payload?.startTime).toISOString(),
                                end_time: new Date(task.payload?.endTime).toISOString(),
                                duration_seconds: task.payload?.duration || 0,
                                pages_read: task.payload?.pagesRead || 0,
                                points_earned: task.payload?.pointsEarned || 0,
                                completed: task.payload?.completed || false,
                            }]);

                        if (error) throw error;
                    }
                    else if (task.type === 'UPDATE_POINTS') {
                        const userId = task.payload?.userId;
                        if (!userId || GUEST_IDS.includes(String(userId))) {
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        // BUG-06 FIX: Use pointsDelta (additive) instead of totalPoints (absolute).
                        // Legacy tasks may still have totalPoints — handle both during transition.
                        if (task.payload?.pointsDelta !== undefined) {
                            const delta = task.payload.pointsDelta as number;

                            // Fetch current value from Supabase, then increment by delta.
                            // This is safe for sequential sync and avoids last-write-wins.
                            const { data: userData, error: fetchError } = await client
                                .from('users')
                                .select('"totalPoints"')
                                .eq('id', userId)
                                .single();

                            if (fetchError) throw fetchError;

                            const currentPoints = (userData as any)?.totalPoints ?? 0;
                            
                            const updateObj: any = { "totalPoints": currentPoints + delta };
                            if (task.payload?.streak !== undefined) {
                                updateObj.streak = task.payload.streak;
                                updateObj.last_points_date = task.payload.lastPointsDate;
                            }
                            
                            const { error } = await client
                                .from('users')
                                .update(updateObj)
                                .eq('id', userId);

                            if (error) throw error;
                        } else {
                            // Legacy absolute totalPoints path (backwards compat)
                            const totalPoints = task.payload?.totalPoints ?? 0;
                            const { error } = await client
                                .from('users')
                                .update({ "totalPoints": totalPoints })
                                .eq('id', userId);

                            if (error) throw error;
                        }
                    }
                    else if (task.type === 'SUBMIT_QUIZ') {
                        const { bookId, userId, score, totalQuestions, answers, completedAt, localAttemptId } = task.payload;

                        const sanitizedUserId = String(userId || 'guest-user');
                        if (GUEST_IDS.includes(sanitizedUserId)) {
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        const { error } = await client
                            .from('quiz_attempts')
                            .insert([{
                                book_id: String(bookId),
                                user_id: sanitizedUserId,
                                score,
                                total_questions: totalQuestions,
                                answers: answers || [],
                                completed_at: new Date(completedAt).toISOString(),
                            }]);


                        if (error) throw error;

                        // Mark local attempt as synced
                        if (localAttemptId) {
                            await db.quizAttempts.update(localAttemptId, { synced: 1 });
                        }
                    }
                    else if (task.type === 'SUBMIT_REVIEW') {
                        const { bookId, userId, rating, reviewText, originalReviewId } = task.payload;

                        const sanitizedUserId = String(userId || 'guest-user');

                        const bIdNum = Number(bookId);
                        if (isNaN(bIdNum)) {
                            console.error(`[Sync] CANNOT SYNC REVIEW: bookId is NaN`, { bookId, userId });
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        const { error } = await client

                            .from('book_reviews')
                            .upsert([{
                                book_id: bIdNum,
                                user_id: sanitizedUserId,
                                rating: rating,
                                review_text: reviewText || null
                            }], { onConflict: 'book_id,user_id' });

                        if (error) {
                            console.error(`[Sync] Review upsert failed:`, JSON.stringify(error, null, 2));
                            throw error;
                        }

                        const { data: syncedReviews, error: reviewsError } = await client
                            .from('book_reviews')
                            .select('user_id, rating, created_at')
                            .eq('book_id', bIdNum);

                        if (reviewsError) throw reviewsError;

                        const stats = getBookRatingStats(
                            (syncedReviews || []).map((review) => ({
                                userId: review.user_id,
                                rating: review.rating,
                                createdAt: new Date(review.created_at).getTime(),
                            }))
                        );

                        const { error: bookUpdateError } = await client
                            .from('books')
                            .update({
                                avg_rating: stats.averageRating,
                                review_count: stats.reviewCount,
                            })
                            .eq('id', bIdNum);

                        if (bookUpdateError) throw bookUpdateError;

                        await db.books.update(bIdNum, {
                            avgRating: stats.averageRating,
                            reviewCount: stats.reviewCount,
                        });

                        if (originalReviewId) {
                            await db.bookReviews.update(originalReviewId, { synced: 1 });
                        }
                    }
                    else if (task.type === 'BOOK_QUIZ') {
                        const { bookId, questions } = task.payload;
                        const { error } = await client
                            .from('books')
                            .update({ questions })
                            .eq('id', bookId);
                        if (error) throw error;
                    }

                    // Success — remove from queue
                    if (task.id) await db.syncQueue.delete(task.id);

                } catch (err: unknown) {
                    const error = getErrorDetails(err);
                    const errorCode = error?.code;

                    // Foreign key violation — missing user or book in Supabase. Drop permanently.
                    if (errorCode === '23503') {
                        const errorMsg = error?.message || "";
                        const missingType = errorMsg.includes('book_id') ? 'Book' : 'User';
                        const missingId = missingType === 'Book' ? task.payload?.bookId : task.payload?.userId;
                        console.warn(`[Sync] Permanent FK failure on task ${task.id}: Missing ${missingType} (${missingId}). Deleting.`);
                        if (task.id) await db.syncQueue.delete(task.id);
                        continue;
                    }

                    // Schema/table error — stop all sync until fixed server-side
                    const isPermanentError = ["PGRST204", "42P01"].includes(errorCode ?? "");

                    if (isPermanentError) {
                        console.error(`[Sync] CRITICAL: Database schema issue on task ${task.id}. Run 'NOTIFY pgrst, reload schema' in Supabase.`);
                        return;
                    }

                    // GAP-03 FIX: Transient error — increment retry count and continue.
                    // Don't block the rest of the queue for one failing task.
                    const newRetryCount = (task.retryCount ?? 0) + 1;
                    console.warn(`[Sync] Task ${task.id} (${task.type}) failed — attempt ${newRetryCount}/${MAX_TASK_RETRIES}.`, {
                        message: error?.message || String(err),
                        code: errorCode,
                    });
                    if (task.id) {
                        await db.syncQueue.update(task.id, { retryCount: newRetryCount } as any);
                    }
                    // Continue to next task instead of returning
                }
            }
        } catch (error) {
            console.error("[Sync] Sync failed:", error);
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    };

    attemptSyncRef.current = attemptSync;

    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            attemptSyncRef.current?.();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-sync whenever the queue grows while online
    useEffect(() => {
        if (syncQueueCount > 0 && isOnline && !isSyncingRef.current) {
            attemptSync();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncQueueCount, isOnline]);

    return { isOnline, isSyncing, syncQueueCount, attemptSync };
}
