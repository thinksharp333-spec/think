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
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
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
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is missing" }, { status: 500 });
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

        const systemPrompt = `You are an expert educational quiz author creating reading comprehension questions for Indian school students.

RULES:
- Generate ONLY a valid JSON array — no markdown, no extra text, no code fences.
- Each element must have exactly three keys:
    "question"     – a clear, specific question about the actual content of the text
    "options"      – an array of exactly 4 distinct answer strings
    "correctAnswer"– a string that exactly matches one element of "options"
- Questions must be grounded in the actual text provided, not generic.
- Options must be plausible and varied (no obviously wrong distractors).
- Difficulty should match Grade ${grade}, Level ${level}.
- Do NOT generate meta-questions like "What is the title?" or "How many pages?".`;

        const userPrompt = `Generate exactly ${count} reading comprehension questions based on the following text excerpt from the book "${title}" (${subject}, ${grade}, Level ${level}).

Text:
${promptText}

Return ONLY the raw JSON array, starting with [ and ending with ].`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userPrompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.4,
                        topP: 0.9,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Quiz] Gemini error:", response.status, errorText.slice(0, 300));
            return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
        }

        const result = await response.json();
        const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const questions = parseAndValidateQuestions(raw);

        return NextResponse.json({ questions, wordCount: wordCount || 0, provider: 'gemini' });

    } catch (error: any) {
        console.error("Generate questions error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
