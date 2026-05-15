import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    // Only admins with a valid session may call this
    const adminSession = req.cookies.get('admin_session')?.value;
    if (adminSession !== 'true') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId, newPassword } = await req.json();

    if (!studentId || !newPassword || newPassword.length < 4) {
        return NextResponse.json({ error: 'Missing or invalid fields.' }, { status: 400 });
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const { error } = await adminClient
        .from('users')
        .update({ password: passwordHash })
        .eq('id', studentId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
