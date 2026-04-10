import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function test() {
    console.log("--- Testing schools table ---");
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    
    if (error) {
        console.log("Error code:", error.code);
        console.log("Error message:", error.message);
        console.log("Error hint:", error.hint);
        console.log("Error details:", error.details);
        console.log("Full error:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS! Schools data:", data);
    }
}

test();
