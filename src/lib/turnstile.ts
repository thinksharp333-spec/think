export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
    if (!token) {
        return false;
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
        console.error("Missing TURNSTILE_SECRET_KEY environment variable. Failing open or closed depending on strictness. Returning false.");
        return false; // Fail closed if configuration is missing
    }

    try {
        const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        
        const result = await fetch(url, {
            body: JSON.stringify({
                secret: secretKey,
                response: token,
            }),
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'POST',
        });

        const outcome = await result.json();
        if (outcome.success) {
            return true;
        } else {
            console.error("Turnstile verification failed:", outcome['error-codes']);
            return false;
        }
    } catch (err) {
        console.error("Error verifying Turnstile token:", err);
        return false;
    }
}
