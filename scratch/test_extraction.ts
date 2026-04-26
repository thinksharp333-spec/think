
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';

const supabaseUrl = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhxaGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1WbtXQFy4w';
const geminiKey = 'AIzaSyCBnFPqjeqRHwY7FJwjY4Abef0ReBE32GA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractText(pdfUrl: string) {
    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const data = await response.arrayBuffer();
        
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        let fullText = '';
        // Sample first 5 pages
        const pagesToRead = Math.min(5, numPages);
        for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(' ');
            fullText += pageText + ' ';
        }
        return fullText.trim();
    } catch (e) {
        console.error('Extraction error:', e);
        return '';
    }
}

async function run() {
    // 1. Get a sample book missing quiz
    const { data: books, error } = await supabase
        .from('books')
        .select('*')
        .or('questions.eq.[],questions.is.null')
        .limit(1);

    if (error || !books || books.length === 0) {
        console.log('No books missing quizzes.');
        return;
    }

    const book = books[0];
    console.log(`Processing: ${book.title}`);
    
    const text = await extractText(book.pdfUrl);
    console.log(`Extracted text length: ${text.length}`);
    if (text) {
        console.log('Sample text:', text.substring(0, 200));
    }
}

run();
