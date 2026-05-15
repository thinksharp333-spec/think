import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    const { mobile, password } = await req.json();

    if (!mobile || !password) {
        return NextResponse.json({ error: 'Mobile and password are required.' }, { status: 400 });
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

    // Identical error message for both "not found" and "wrong password" — prevents user enumeration
    const invalidMsg = 'Invalid credentials or user not found.';

    if (error || !data) {
        return NextResponse.json({ error: invalidMsg }, { status: 401 });
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
        return NextResponse.json({ error: invalidMsg }, { status: 401 });
    }

    // Strip password from the response — client never needs it over the network
    const { password: _pw, ...safeUser } = data;

    return NextResponse.json({ user: safeUser });
}
