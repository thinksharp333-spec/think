import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables');
}

export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export interface School {
    id: string;
    school_name: string;
    district: string;
    taluka: string;
    state: string;
    cluster?: string;
    block?: string;
}

export interface DBUser {
    id: string;
    name: string;
    age: number;
    mobile: string;
    school_id: string;
    grade?: string;
    totalPoints: number;
    is_verified: boolean;
    created_at?: string;
}

export interface AnalyticsStudentBook {
    user_id: string;
    student_name: string;
    school_id: string;
    grade: string;
    total_books_read: number;
    total_reading_time_seconds: number;
    total_pages_read: number;
}

export interface AnalyticsSchoolStats {
    school_id: string;
    school_name: string;
    district: string;
    taluka: string;
    total_sessions: number;
    unique_books_read: number;
    participating_students: number;
}
