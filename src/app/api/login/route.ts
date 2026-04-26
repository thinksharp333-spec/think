import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const { data, error } = await adminClient
        .from('users')
        .select('*')
        .eq('mobile', mobile)
        .eq('password', password)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Invalid credentials or user not found.' }, { status: 401 });
    }

    return NextResponse.json({ user: data });
}
