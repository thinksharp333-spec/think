import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key);
};

// keep legacy reference name so the rest of the file compiles unchanged
const supabase = getAdminClient();

// Type definition for the Sync Task payload
type SyncPayload = {
    type: 'UPDATE_POINTS' | 'READ_LOG';
    payload: any;
    id?: number; // IndexedDB ID
    userId?: string; // Injected by useSync
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, payload, userId } = body as SyncPayload;

        // Use the ID sent by client, or fallback (should not happen with updated useSync)
        const targetUserId = userId || 'local-user';

        console.log(`[API] Received sync task: ${type} for user: ${targetUserId}`, payload);

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        // Common Helper: Ensure User Exists
        const { data: userData } = await supabase!
            .from('users')
            .select('totalPoints, name')
            .eq('id', targetUserId)
            .single();

        let currentPoints = userData?.totalPoints || 0;

        // If user doesn't exist remotely yet
        if (!userData) {
            const { error: createError } = await supabase!.from('users').insert({
                id: targetUserId,
                name: 'Student', // Default
                totalPoints: 0,
                mobile: '',
                school: ''
            });
            if (createError) console.error("Error creating user stub:", createError);
        }

        if (type === 'READ_LOG') {
            // Update Points
            const newTotal = currentPoints + (payload.pointsEarned || 0);

            const { error: userError } = await supabase!
                .from('users')
                .update({
                    totalPoints: newTotal,
                    // Preserve existing name if possible, else default
                    name: userData?.name || 'Student'
                })
                .eq('id', targetUserId);

            if (userError) {
                console.error('[API] Error updating user:', userError);
                return NextResponse.json({ error: userError.message }, { status: 500 });
            }

            // Insert Reading Session
            const { error: sessionError } = await (supabase! as any)
                .from('reading_sessions')
                .insert({
                    user_id: targetUserId,
                    book_id: payload.bookId,
                    book_title: payload.bookTitle || 'Unknown Book',
                    duration_seconds: payload.duration || 0,
                    pages_read: payload.pagesRead || 0,
                    start_time: new Date(payload.startTime || (Date.now() - (payload.duration * 1000))).toISOString(),
                    end_time: new Date(payload.endTime || Date.now()).toISOString()
                });

            if (sessionError) {
                console.error('[API] Error saving session:', sessionError);
                return NextResponse.json({ error: sessionError.message }, { status: 500 });
            }

        } else if (type === 'UPDATE_POINTS') {
            // Merging local points to cloud
            const pointsToAdd = payload.pointsEarned || 0; // if merging strictly, or we might be sending totalPoints directly. Wait, payload sends totalPoints

            // The payload currently sends `totalPoints` and `booksRead`. It's not a delta.
            const newTotal = payload.totalPoints !== undefined ? payload.totalPoints : (currentPoints + pointsToAdd);

            const updatePayload: any = { total_points: newTotal };
            if (payload.booksRead !== undefined) {
                updatePayload.books_read = payload.booksRead;
            }

            const { error: updateError } = await supabase!
                .from('users')
                .update(updatePayload)
                .eq('id', targetUserId);

            if (updateError) {
                console.error('[API] Error merging points:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[API] Sync failed:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
