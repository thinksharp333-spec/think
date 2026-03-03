import { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '@/lib/supabase';

export function useSync() {
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

                    if (task.type === 'READ_LOG') {
                        const { error } = await supabase
                            .from('reading_sessions')
                            .insert([{
                                user_id: task.payload.userId,
                                book_id: task.payload.bookId,
                                start_time: new Date(task.payload.startTime).toISOString(),
                                end_time: new Date(task.payload.endTime).toISOString(),
                            }]);

                        if (error) throw error;
                    }
                    else if (task.type === 'UPDATE_POINTS') {
                        // Payload should contain { userId, points }
                        const { userId, totalPoints } = task.payload;
                        const { error } = await supabase
                            .from('users')
                            .update({ totalPoints })
                            .eq('id', userId);

                        if (error) throw error;
                    }

                    // Remove from queue on success
                    if (task.id) await db.syncQueue.delete(task.id);

                    console.log(`[Sync] Successfully synced task ${task.id}`);

                } catch (err) {
                    console.error(`[Sync] Failed to sync task ${task.id}`, err);
                    // Stop processing remaining queue if one fails, to preserve order
                    break;
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
