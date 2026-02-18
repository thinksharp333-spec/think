import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables');
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// Types for our new schema
export interface School {
    id: string;
    school_name: string;
    district: string;
    taluka: string;
    state: string;
}

export interface DBUser {
    id: string;
    name: string;
    age: number;
    mobile: string;
    school_id: string;
    grade?: string;
    total_points: number;
    created_at?: string;
}
