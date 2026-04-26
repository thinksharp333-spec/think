
const { createClient } = require('@supabase/supabase-js');
const pdfjs = require('pdfjs-dist');

// Configuration
const supabaseUrl = 'https://mewjyfehpeuwfplxqhhl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ld2p5ZmVocGV1d2ZwbHhxaGhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYxOTc3MSwiZXhwIjoyMDg2MTk1NzcxfQ.u1Fmc2KOaAapGhqOyU_uOWXMuo_iQrEXC1WbtXQFy4w';
const geminiKey = 'AIzaSyCBnFPqjeqRHwY7FJwjY4Abef0ReBE32GA';
const BATCH_SIZE = 4; // 4 books per request
const BATCH_DELAY = 12000; // 12 seconds between batches (stable 20 books/min)

const supabase = createClient(supabaseUrl, supabaseKey);

async function extractText(pdfUrl) {
    try {
        const response = await fetch(pdfUrl);
        if (!response.ok) return '';
        const data = await response.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        let fullText = '';
        const pagesToRead = Math.min(4, pdf.numPages);
        for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + ' ';
        }
        return fullText.trim();
    } catch (e) {
        return '';
    }
}

async function generateQuizzes(books, retries = 5) {
    const booksPayload = books.map(b => ({
        id: b.id,
        title: b.title,
        grade: b.grade,
        level: b.level,
        subject: b.subject,
        count: 5,
        text: (b.text || '').slice(0, 2000),
    }));

    const systemPrompt = `You are a quiz genertor. Return ONLY a valid JSON array of objects.
Example: [{"id": 1, "questions": [{"question": "What...", "options": ["A","B","C","D"], "correctAnswer": "A"}]}]`;
    const userPrompt = `Generate educational quizzes for these books: ${JSON.stringify(booksPayload)}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userPrompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: { 
                        temperature: 0.1,
                        maxOutputTokens: 6000,
                        response_mime_type: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.warn(`      [AI Error] status: ${response.status}, attempt: ${attempt}`);
                if (response.status === 429) {
                    await new Promise(r => setTimeout(r, attempt * 15000));
                    continue;
                }
                throw new Error(`Gemini Error: ${response.statusText}`);
            }
            
            const data = await response.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
            return JSON.parse(raw);
        } catch (e) {
            if (attempt === retries) throw e;
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

async function run() {
    console.log('--- GLOBAL QUIZ GENERATION STARTED ---');
    const { data: allBooks, error } = await supabase
        .from('books')
        .select('*')
        .or('questions.eq.[],questions.is.null');

    if (error) { console.error('Supabase fetch error:', error); return; }
    console.log(`Total books needing quizzes: ${allBooks.length}`);
    
    for (let i = 0; i < allBooks.length; i += BATCH_SIZE) {
        const batch = allBooks.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allBooks.length / BATCH_SIZE);
        console.log(`\n[Batch ${batchNum}/${totalBatches}] Processing: ${batch.map(b => b.title).join(', ')}`);
        
        try {
            const booksWithText = [];
            for (const b of batch) {
                process.stdout.write(`   [Ext] ${b.title.slice(0, 20)}... `);
                const text = await extractText(b.pdfUrl);
                booksWithText.push({ ...b, text });
                process.stdout.write('Done.\n');
            }

            console.log(`   [AI] Requesting quizzes...`);
            const quizResults = await generateQuizzes(booksWithText);
            
            let updatedCount = 0;
            for (const result of (quizResults || [])) {
                if (result.questions?.length > 0) {
                    const { error: updateError } = await supabase
                        .from('books')
                        .update({ questions: result.questions })
                        .eq('id', result.id);
                    if (!updateError) updatedCount++;
                }
            }
            console.log(`   [OK] Generated & Saved ${updatedCount}/${batch.length} quizzes.`);
        } catch (e) {
            console.error(`   [Fail] Batch error: ${e.message}`);
        }

        if (i + BATCH_SIZE < allBooks.length) {
            console.log(`   [Wait] ${BATCH_DELAY}ms...`);
            await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
    }
    console.log('\n--- GLOBAL QUIZ GENERATION COMPLETED ---');
}

run();
