import { NextResponse } from 'next/server';

function getQuestionCount(wordCount: number, pages: number): number {
    if (wordCount > 0) {
        if (wordCount >= 3000) return 10;
        if (wordCount >= 1500) return 8;
        if (wordCount >= 800)  return 7;
        if (wordCount >= 300)  return 5;
        return 3;
    }
    if (pages >= 50) return 10;
    if (pages >= 20) return 7;
    return 5;
}

function parseAndValidateQuestions(raw: string): any[] {
    try {
        let clean = raw.trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }
        const parsed = JSON.parse(clean);
        return (Array.isArray(parsed) ? parsed : []).filter((q: any) =>
            q &&
            typeof q.question === 'string' &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correctAnswer === 'string' &&
            q.options.includes(q.correctAnswer)
        );
    } catch {
        // Fallback to empty array on catastrophic parse failure
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }

        const { text, pages, title, grade, level, subject, wordCount } = await req.json();

        const count = getQuestionCount(wordCount || 0, pages || 10);

        let promptText = (text || "").trim();
        if (promptText.length < 80) {
            promptText = `Book title: "${title}". Subject: ${subject}. Grade: ${grade}. Level: ${level}. (Full text could not be extracted.)`;
        }
        if (promptText.length > 12000) {
            const third = Math.floor(12000 / 3);
            const mid = Math.floor(promptText.length / 2);
            promptText =
                promptText.slice(0, third) +
                " ... " +
                promptText.slice(mid - Math.floor(third / 2), mid + Math.floor(third / 2)) +
                " ... " +
                promptText.slice(-third);
        }

        const isFallback = promptText.includes("(Full text could not be extracted.)");
        
        const systemPrompt = `You are an expert educational quiz author creating reading comprehension questions for children in Indian schools (ages 5-12).

RULES:
- Generate ONLY a valid JSON array — no markdown, no extra text, no code fences.
- Each element must have exactly three keys:
    "question"     – a clear, age-appropriate question about the actual content of the text
    "options"      – an array of exactly 4 distinct answer strings
    "correctAnswer"– a string that exactly matches one element of "options"
${isFallback 
    ? `- Since the full text could not be provided, you MUST creatively make up plausible, generic reading comprehension questions based ONLY on the title of the book.` 
    : `- Questions must be grounded in the actual text provided, not generic.`}
- Options must be plausible and varied (no obviously wrong distractors).
- Use simple language suitable for Grade ${grade}, Level ${level}.
- If the provided text is in a local language (e.g. Marathi, Hindi), the questions and options MUST be generated in that exact same language.
- Do NOT generate meta-questions like "What is the title?" or "How many pages?".
- Never include violent, scary, or adult content.`;

        const userPrompt = `Generate exactly ${count} reading comprehension questions based on the following text excerpt from "${title}" (${subject}, ${grade}, Level ${level}).

Text:
${promptText}

Return ONLY the raw JSON array, starting with [ and ending with ].`;

        const geminiPayload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
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
        const questions = parseAndValidateQuestions(raw);

        return NextResponse.json({ questions, wordCount: wordCount || 0, provider: 'claude' });

    } catch (error: any) {
        if (error?.status === 429) {
            return NextResponse.json({ error: 'Rate limit exceeded', status: 429 }, { status: 429 });
        }
        console.error("Generate questions error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
