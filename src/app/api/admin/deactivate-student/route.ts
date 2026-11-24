
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function PATCH(req: NextRequest) {
    try {
        // 1. Verify secure admin session
        const token = req.cookies.get("admin_session_secure")?.value;

        if (!verifyAdminToken(token)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // 2. Read student ID
        const body = await req.json();
        const { studentId } = body;

        if (!studentId || typeof studentId !== "string") {
            return NextResponse.json(
                { error: "Valid student ID is required." },
                { status: 400 }
            );
        }

        // 3. Check Supabase configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: "Server configuration error." },
                { status: 500 }
            );
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        // 4. Deactivate student (do not delete the record)
        const { data, error } = await adminClient
            .from("users")
            .update({ is_active: false })
            .eq("id", studentId)
            .eq("role", "student")
            .select("id, name, is_active")
            .maybeSingle();

        if (error) {
            console.error("Deactivate student error:", error);

            return NextResponse.json(
                { error: "Failed to deactivate student." },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Student not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Student deactivated successfully.",
            student: data
        });

    } catch (error) {
        console.error("Deactivate student API error:", error);

        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
