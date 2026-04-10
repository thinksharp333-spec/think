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
    const { data, error } = await supabase.from('schools').select('*').limit(1);
    
    const result = {
        hasError: !!error,
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
        errorHint: error?.hint || null,
        errorDetails: error?.details || null,
        dataCount: data?.length ?? null,
        data: data
    };
    
    fs.writeFileSync('test-result.json', JSON.stringify(result, null, 2), 'utf8');
}

test().catch(e => {
    fs.writeFileSync('test-result.json', JSON.stringify({ exception: e.message }, null, 2), 'utf8');
});
