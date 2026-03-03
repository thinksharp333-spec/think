import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

        if (!supabase) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        // Common Helper: Ensure User Exists
        const { data: userData } = await supabase
            .from('users')
            .select('total_points, name')
            .eq('id', targetUserId)
            .single();

        let currentPoints = userData?.total_points || 0;

        // If user doesn't exist remotely yet
        if (!userData) {
            const { error: createError } = await supabase.from('users').insert({
                id: targetUserId,
                name: 'Student', // Default
                total_points: 0
            });
            if (createError) console.error("Error creating user stub:", createError);
        }

        if (type === 'READ_LOG') {
            // Update Points
            const newTotal = currentPoints + payload.pointsEarned;

            const { error: userError } = await supabase
                .from('users')
                .upsert({
                    id: targetUserId,
                    total_points: newTotal,
                    // Preserve existing name if possible, else default
                    name: userData?.name || 'Student'
                });

            if (userError) {
                console.error('[API] Error updating user:', userError);
                return NextResponse.json({ error: userError.message }, { status: 500 });
            }

            // Insert Reading Session
            const { error: sessionError } = await (supabase as any)
                .from('reading_sessions')
                .insert({
                    user_id: targetUserId,
                    book_id: payload.bookId,
                    duration: payload.duration,
                    points_earned: payload.pointsEarned,
                    start_time: Date.now() - (payload.duration * 1000),
                    end_time: Date.now()
                });

            if (sessionError) {
                console.error('[API] Error saving session:', sessionError);
                return NextResponse.json({ error: sessionError.message }, { status: 500 });
            }

        } else if (type === 'UPDATE_POINTS') {
            // Merging local points to cloud
            const pointsToAdd = payload.pointsEarned;
            const newTotal = currentPoints + pointsToAdd;

            const { error: updateError } = await supabase
                .from('users')
                .update({ total_points: newTotal })
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
