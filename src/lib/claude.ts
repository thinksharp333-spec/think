import Anthropic from '@anthropic-ai/sdk';

if (typeof window !== 'undefined') {
    throw new Error('claude.ts is server-only — do not import from client components');
}

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    if (!_client) {
        _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return _client;
}
