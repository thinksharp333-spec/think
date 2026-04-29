import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhxaGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1WbtXQFy4w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data } = await supabase.from('books').select('title, fileId, coverUrl').limit(1);
    console.log(JSON.stringify(data, null, 2));
}
run();
