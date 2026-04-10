import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '@/lib/supabase';
import { getBookRatingStats } from '@/lib/book-ratings';

export function useSync() {
    const getErrorDetails = (error: unknown) => error as {
        code?: string;
        status?: number;
        message?: string;
    };

    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncQueueCount = useLiveQuery(() => db.syncQueue.count()) || 0;

    useEffect(() => {
        // Check initial status
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            attemptSync(); // Auto-sync when coming online
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-sync whenever the queue count increases
    useEffect(() => {
        if (syncQueueCount > 0 && isOnline && !isSyncing) {
            console.log(`[Sync] Queue changed (${syncQueueCount}), triggering auto-sync...`);
            attemptSync();
        }
    }, [syncQueueCount, isOnline]);

    const attemptSync = async () => {
        console.log(`[Sync] Attempting sync. Online: ${navigator.onLine}, Queue: ${syncQueueCount}, Syncing: ${isSyncing}`);
        if (!navigator.onLine || syncQueueCount === 0) return;

        setIsSyncing(true);
        try {
            const pendingTasks = await db.syncQueue.toArray();
            console.log(`[Sync] Found ${pendingTasks.length} pending tasks`);

            // Process tasks sequentially
            for (const task of pendingTasks) {
                console.log(`[Sync] Processing task ${task.id}`, task);
                try {
                    if (!supabase) throw new Error("Supabase client not initialized");

                    // CRITICAL: Ensure payload exists
                    if (!task.payload) {
                        console.warn(`[Sync] Task ${task.id} has no payload, deleting.`);
                        if (task.id) await db.syncQueue.delete(task.id);
                        continue;
                    }

                    if (task.type === 'READ_LOG') {
                        // Guest and Admin sessions cannot be synced to Supabase
                        const userId = task.payload?.userId;
                        const skipIds = ['local-user', 'local-admin', 'local_user', 'undefined', 'null'];
                        if (!userId || skipIds.includes(String(userId))) {
                            console.log(`[Sync] Skipping/Cleaning remote log for ${userId || 'unknown user'}`);
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        const { error } = await supabase
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
                            }]);

                        if (error) throw error;
                    }
                    else if (task.type === 'UPDATE_POINTS') {
                        const userId = task.payload?.userId;
                        const totalPoints = task.payload?.totalPoints ?? task.payload?.pointsEarned;

                        // Guest and Admin points cannot be synced to Supabase
                        const skipIds = ['local-user', 'local-admin', 'local_user', 'undefined', 'null'];
                        if (!userId || skipIds.includes(String(userId))) {
                            console.log(`[Sync] Skipping/Cleaning remote points update for ${userId || 'unknown user'}`);
                            if (task.id) await db.syncQueue.delete(task.id);
                            continue;
                        }

                        const { error } = await supabase
                            .from('users')
                            .update({ "totalPoints": totalPoints }) // Explicitly quoted for case sensitivity
                            .eq('id', userId);

                        if (error) throw error;
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

                        console.log(`[Sync] Attempting Review Sync:`, { book_id: bIdNum , user_id: sanitizedUserId, rating });
                        
                        // Upsert logic for distinct user reviews
                        const { data: upsertData, error } = await supabase
                            .from('book_reviews')
                            .upsert([{
                                book_id: bIdNum,
                                user_id: sanitizedUserId,
                                rating: rating,
                                review_text: reviewText || null
                            }], { onConflict: 'book_id,user_id' });

                        if (error) {
                            console.error(`[Sync] Review Upsert FAILED:`, JSON.stringify(error, null, 2));
                            throw error;
                        }
                        console.log(`[Sync] Review Upsert SUCCESS:`, upsertData);

                        const { data: syncedReviews, error: reviewsError } = await supabase
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

                        const { error: bookUpdateError } = await supabase
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

                    // Remove from queue on success
                    if (task.id) await db.syncQueue.delete(task.id);

                    console.log(`[Sync] Successfully synced task ${task.id}`);

                } catch (err: unknown) {
                    const error = getErrorDetails(err);
                    const errorCode = error?.code;

                    // Special Handling for Foreign Key Violations (23503)
                    // This happens if the User ID or Book ID doesn't exist in Supabase yet.
                    if (errorCode === '23503') {
                        const errorMsg = error?.message || "";
                        const missingType = errorMsg.includes('book_id') ? 'Book' : 'User';
                        const missingId = missingType === 'Book' ? task.payload?.bookId : task.payload?.userId;

                        console.warn(`[Sync] Permanent Failure (FK) on Task ${task.id}: Missing ${missingType} (${missingId}). Deleting.`);
                        if (task.id) await db.syncQueue.delete(task.id);
                        continue;
                    }

                    // If it's a "Table not found" or "Schema cache" error (PGRST205),
                    // or any other 4xx error (not 429), it might be a permanent configuration issue or it might resolve.
                    // However, we shouldn't discard the user's data (like reviews) if it's a server-side cache issue.
                    
                    const isPermanentError = ["PGRST204", "42P01"].includes(errorCode); // Table not found or missing
                    
                    if (isPermanentError) {
                        console.error(`[Sync] CRITICAL: Database schema issue. Task ${task.id} remains in queue. Run 'NOTIFY pgrst, reload schema' in Supabase.`);
                        setIsSyncing(false); // Stop sync loop
                        return; // STOP the entire sync process until fixed
                    }

                    const errorInfo = {
                        message: error?.message || String(err) || "Unknown error",
                        code: errorCode || "No code",
                        taskType: task.type,
                    };

                    console.error(`[Sync] Task ${task.id} Failed:`, errorInfo);

                    // If it's NOT a constraint error, we stop and wait for next attempt instead of deleting.
                    // This ensures we dont LOSE data like user reviews if the server is just down.
                    setIsSyncing(false);
                    return; // Exit the loop entirely to retry later
                }
            }
        } catch (error) {
            console.error("[Sync] Sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    return { isOnline, isSyncing, syncQueueCount, attemptSync };
}
