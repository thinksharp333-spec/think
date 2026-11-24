
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
    try {
        // 1. Read login details
        const body = await req.json();

        const mobile = String(body.mobile || '').trim();
        const password =
            typeof body.password === 'string'
                ? body.password
                : '';

        const turnstileToken = body.turnstileToken;

        // 2. Validate required fields
        if (!mobile || !password) {
            return NextResponse.json(
                { error: 'Mobile and password are required.' },
                { status: 400 }
            );
        }

        // 3. Validate Indian mobile number
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            return NextResponse.json(
                { error: 'Enter a valid 10-digit mobile number.' },
                { status: 400 }
            );
        }

        // 4. Verify Turnstile when configured
        if (process.env.TURNSTILE_SECRET_KEY) {
            const isHuman = await verifyTurnstileToken(turnstileToken);

            if (!isHuman) {
                return NextResponse.json(
                    {
                        error: 'Security check failed. Please try again.'
                    },
                    { status: 400 }
                );
            }
        }

        // 5. Check Supabase configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: 'Server configuration error.' },
                { status: 500 }
            );
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        // 6. Find student using mobile number
        const { data, error } = await adminClient
            .from('users')
            .select('*')
            .eq('mobile', mobile)
            .maybeSingle();

        if (error) {
            console.error('Login user lookup error:', error);

            return NextResponse.json(
                { error: 'Unable to process login. Please try again.' },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'User not found.' },
                { status: 404 }
            );
        }

        // 7. Verify password
        const storedPassword = data.password;

        if (typeof storedPassword !== 'string' || !storedPassword) {
            return NextResponse.json(
                { error: 'Invalid account password. Please contact admin.' },
                { status: 401 }
            );
        }

        // Check whether stored password is bcrypt
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);

        let passwordMatch = false;

        if (isBcryptHash) {
            // New bulk-registered and existing bcrypt users
            passwordMatch = await bcrypt.compare(
                password,
                storedPassword
            );
        } else {
            // Legacy plaintext password compatibility
            passwordMatch = password === storedPassword;

            if (passwordMatch) {
                // Upgrade legacy password to bcrypt
                const newHash = await bcrypt.hash(password, 12);

                const { error: updateError } = await adminClient
                    .from('users')
                    .update({ password: newHash })
                    .eq('id', data.id);

                if (updateError) {
                    console.error(
                        'Password migration error:',
                        updateError
                    );
                }
            }
        }

        if (!passwordMatch) {
            return NextResponse.json(
                { error: 'Incorrect password.' },
                { status: 401 }
            );
        }

        // 8. Remove password before returning user details
        const { password: _password, ...safeUser } = data;

        // 9. Successful login
        return NextResponse.json(
            {
                success: true,
                message: 'Login successful.',
                user: safeUser
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Login API error:', error);

        return NextResponse.json(
            {
                error: 'Login failed. Please try again.'
            },
            { status: 500 }
        );
    }
}
