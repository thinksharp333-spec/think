
import { createClient } from '@supabase/supabase-js';

const url = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
// The key from .env.local
const key = 'sb_publishable_a4Rp2-XExzxEB9nfchuDow_E6_j1pt';

console.log(`Connecting to ${url} with key starting with ${key.substring(0, 10)}...`);

const supabase = createClient(url, key);

async function test() {
    try {
        console.log("Attempting to fetch users...");
        const { data, error } = await supabase.from('users').select('*').limit(1);

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Supabase Success. Data:", data);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

test();
