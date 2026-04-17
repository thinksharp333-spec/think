import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/claude';

const SYSTEM_PROMPT = `You are BookBuddy, a friendly reading helper for children aged 5-12 who are learning to read.

Your job is to help students understand the book they are reading. You ONLY answer questions about the book provided. If a question is unrelated to the book, gently redirect the student back to the book.

Rules:
- Use simple, warm, encouraging language that a child can understand
- Keep answers short (2-4 sentences maximum)
- Never use scary, violent, or confusing content
- If you don't know something from the book text, say "That part isn't in what I can read right now, but great question!"
- Always end with one encouraging sentence
- Suggest 2-3 follow-up questions the student might like to ask`;

interface TutorRequest {
    question: string;
    bookContext: {
        title: string;
        grade: string;
        level: string;
        subject: string;
        text: string;
    };
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(req: Request) {
    try {
        const client = getAnthropicClient();

        const { question, bookContext, conversationHistory = [] }: TutorRequest = await req.json();

        if (!question?.trim() || !bookContext?.title) {
            return NextResponse.json({ error: 'Missing question or book context' }, { status: 400 });
        }

        const safeQuestion = question.trim().slice(0, 500);
        const safeText = (bookContext.text || '').slice(0, 8000);

        const contextMessage = `You are helping a student read this book:
Title: "${bookContext.title}"
Subject: ${bookContext.subject}
Grade: ${bookContext.grade}, Level: ${bookContext.level}

Book excerpt:
${safeText || '(No text available for this book)'}

---
The student asks: ${safeQuestion}

Answer in 2-4 simple sentences. Then suggest 2 follow-up questions.
Return as JSON: { "answer": "...", "followUpSuggestions": ["...", "..."] }`;

        const recentHistory = conversationHistory.slice(-4);
        const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
            ...recentHistory,
            { role: 'user', content: contextMessage },
        ];

        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            temperature: 0.6,
            system: SYSTEM_PROMPT,
            messages,
        });

        const raw = message.content[0].type === 'text' ? message.content[0].text : '';

        let answer = '';
        let followUpSuggestions: string[] = [];
        try {
            const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(clean);
            answer = parsed.answer || raw;
            followUpSuggestions = Array.isArray(parsed.followUpSuggestions)
                ? parsed.followUpSuggestions.slice(0, 3)
                : [];
        } catch {
            answer = raw;
        }

        return NextResponse.json({ answer, followUpSuggestions });

    } catch (error: any) {
        if (error?.status === 429) {
            return NextResponse.json(
                { error: 'BookBuddy is a bit busy right now. Try again in a moment!' },
                { status: 429 }
            );
        }
        console.error('[AI Tutor] Error:', error);
        return NextResponse.json(
            { error: 'BookBuddy had a problem. Please try again.' },
            { status: 500 }
        );
    }
}
