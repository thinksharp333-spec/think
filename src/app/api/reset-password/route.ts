import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
    const body = await req.json();

    const isHuman = await verifyTurnstileToken(body.turnstileToken);
    if (!isHuman) {
        return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Find user by mobile
    const { data: user, error: findError } = await adminClient
        .from('users')
        .select('id, favourite_food')
        .eq('mobile', body.mobile)
        .single();

    if (findError || !user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // 2. Validate favourite food (case-insensitive)
    const userFood = (user.favourite_food || '').trim().toLowerCase();
    const inputFood = (body.favouriteFood || '').trim().toLowerCase();

    if (!userFood) {
        return NextResponse.json({ error: 'No favourite food is configured for this account. Please contact admin.' }, { status: 403 });
    }

    if (userFood !== inputFood) {
        return NextResponse.json({ error: 'Incorrect favourite food.' }, { status: 403 });
    }

    // 3. Hash the new password before storing
    const passwordHash = await bcrypt.hash(body.newPassword, 12);

    const { error: updateError } = await adminClient
        .from('users')
        .update({ password: passwordHash })
        .eq('id', user.id);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
