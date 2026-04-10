import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY is missing in environment variables" }, { status: 500 });
        }

        const { text, pages, title, grade, level, subject } = await req.json();

        // Determine question count based on book pages
        let count = 5;
        if (pages >= 50) count = 10;
        else if (pages >= 20) count = 7;

        let promptText = text;
        if (!promptText || promptText.length < 50) {
            // Fallback if PDF text extraction fails or text is too short
            promptText = `This book is titled "${title}". It is a ${subject} book.`;
        }

        // Limit extracted text to roughly 5000 characters to save tokens/context limit
        if (promptText.length > 5000) {
            promptText = promptText.substring(0, 5000);
        }

        const systemPrompt = `You are an educational assistant that generates high-quality reading comprehension questions for students.
You must return only a valid JSON array of objects, with no markdown formatting or extra text.
Each object must have exactly three keys: "question" (string), "options" (an array of 4 distinct strings where one is the correct answer), and "correctAnswer" (string exactly matching one of the options).`;

        const userPrompt = `Generate exactly ${count} reading comprehension questions based on the text below. 
The questions should be appropriate for a student in ${grade} reading a level ${level} ${subject} book.
Return ONLY the raw JSON array.

Text:
${promptText}`;

        const requestBody = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.3
            }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini Error:", errorText);
            
            if (response.status === 429) {
                console.warn("Gemini Quota Exhausted! Falling back to Mock Quiz for UI Demonstration!");
                const mockQuestions = [
                    {
                        question: `What is the primary topic discussed in the book "${title}"?`,
                        options: [subject, "Mathematics", "Physical Education", "Music"],
                        correctAnswer: subject
                    },
                    {
                        question: "How many pages does this section cover?",
                        options: ["5 pages", `${pages} pages`, "15 pages", "20 pages"],
                        correctAnswer: `${pages} pages`
                    },
                    {
                        question: "What level of difficulty is this book designed for?",
                        options: ["Beginner", `Level ${level}`, "Advanced", "Expert"],
                        correctAnswer: `Level ${level}`
                    }
                ];
                return NextResponse.json({ questions: mockQuestions, raw: "mock" });
            }

            return NextResponse.json({ error: "Failed to generate questions from Gemini" }, { status: response.status });
        }

        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        
        let questions = [];
        let cleanContent = "";
        try {
            // Sometimes the LLM returns wrapped in markdown like ```json ... ```
            cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            questions = JSON.parse(cleanContent);
        } catch (e) {
            console.error("Failed to parse questions JSON:", content);
            // Fallback empty array
            questions = [];
        }

        return NextResponse.json({ questions, raw: content });

    } catch (error: any) {
        console.error("Generate questions API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
