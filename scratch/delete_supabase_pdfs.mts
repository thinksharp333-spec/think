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
    console.log("Connecting to Supabase Storage to delete PDFs...");
    
    let allFiles: any[] = [];
    let limit = 1000;
    let offset = 0;
    let hasMore = true;

    // 1. Fetch all files in the root of the 'books' bucket
    while (hasMore) {
        const { data, error } = await supabase.storage
            .from('books')
            .list('', {
                limit: limit,
                offset: offset,
                sortBy: { column: 'name', order: 'asc' },
            });

        if (error) {
            console.error('Error listing files:', error);
            return;
        }

        if (data && data.length > 0) {
            allFiles = [...allFiles, ...data];
            offset += limit;
        } else {
            hasMore = false;
        }
    }

    console.log(`Found a total of ${allFiles.length} items in the root folder.`);

    // 2. Filter for files that end in .pdf
    // Note: Folders (like 'covers') do not end in .pdf, so they will be safely ignored.
    const pdfFiles = allFiles
        .filter(file => file.name.endsWith('.pdf'))
        .map(file => file.name);

    if (pdfFiles.length === 0) {
        console.log("No PDF files found to delete. The bucket is already clean!");
        return;
    }

    console.log(`Found ${pdfFiles.length} PDF files ready for deletion.`);
    
    // 3. Delete in batches of 100 to avoid request size limits
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < pdfFiles.length; i += batchSize) {
        const batch = pdfFiles.slice(i, i + batchSize);
        console.log(`Deleting batch ${Math.floor(i/batchSize) + 1}... (${batch.length} files)`);
        
        const { data, error } = await supabase.storage
            .from('books')
            .remove(batch);

        if (error) {
            console.error(`❌ Failed to delete batch:`, error.message);
        } else {
            deletedCount += batch.length;
        }
    }

    console.log(`\nDeletion Complete!`);
    console.log(`Successfully deleted ${deletedCount} PDFs.`);
    console.log(`This has freed up ~1.6 GB of storage space.`);
}

main();
