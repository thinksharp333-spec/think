
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

function getSessionUserId(): string | null {
    if (typeof document === "undefined") return null;

    const sessionCookie = document.cookie
        .split("; ")
        .find(cookie => cookie.startsWith("user_session="));

    if (!sessionCookie) return null;

    try {
        return decodeURIComponent(
            sessionCookie.substring("user_session=".length)
        );
    } catch {
        return null;
    }
}

export function useUser() {
    const users = useLiveQuery(() => db.users.toArray());
    const syncQueueCount = useLiveQuery(() => db.syncQueue.count()) ?? 0;

    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const prevSyncCount = useRef(syncQueueCount);
    const fetchedUserId = useRef<string | null>(null);

    // Read the custom login cookie and listen for login/logout changes.
    useEffect(() => {
        const updateSession = () => {
            const newSessionId = getSessionUserId();

            setSessionUserId(newSessionId);
            setAuthReady(true);

            if (fetchedUserId.current !== newSessionId) {
                fetchedUserId.current = null;
            }
        };

        updateSession();

        window.addEventListener("user-session-changed", updateSession);

        return () => {
            window.removeEventListener("user-session-changed", updateSession);
        };
    }, []);

    const userList = users ?? [];

    // Find only the user matching the active session cookie.
    const sessionUser = sessionUserId
        ? userList.find(user => user.id === sessionUserId)
        : undefined;

    // Use a guest/local profile when no valid session exists.
    const user = sessionUser
        || userList.find(user => user.id === "local-user")
        || userList.find(user => user.id === "local-admin")
        || undefined;

    const isLoggedIn = Boolean(
        authReady &&
        users !== undefined &&
        sessionUser
    );

    // Fetch the logged-in user's profile from Supabase.
    const fetchUserProfile = async (userId: string) => {
        try {
            if (!supabase || !navigator.onLine) return;

            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    console.warn("[User] Profile not found:", userId);
                    return;
                }

                throw error;
            }

            if (!data) return;

            await db.transaction("rw", db.users, async () => {
                const freshUser = await db.users.get(userId);

                if (!freshUser) return;

                await db.users.update(userId, {
                    name: data.name,
                    mobile: data.mobile,

                    totalPoints: Math.max(
                        data.totalPoints || 0,
                        freshUser.totalPoints || 0
                    ),

                    totalBooksRead: Math.max(
                        data.total_books_read || 0,
                        freshUser.totalBooksRead || 0
                    ),

                    ...(data.avatar_base_id && {
                        avatarBaseId: data.avatar_base_id
                    }),

                    ...(data.current_avatar_stage != null && {
                        currentAvatarStage: data.current_avatar_stage
                    }),

                    ...(data.current_avatar_url && {
                        currentAvatarUrl: data.current_avatar_url
                    })
                });
            });

        } catch (err: any) {
            console.error(
                "[User] Failed to fetch profile:",
                err.message || err
            );
        }
    };

    // Refresh profile when the sync queue becomes empty.
    useEffect(() => {
        const wasNonZero = prevSyncCount.current > 0;
        prevSyncCount.current = syncQueueCount;

        if (
            wasNonZero &&
            syncQueueCount === 0 &&
            navigator.onLine &&
            isLoggedIn &&
            sessionUserId
        ) {
            void fetchUserProfile(sessionUserId);
        }
    }, [syncQueueCount, isLoggedIn, sessionUserId]);

    // Fetch the logged-in user's profile once per active session.
    useEffect(() => {
        if (
            !authReady ||
            !isLoggedIn ||
            !sessionUserId ||
            !navigator.onLine ||
            fetchedUserId.current === sessionUserId
        ) {
            return;
        }

        fetchedUserId.current = sessionUserId;
        void fetchUserProfile(sessionUserId);

    }, [authReady, isLoggedIn, sessionUserId]);

    return {
        user,
        isLoggedIn,
        authReady
    };
}
