import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    const body = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if mobile already exists
    const { data: existing } = await adminClient
        .from('users')
        .select('id')
        .eq('mobile', body.mobile)
        .single();

    if (existing) {
        return NextResponse.json({ error: 'Mobile number already registered.' }, { status: 409 });
    }

    // If custom school, insert it into the schools table first
    let finalSchoolId = body.schoolId;
    if (body.isCustomSchool) {
        const newSchoolId = crypto.randomUUID();
        const { error: schoolError } = await adminClient.from('schools').insert([{
            id:          newSchoolId,
            school_name: body.school,
            district:    body.city,
            taluka:      body.taluka || '',
            village:     body.village || '',
            state:       'Maharashtra',
        }]);
        if (!schoolError) {
            finalSchoolId = newSchoolId;
        }
    }

    const { error } = await adminClient.from('users').insert([{
        id:                   body.id,
        name:                 body.name,
        age:                  body.age,
        mobile:               body.mobile,
        city:                 body.city,
        school:               body.school,
        school_id:            finalSchoolId !== 'custom' ? finalSchoolId : null,
        grade:                body.grade,
        role:                 body.role,
        password:             body.password,
        totalPoints:          0,
        avatar_base_id:       body.avatarBaseId,
        current_avatar_stage: 0,
        current_avatar_url:   body.currentAvatarUrl,
        total_books_read:     0,
        favourite_food:       body.favouriteFood,
    }]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
