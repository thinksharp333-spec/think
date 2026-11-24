
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

        // 2. Read student details
        const body = await req.json();

        const {
            studentId,
            name,
            mobile,
            age,
            grade,
            school,
            district,
            favouriteFood
        } = body;

        // 3. Validate required fields
        if (
            typeof studentId !== "string" ||
            !studentId.trim() ||
            typeof name !== "string" ||
            !name.trim() ||
            typeof mobile !== "string" ||
            !/^[6-9]\d{9}$/.test(mobile.trim())
        ) {
            return NextResponse.json(
                { error: "Please enter valid student details." },
                { status: 400 }
            );
        }

        // 4. Validate age
        if (
            age !== "" &&
            age !== null &&
            age !== undefined &&
            (!Number.isInteger(Number(age)) || Number(age) < 1)
        ) {
            return NextResponse.json(
                { error: "Please enter a valid age." },
                { status: 400 }
            );
        }

        // 5. Check server configuration
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

        const cleanMobile = mobile.trim();

        // 6. Check duplicate mobile number
        const { data: duplicate, error: duplicateError } =
            await adminClient
                .from("users")
                .select("id")
                .eq("mobile", cleanMobile)
                .neq("id", studentId)
                .limit(1)
                .maybeSingle();

        if (duplicateError) {
            console.error("Duplicate mobile check error:", duplicateError);

            return NextResponse.json(
                { error: "Unable to verify mobile number." },
                { status: 500 }
            );
        }

        if (duplicate) {
            return NextResponse.json(
                { error: "This mobile number is already registered." },
                { status: 409 }
            );
        }

        // 7. Update student details
        const { data, error } = await adminClient
            .from("users")
            .update({
                name: name.trim(),
                mobile: cleanMobile,
                age:
                    age === "" || age === null || age === undefined
                        ? null
                        : Number(age),
                grade:
                    typeof grade === "string" && grade.trim()
                        ? grade.trim()
                        : null,
                school:
                    typeof school === "string" && school.trim()
                        ? school.trim()
                        : null,
                city:
                    typeof district === "string" && district.trim()
                        ? district.trim()
                        : null,
                favourite_food:
                    typeof favouriteFood === "string" && favouriteFood.trim()
                        ? favouriteFood.trim()
                        : null,
            })
            .eq("id", studentId.trim())
            .eq("role", "student")
            .select(
                "id, name, mobile, age, grade, school, city, favourite_food"
            )
            .maybeSingle();

        if (error) {
            console.error("Update student error:", error);

            return NextResponse.json(
                { error: "Failed to update student." },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: "Student not found." },
                { status: 404 }
            );
        }

        // 8. Success response
        return NextResponse.json({
            success: true,
            message: "Student details updated successfully.",
            student: data
        });

    } catch (error) {
        console.error("Edit student API error:", error);

        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
