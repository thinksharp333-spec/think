import { getAnthropicClient } from './src/lib/claude.ts';

async function testGeneration() {
    const client = getAnthropicClient();
    const title = "बकरीच्या पिल्लाचा मित्र";
    const grade = "Grade 3";
    const level = "1";
    const subject = "Marathi";
    const promptText = `Book title: "${title}". Subject: ${subject}. Grade: ${grade}. Level: ${level}. (Full text could not be extracted.)`;

    const systemPrompt = `You are an expert educational quiz author creating reading comprehension questions for children in Indian schools (ages 5-12).

RULES:
- Generate ONLY a valid JSON array — no markdown, no extra text, no code fences.
- Each element must have exactly three keys:
    "question"     – a clear, age-appropriate question about the actual content of the text
    "options"      – an array of exactly 4 distinct answer strings
    "correctAnswer"– a string that exactly matches one element of "options"
- Questions must be grounded in the actual text provided, not generic.
- Options must be plausible and varied (no obviously wrong distractors).
- Use simple language suitable for Grade ${grade}, Level ${level}.
- If the provided text is in a local language (e.g. Marathi, Hindi), the questions and options MUST be generated in that exact same language.
- Do NOT generate meta-questions like "What is the title?" or "How many pages?".
- Never include violent, scary, or adult content.`;

    const userPrompt = `Generate exactly 5 reading comprehension questions based on the following text excerpt from "${title}" (${subject}, ${grade}, Level ${level}).

Text:
${promptText}

Return ONLY the raw JSON array, starting with [ and ending with ].`;

    try {
        console.log("Sending prompt to Claude...");
        const message = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            temperature: 0.4,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const raw = message.content[0].type === 'text' ? message.content[0].text : '[]';
        console.log("Raw Response:\n", raw);
        
        let clean = raw.trim();
        const start = clean.indexOf('[');
        const end = clean.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
            clean = clean.substring(start, end + 1);
        }
        console.log("\nCleaned Response:\n", clean);
        
        const parsed = JSON.parse(clean);
        console.log("\nParsed successfully?", Array.isArray(parsed));
    } catch (err: any) {
        console.error("Error:", err);
    }
}

testGeneration();
