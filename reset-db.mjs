import { createClient } from '@supabase/supabase-js';

const NEXT_PUBLIC_SUPABASE_URL = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhx\naGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1Wb\ntXQFy4w'.replace(/\n/g, '');

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resetDb() {
    console.log('Clearing dependent tables...');
    await supabase.from('reading_sessions').delete().neq('id', 0);
    await supabase.from('book_reviews').delete().neq('id', 0);
    await supabase.from('quiz_attempts').delete().neq('id', 0);
    console.log('Clearing users...');
    const result = await supabase.from('users').delete().neq('id', 'non-existent');
    console.log(result);
}

resetDb();
