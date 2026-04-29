
import { createClient } from '@supabase/supabase-js';
import * as pdfjsLib from 'pdfjs-dist';

// Configuration
const supabaseUrl = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhxaGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1WbtXQFy4w';
const geminiKey = 'AIzaSyC4LVf-vJMoxYUvVNbpc4sInV1B3_oE0_o';
const BATCH_SIZE = 1; 
const BATCH_DELAY = 5000; 
const RETRY_DELAY_BASE = 15000; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractText(pdfUrl: string) {
    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) return '';
        const data = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        let fullText = '';
        const pagesToRead = Math.min(8, pdf.numPages);
        for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => (item as any).str).join(' ') + ' ';
        }
        return fullText.trim();
    } catch (e) {
        return '';
    }
}

async function generateQuizzes(books: any[], retries = 3) {
    const booksPayload = books.map(b => ({
        id: b.id,
        title: b.title,
        grade: b.grade,
        level: b.level,
        subject: b.subject,
        count: (b.pages >= 20 || b.text.length > 1000) ? 8 : 5,
        text: b.text.slice(0, 1500),
    }));

    const systemPrompt = `You are an expert educational quiz author for children (ages 5-12).
Return ONLY a valid JSON array. Each element: { "id": <number>, "questions": [ { "question": <string>, "options": [<4 strings>], "correctAnswer": <string matching one option> } ] }
Questions MUST be based on the provided text.`;

    const userPrompt = `Generate quizzes for: ${JSON.stringify(booksPayload, null, 2)}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: combinedPrompt }] }],
                    generationConfig: { 
                        temperature: 0.1,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (!response.ok) {
                const errJson = await response.json();
                console.error(`Gemini API Error details:`, JSON.stringify(errJson, null, 2));
                if (response.status === 429) {
                    console.warn(`[Retry] Rate limit hit. Waiting 60s before retry...`);
                    await new Promise(r => setTimeout(r, 60000));
                    continue;
                }
                throw new Error(`Gemini Error: ${response.statusText}`);
            }

            const data = await response.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            return JSON.parse(raw);
        } catch (e) {
            if (attempt === retries) throw e;
            console.warn(`[Retry] Attempt ${attempt} failed: ${e}`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

async function run() {
    console.log('--- STARTING QUIZ GENERATION ---');
    
    const { data: allBooks, error } = await supabase
        .from('books')
        .select('*')
        .or('questions.eq.[],questions.is.null');

    if (error) {
        console.error('Fetch error:', error);
        return;
    }

    console.log(`Found ${allBooks.length} books missing quizzes.`);
    
    for (let i = 0; i < allBooks.length; i += BATCH_SIZE) {
        const batch = allBooks.slice(i, i + BATCH_SIZE);
        console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}: Processing ${batch.length} books...`);
        
        try {
            // 1. Extract Text
            const booksWithText = await Promise.all(batch.map(async b => ({
                ...b,
                text: await extractText(b.pdfUrl)
            })));

            // 2. Generate Quizzes
            const quizResults = await generateQuizzes(booksWithText);
            
            // 3. Update Supabase
            for (const result of quizResults) {
                if (result.questions && result.questions.length > 0) {
                    const { error: updateError } = await supabase
                        .from('books')
                        .update({ questions: result.questions })
                        .eq('id', result.id);
                    
                    if (updateError) console.error(`Failed to update book ${result.id}:`, updateError.message);
                    else console.log(`[OK] Quiz generated for: ${batch.find(b => b.id === result.id)?.title}`);
                }
            }
        } catch (e) {
            console.error('Batch failed:', e);
        }

        if (i + BATCH_SIZE < allBooks.length) {
            console.log(`Waiting ${BATCH_DELAY}ms for next batch...`);
            await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
    }
}

run();
