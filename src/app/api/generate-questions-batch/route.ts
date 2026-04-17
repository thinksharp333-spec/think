import { NextResponse } from 'next/server';

interface BookInput {
    id: number;
    title: string;
    grade: string;
    level: string;
    subject: string;
    pages: number;
    wordCount: number;
    text: string;
}

function questionsForBook(wordCount: number, pages: number): number {
    if (wordCount >= 3000) return 10;
    if (wordCount >= 1500) return 8;
    if (wordCount >= 800)  return 7;
    if (wordCount >= 300)  return 5;
    if (pages >= 50)       return 10;
    if (pages >= 20)       return 7;
    return 5;
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }

        const { books }: { books: BookInput[] } = await req.json();
        if (!books || books.length === 0) {
            return NextResponse.json({ results: [] });
        }

        const booksPayload = books.map(b => {
            const hasText = b.text && b.text.trim().length > 60;
            return {
                id: b.id,
                title: b.title,
                grade: b.grade,
                level: b.level,
                subject: b.subject,
                count: questionsForBook(b.wordCount, b.pages),
                text: hasText
                    ? b.text.slice(0, 800)
                    : `Book title: "${b.title}". Subject: ${b.subject}. Grade: ${b.grade}. Reading level: ${b.level}. This is an educational book for children.`,
                textSource: hasText ? 'pdf' : 'metadata',
            };
        });

        const systemPrompt = `You are an expert educational quiz author for children in Indian schools (ages 5-12).

Return ONLY a valid JSON array — no markdown, no code fences, no extra text.
Each element must be: { "id": <number>, "questions": [ { "question": <string>, "options": [<4 strings>], "correctAnswer": <string matching one option> } ] }

Rules for every question:
- Grounded in the actual book text provided, not generic
- Age-appropriate language; never violent or adult
- No meta-questions like "What is the title?" or "How many pages?"
- correctAnswer must exactly match one of the 4 options
- Difficulty matches the given grade and level`;

        const userPrompt = `Generate reading comprehension quizzes for the following ${books.length} books.
For each book, generate exactly the number of questions specified in "count".
Return one JSON array element per book, identified by "id".

Books:
${JSON.stringify(booksPayload, null, 2)}

Return ONLY the JSON array, starting with [ and ending with ].`;

        const geminiPayload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const jsonResponse = await response.json();
        const raw = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        let parsed: { id: number; questions: any[] }[] = [];
        try {
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(clean);
        } catch {
            console.error('Batch parse failed:', raw.slice(0, 300));
            return NextResponse.json({ results: [] });
        }

        const results = parsed.map(entry => ({
            id: entry.id,
            questions: (entry.questions || []).filter(
                (q: any) =>
                    q &&
                    typeof q.question === 'string' &&
                    Array.isArray(q.options) &&
                    q.options.length === 4 &&
                    typeof q.correctAnswer === 'string' &&
                    q.options.includes(q.correctAnswer)
            ),
        }));

        return NextResponse.json({ results });

    } catch (err: any) {
        if (err?.status === 429) {
            return NextResponse.json({ error: 'CLAUDE_RATE_LIMIT', status: 429 }, { status: 429 });
        }
        console.error('Batch generate error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
