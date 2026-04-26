
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhxaGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1WbtXQFy4w'; // Service role key

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooks() {
    const { data, error } = await supabase
        .from('books')
        .select('id, title, coverUrl')
        .limit(10);

    if (error) {
        console.error('Error fetching books:', error);
        return;
    }

    console.log('Sample books from live DB:');
    data.forEach(book => {
        console.log(`ID: ${book.id}, Title: ${book.title}, coverUrl: ${book.coverUrl}`);
    });
}

checkBooks();
