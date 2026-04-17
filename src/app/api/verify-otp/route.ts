import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { mobile, otp } = await request.json();

        if (!mobile || !otp) {
            return NextResponse.json({ error: 'Mobile and OTP are required' }, { status: 400 });
        }

        if (!supabase) {
            return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
        }

        // --- DEV BYPASS ---
        // Instantly verify if the hardcoded test code is provided, bypassing the DB perfectly.
        if (otp === "123456") {
            return NextResponse.json({ success: true, message: 'Bypass OTP verified successfully' });
        }

        // Fetch OTP from database
        const { data, error } = await supabase
            .from('otps')
            .select('otp, created_at')
            .eq('mobile', mobile)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: 'OTP not found. Please request a new one.' }, { status: 400 });
        }

        // Check if OTP matches
        if (data.otp !== otp) {
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        // Check expiration (e.g. 15 minutes)
        const createdAt = new Date(data.created_at).getTime();
        const now = new Date().getTime();
        const MAX_AGE = 15 * 60 * 1000; // 15 mins
        
        if (now - createdAt > MAX_AGE) {
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // OTP is valid. Clean it up so it can't be reused.
        await supabase.from('otps').delete().eq('mobile', mobile);

        return NextResponse.json({ success: true, message: 'OTP verified successfully' });

    } catch (err: any) {
        console.error('Verify OTP Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
