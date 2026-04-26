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

                    // All sync tasks route through the server-side API (uses service role key, bypasses RLS)
                    const userId = task.payload?.userId;
                    if (task.type !== 'BOOK_QUIZ' && (!userId || GUEST_IDS.includes(String(userId)))) {
                        if (task.id) await db.syncQueue.delete(task.id);
                        continue;
                    }

                    const res = await fetch('/api/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: task.type, payload: task.payload, userId }),
                    });

                    if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body.error || `Sync API error ${res.status}`);
                    }

                    // Mark local attempt as synced for quiz/review tasks
                    if (task.type === 'SUBMIT_QUIZ' && task.payload?.localAttemptId) {
                        await db.quizAttempts.update(task.payload.localAttemptId, { synced: 1 });
                    }
                    if (task.type === 'SUBMIT_REVIEW' && task.payload?.originalReviewId) {
                        await db.bookReviews.update(task.payload.originalReviewId, { synced: 1 });
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
