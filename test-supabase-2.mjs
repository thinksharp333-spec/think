
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually to ensure we have latest
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

console.log(`URL: ${url}`);
console.log(`Key: ${key.substring(0, 10)}...`);

const supabase = createClient(url, key);

async function test() {
    try {
        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error) {
            console.log("ERROR_CODE:", error.code);
            console.log("ERROR_MSG:", error.message);
            console.log("ERROR_HINT:", error.hint);
        } else {
            console.log("SUCCESS. Data:", data);
        }
    } catch (e) {
        console.log("EXCEPTION:", e.message);
    }
}

test();
