import { supabase } from './src/lib/supabase.ts';

async function run() {
    console.log("Fetching users limit 1...");
    const { data: users, error } = await supabase.from('users').select('*').limit(1);
    if (error) console.error("Error:", error);
    else console.log("User 0 keys:", Object.keys(users[0]));

    console.log("\nTesting select(\"totalPoints\")...");
    const { data, error: e2 } = await supabase.from('users').select('"totalPoints"').eq('id', users[0]?.id).single();
    if (e2) console.error("Error2:", e2);
    else console.log("Data from select(\"totalPoints\"):", data);
}
run();
