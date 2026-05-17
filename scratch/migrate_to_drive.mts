import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    const envPath = path.resolve('.env.local');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
            process.env[key.trim()] = value.join('=').trim();
        }
    });
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching books that need PDF URL migration...");
    
    // Fetch all books where pdfUrl contains 'supabase' and fileId is not null
    const { data: books, error } = await supabase
        .from('books')
        .select('id, title, "pdfUrl", "fileId"')
        .like('pdfUrl', '%supabase.co%')
        .not('fileId', 'is', null)
        .neq('fileId', '');

    if (error) {
        console.error('Error fetching books:', error);
        return;
    }

    if (!books || books.length === 0) {
        console.log("No books found that need migration! They might already be updated.");
        return;
    }

    console.log(`Found ${books.length} books to migrate to Google Drive URLs.`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const book of books) {
        const newPdfUrl = `https://docs.google.com/uc?export=download&id=${book.fileId}`;
        
        // Update the book in Supabase
        const { error: updateError } = await supabase
            .from('books')
            .update({ pdfUrl: newPdfUrl })
            .eq('id', book.id);

        if (updateError) {
            console.error(`❌ Failed to update ${book.title} (ID: ${book.id}):`, updateError.message);
            errorCount++;
        } else {
            console.log(`✅ Updated ${book.title}: ${newPdfUrl}`);
            successCount++;
        }
    }

    console.log(`\nMigration Complete!`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
}

main();
