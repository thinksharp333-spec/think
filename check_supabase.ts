
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooks() {
    const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching books:', error);
        return;
    }

    console.log('Sample books:', JSON.stringify(books, null, 2));
    
    const { count, error: countError } = await supabase
        .from('books')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Error counting books:', countError);
    } else {
        console.log('Total books in Supabase:', count);
    }
}

checkBooks();
