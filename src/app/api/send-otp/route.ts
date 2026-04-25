import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const AUTHKEY = '36bd33b33a2438fc';
const SENDER = 'AUTHKY';

export async function POST(request: Request) {
    try {
        const { mobile } = await request.json();

        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return NextResponse.json({ error: 'Valid 10-digit mobile number required' }, { status: 400 });
        }

        if (!supabase) {
            return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to Supabase `otps` table
        const { error: dbError } = await supabase
            .from('otps')
            .upsert({ mobile, otp, created_at: new Date().toISOString() });

        if (dbError) {
            console.error('Failed to save OTP to database:', dbError);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // Send via AuthKey using Default Template.
        // We removed `sid=38874` because AuthKey threw "Both SID and SMS not allowed".
        // Instead, we just pass the exact literal string.
        const companyName = "DigiLibrary";
        const msg = encodeURIComponent(`Use ${otp} as your OTP to access your ${companyName}, OTP is confidential and valid for 5 mins This sms sent by authkey.io`);
        
        const authKeyUrl = `https://api.authkey.io/request?authkey=${AUTHKEY}&mobile=${mobile}&country_code=91&sms=${msg}&sender=AUTHKY`;

        const response = await fetch(authKeyUrl);
        
        // --- SECURE DEV MODE LOGGER ---
        console.log('\n=============================================');
        console.log(`📱 DEMO SMS DELIVERED TO TERMINAL INSTEAD OF PHONE!`);
        console.log(`📱 Mobile: ${mobile}`);
        console.log(`🔑 OTP Code: ${otp}`);
        console.log('=============================================\n');
        const data = await response.text();

        console.log(`AuthKey Response for ${mobile}:`, data);

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });

    } catch (err: any) {
        console.error('Send OTP Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
