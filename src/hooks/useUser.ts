import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useUser() {
    const users = useLiveQuery(() => db.users.toArray());
    // Try to find 'local-user' first, otherwise take the first available
    const user = users?.find(u => u.id === 'local-user') || users?.[0];

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
                            mobile: session.user.phone || '', // Mobile is required in schema
                            totalPoints: 0 // Will sync from server later
                        });
                    }
                }
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
            }
        };
        initUser();
    }, []);

    return { user };
}
