import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function test() {
    try {
        const { data, error } = await supabase.from('schools').select('*').limit(1);
        
        const lines = [];
        lines.push('HAS_ERROR=' + (!!error));
        if (error) {
            lines.push('ERROR_CODE=' + (error.code || 'none'));
            lines.push('ERROR_MSG=' + (error.message || 'none'));
            lines.push('ERROR_HINT=' + (error.hint || 'none'));
            lines.push('ERROR_DETAILS=' + (error.details || 'none'));
        } else {
            lines.push('DATA_COUNT=' + (data ? data.length : 0));
        }
        
        const output = lines.join('\n');
        fs.writeFileSync(path.join(__dirname, 'diag.log'), output, { encoding: 'ascii' });
    } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'diag.log'), 'EXCEPTION=' + e.message, { encoding: 'ascii' });
    }
}

test();
