import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useUser() {
    // 1. Get all users
    const users = useLiveQuery(() => db.users.toArray()) || [];

    // 2. Determine active user: 
    // - Priority 1: A user that is NOT local-user or local-admin (the real signed-in account)
    // - Priority 2: local-user (guest account)
    // - Priority 3: First available (fallback)
    const user = users.find(u => u.id !== 'local-user' && u.id !== 'local-admin')
        || users.find(u => u.id === 'local-user')
        || users[0];

    useEffect(() => {
        if (user) {
            console.log(`[useUser] Reactive update: ${user.name} now has ${user.totalPoints} pts`);
        }
    }, [user?.totalPoints, user?.id]);

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
                console.log("[User] Syncing profile from server:", data);

                const localUser = await db.users.get(userId);
                const serverPoints = data.totalPoints || 0;
                const localPoints = localUser?.totalPoints || 0;

                // Defensive update: Only overwrite points if server has MORE. 
                // This prevents local un-synced progress from being lost.
                await db.users.update(userId, {
                    name: data.name,
                    mobile: data.mobile,
                    totalPoints: Math.max(serverPoints, localPoints)
                });
            }
        } catch (err: any) {
            console.error("[User] Failed to fetch profile:", err.message || err);
        }
    };

    // Listen for Supabase Auth Changes
    useEffect(() => {
        if (!supabase) return;

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                console.log("[Auth] User Signed In:", session.user.id);

                // 1. Get current local user (usually 'local-user')
                const localUser = await db.users.get('local-user');

                if (localUser) {
                    // Update ID to match Supabase ID (Migration effectively)
                    await db.users.delete('local-user');
                    await db.users.add({
                        id: session.user.id,
                        name: session.user.user_metadata.full_name || localUser.name,
                        mobile: session.user.phone || localUser.mobile || '',
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
                            totalPoints: 0
                        });
                    }
                }
                // Fetch latest from server after sign-in/init
                fetchUserProfile(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                console.log("[Auth] User Signed Out");
                await db.users.clear();
                // Re-create guest
                await db.users.add({
                    id: 'local-user',
                    name: 'Student',
                    mobile: '',
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
                console.log("[User] Creating default local user");
                await db.users.add({
                    id: 'local-user',
                    name: 'Student',
                    mobile: '',
                    totalPoints: 0
                });
            } else {
                // If we have a user, and it's not local-user, try to sync it
                const all = await db.users.toArray();
                const current = all.find(u => u.id !== 'local-user');
                if (current && navigator.onLine) {
                    fetchUserProfile(current.id);
                }
            }
        };
        initUser();
    }, []);

    return { user };
}
