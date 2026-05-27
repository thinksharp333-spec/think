import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
    const { mobile, password, turnstileToken } = await req.json();

    if (!mobile || !password) {
        return NextResponse.json({ error: 'Mobile and password are required.' }, { status: 400 });
    }

    const isHuman = await verifyTurnstileToken(turnstileToken);
    if (!isHuman) {
        return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Fetch by mobile only — password comparison happens below
    const { data, error } = await adminClient
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Detect whether this user's password is a bcrypt hash or legacy plaintext.
    // Bcrypt hashes always start with "$2a$", "$2b$", or "$2y$".
    const isBcryptHash = typeof data.password === 'string' && data.password.startsWith('$2');

    let passwordMatch: boolean;

    if (isBcryptHash) {
        passwordMatch = await bcrypt.compare(password, data.password);
    } else {
        // Legacy plaintext user — compare directly
        passwordMatch = password === data.password;

        if (passwordMatch) {
            // Silently upgrade to bcrypt hash so this user is migrated after login
            const newHash = await bcrypt.hash(password, 12);
            await adminClient
                .from('users')
                .update({ password: newHash })
                .eq('id', data.id);
        }
    }

    if (!passwordMatch) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    // Strip password from the response — client never needs it over the network
    const { password: _pw, ...safeUser } = data;

    return NextResponse.json({ user: safeUser });
}
