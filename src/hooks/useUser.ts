import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function useUser() {
    // 1. Get all users
    const users = useLiveQuery(() => db.users.toArray()) || [];
    // Watch sync queue — when it drains to 0, points have been pushed to Supabase
    const syncQueueCount = useLiveQuery(() => db.syncQueue.count()) ?? 0;
    const prevSyncCount = useRef(syncQueueCount);

    // 2. Determine active user: 
    // - Priority 1: A user that is NOT local-user or local-admin (the real signed-in account)
    // - Priority 2: local-user (guest account)
    // - Priority 3: First available (fallback)
    const user = users.find(u => u.id !== 'local-user' && u.id !== 'local-admin')
        || users.find(u => u.id === 'local-user')
        || users[0];


    // Sync user profile from Supabase
    const fetchUserProfile = async (userId: string) => {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                // Supabase returns an error for "single" when no row is found
                if (error.code === 'PGRST116') {
                    console.warn("[User] Profile not found in cloud for ID:", userId);
                    return;
                }
                throw error;
            }
            if (data) {
                const localUser = await db.users.get(userId);
                const serverPoints    = data.totalPoints || 0;
                const localPoints     = localUser?.totalPoints || 0;
                const serverBooksRead = data.total_books_read || 0;
                const localBooksRead  = localUser?.totalBooksRead || 0;

                // Defensive update: keep the higher value to protect un-synced progress.
                await db.users.update(userId, {
                    name:               data.name,
                    mobile:             data.mobile,
                    totalPoints:        Math.max(serverPoints, localPoints),
                    totalBooksRead:     Math.max(serverBooksRead, localBooksRead),
                    // Avatar fields — always trust server as source of truth
                    ...(data.avatar_base_id       && { avatarBaseId:       data.avatar_base_id }),
                    ...(data.current_avatar_stage != null && { currentAvatarStage: data.current_avatar_stage }),
                    ...(data.current_avatar_url   && { currentAvatarUrl:   data.current_avatar_url }),
                });
            }
        } catch (err: any) {
            console.error("[User] Failed to fetch profile:", err.message || err);
        }
    };

    // Re-fetch user profile from Supabase when sync queue drains (points just synced)
    useEffect(() => {
        const wasNonZero = prevSyncCount.current > 0;
        prevSyncCount.current = syncQueueCount;
        if (wasNonZero && syncQueueCount === 0 && navigator.onLine) {
            const refresh = async () => {
                const all = await db.users.toArray();
                const current = all.find(u => u.id !== 'local-user' && u.id !== 'local-admin');
                if (current) fetchUserProfile(current.id);
            };
            refresh();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncQueueCount]);

    // Listen for Supabase Auth Changes
    useEffect(() => {
        if (!supabase) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // 1. Get current local user (usually 'local-user')
                const localUser = await db.users.get('local-user');

                if (localUser) {
                    // Update ID to match Supabase ID (Migration effectively)
                    await db.users.delete('local-user');
                    await db.users.add({
                        id: session.user.id,
                        name: session.user.user_metadata.full_name || localUser.name,
                        mobile: session.user.phone || localUser.mobile || '',
                        school: localUser.school || '',
                        totalPoints: localUser.totalPoints // Preserve local points
                    });
                } else {
                    // If no local-user, check if we already have THIS user
                    const existing = await db.users.get(session.user.id);
                    if (!existing) {
                        await db.users.add({
                            id: session.user.id,
                            name: session.user.user_metadata.full_name || 'Student',
                            mobile: session.user.phone || '',
                            school: '',
                            totalPoints: 0
                        });
                    }
                }
                // Fetch latest from server after sign-in/init
                fetchUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                await db.users.clear();
                // Re-create guest
                await db.users.add({
                    id: 'local-user',
                    name: 'Student',
                    mobile: '',
                    school: '',
                    totalPoints: 0
                });
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Initialize default user if none exists (Guest Mode)
    useEffect(() => {
        const initUser = async () => {
            const count = await db.users.count();
            if (count === 0) {
                await db.users.add({
                    id: 'local-user',
                    name: 'Student',
                    mobile: '',
                    school: '',
                    totalPoints: 0
                });
            } else {
                // If we have a user, and it's not local-user, try to sync it
                const all = await db.users.toArray();
                const current = all.find(u => u.id !== 'local-user' && u.id !== 'local-admin');
                if (current && navigator.onLine) {
                    fetchUserProfile(current.id);
                }
            }
        };
        initUser();
    }, []);

    return { user };
}
