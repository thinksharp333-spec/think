import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanOrphanSessions() {
    console.log("Fetching all users to build a set of valid user IDs...");
    const { data: users, error: userErr } = await supabase.from('users').select('id');
    if (userErr) {
        console.error("Failed to fetch users:", userErr);
        return;
    }
    const validUserIds = new Set(users.map(u => u.id));

    console.log(`Found ${validUserIds.size} valid users.`);
    
    console.log("Fetching all reading sessions...");
    const { data: sessions, error: sessErr } = await supabase.from('reading_sessions').select('id, user_id');
    if (sessErr) {
        console.error("Failed to fetch sessions:", sessErr);
        return;
    }

    const orphans = sessions.filter(s => !validUserIds.has(s.user_id));
    console.log(`Found ${orphans.length} orphan reading sessions.`);

    if (orphans.length > 0) {
        const orphanIds = orphans.map(o => o.id);
        console.log("Deleting orphan sessions...");
        
        // Delete in batches of 100 just in case
        for (let i = 0; i < orphanIds.length; i += 100) {
            const batch = orphanIds.slice(i, i + 100);
            const { error: delErr } = await supabase.from('reading_sessions').delete().in('id', batch);
            if (delErr) {
                console.error("Failed to delete batch:", delErr);
            } else {
                console.log(`Deleted batch of ${batch.length} sessions.`);
            }
        }
        console.log("Cleanup complete!");
    }
}

cleanOrphanSessions();
