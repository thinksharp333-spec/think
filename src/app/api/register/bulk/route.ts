
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { verifyAdminToken } from "@/lib/admin-auth";

type Student = {
    name: string;
    age: number | string;
    mobile: string;
    school: string;
    district: string;
    grade: string;
    password: string;
    confirmPassword: string;
    favouriteFood: string;

    schoolId?: string;
    taluka?: string;
    village?: string;

    avatarBaseId?: string;
    currentAvatarUrl?: string;
};

type RegistrationResult = {
    row: number;
    name: string;
    mobile: string;
    status: "success" | "skipped" | "error";
    message: string;
    temporaryPassword?: string;
};

export async function POST(req: NextRequest) {
    try {
        // 1. Verify admin session
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session_secure")?.value;

        if (!verifyAdminToken(token)) {
            return NextResponse.json(
                { error: "Unauthorized. Please log in as admin." },
                { status: 401 }
            );
        }

        // 2. Check Supabase configuration
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { error: "Server configuration error." },
                { status: 500 }
            );
        }

        // 3. Read and validate request
        const body = await req.json();
        const students: Student[] = body.students;

        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json(
                { error: "No students were provided." },
                { status: 400 }
            );
        }

        if (students.length > 200) {
            return NextResponse.json(
                { error: "Maximum 200 students per upload." },
                { status: 400 }
            );
        }

        const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
        );

        // 4. Check existing mobile numbers
        const mobiles = [
            ...new Set(
                students
                    .map((student) =>
                        String(student?.mobile || "").trim()
                    )
                    .filter(Boolean)
            ),
        ];

        const existingMobiles = new Set<string>();

        if (mobiles.length > 0) {
            const { data: existingUsers, error: lookupError } =
                await adminClient
                    .from("users")
                    .select("mobile")
                    .in("mobile", mobiles);

            if (lookupError) {
                return NextResponse.json(
                    { error: lookupError.message },
                    { status: 500 }
                );
            }

            (existingUsers || []).forEach((user) => {
                existingMobiles.add(String(user.mobile));
            });
        }

        const seenMobiles = new Set<string>();
        const schoolCache = new Map<string, string>();
        const results: RegistrationResult[] = [];

        // 5. Register students individually
        for (let i = 0; i < students.length; i++) {
            const student = students[i] || ({} as Student);

            const name = String(student.name || "").trim();
            const mobile = String(student.mobile || "").trim();
            const school = String(student.school || "").trim();
            const district = String(student.district || "").trim();
            const grade = String(student.grade || "").trim();
            const age = Number(student.age);

            const password =
                typeof student.password === "string"
                    ? student.password
                    : "";

            const confirmPassword =
                typeof student.confirmPassword === "string"
                    ? student.confirmPassword
                    : "";

            const favouriteFood =
                String(student.favouriteFood || "").trim();

            const suppliedSchoolId =
                String(student.schoolId || "").trim();

            const taluka = String(student.taluka || "").trim();
            const village = String(student.village || "").trim();

            // 6. Validate required fields
            const resultBase = {
                row: i + 4,
                name,
                mobile,
            };

            if (
                !name ||
                !mobile ||
                !school ||
                !district ||
                !grade ||
                !Number.isInteger(age) ||
                age <= 0 ||
                age > 100 ||
                !password.trim() ||
                !confirmPassword.trim() ||
                !favouriteFood
            ) {
                results.push({
                    ...resultBase,
                    status: "error",
                    message:
                        "All required fields must be filled. Please check the student details.",
                });
                continue;
            }

            // 7. Validate Indian mobile number
            if (!/^[6-9]\d{9}$/.test(mobile)) {
                results.push({
                    ...resultBase,
                    status: "error",
                    message: "Enter a valid 10-digit mobile number.",
                });
                continue;
            }

            // 8. Validate password
            if (password.length < 8) {
                results.push({
                    ...resultBase,
                    status: "error",
                    message:
                        "Password must contain at least 8 characters.",
                });
                continue;
            }

            // 9. Confirm password
            if (password !== confirmPassword) {
                results.push({
                    ...resultBase,
                    status: "error",
                    message:
                        "Password and Confirm Password do not match.",
                });
                continue;
            }

            // 10. Check duplicate mobile numbers
            if (
                existingMobiles.has(mobile) ||
                seenMobiles.has(mobile)
            ) {
                results.push({
                    ...resultBase,
                    status: "skipped",
                    message:
                        "Mobile number already registered or duplicated in this file.",
                });
                continue;
            }

            try {
                // 11. Find or create school
                const schoolKey = [
                    suppliedSchoolId.toLowerCase(),
                    school.toLowerCase(),
                    district.toLowerCase(),
                ].join("|");

                let schoolId = schoolCache.get(schoolKey);

                if (!schoolId) {
                    if (suppliedSchoolId) {
                        const {
                            data: existingSchool,
                            error: schoolLookupError,
                        } = await adminClient
                            .from("schools")
                            .select("id, school_name, district")
                            .eq("id", suppliedSchoolId)
                            .maybeSingle();

                        if (schoolLookupError) {
                            throw new Error(schoolLookupError.message);
                        }

                        if (!existingSchool) {
                            throw new Error(
                                `School ID "${suppliedSchoolId}" was not found.`
                            );
                        }

                        const existingSchoolName =
                            String(existingSchool.school_name || "")
                                .trim()
                                .toLowerCase();

                        const existingDistrict =
                            String(existingSchool.district || "")
                                .trim()
                                .toLowerCase();

                        if (
                            existingSchoolName !== school.toLowerCase() ||
                            existingDistrict !== district.toLowerCase()
                        ) {
                            throw new Error(
                                "The School ID does not match the School Name and District."
                            );
                        }

                        schoolId = String(existingSchool.id);
                    } else {
                        const {
                            data: existingSchool,
                            error: schoolLookupError,
                        } = await adminClient
                            .from("schools")
                            .select("id")
                            .ilike("school_name", school)
                            .ilike("district", district)
                            .maybeSingle();

                        if (schoolLookupError) {
                            throw new Error(schoolLookupError.message);
                        }

                        if (existingSchool) {
                            schoolId = String(existingSchool.id);
                        } else {
                            schoolId = randomUUID();

                            const { error: schoolInsertError } =
                                await adminClient
                                    .from("schools")
                                    .insert([
                                        {
                                            id: schoolId,
                                            school_name: school,
                                            district,
                                            taluka,
                                            village,
                                            state: "Maharashtra",
                                        },
                                    ]);

                            if (schoolInsertError) {
                                throw new Error(schoolInsertError.message);
                            }
                        }
                    }

                    schoolCache.set(schoolKey, schoolId);
                }

                // 12. Hash password
                const passwordHash = await bcrypt.hash(password, 12);

                // 13. Set default avatar
                // Students without avatar details get Bunny White.
                const defaultAvatarId = "bunny_white";
                const defaultAvatarUrl =
                    "/avatars/bunny_white_sheet.jpeg";

                const avatarBaseId =
                    String(student.avatarBaseId || "").trim() ||
                    defaultAvatarId;

                const currentAvatarUrl =
                    String(student.currentAvatarUrl || "").trim() ||
                    defaultAvatarUrl;

                // 14. Prepare student record
                const studentRecord = {
                    id: randomUUID(),
                    name,
                    age,
                    mobile,
                    city: district,
                    school,
                    school_id: schoolId,
                    grade,
                    role: "student",
                    password: passwordHash,
                    totalPoints: 0,
                    total_books_read: 0,
                    favourite_food: favouriteFood,

                    avatar_base_id: avatarBaseId,
                    current_avatar_stage: 0,
                    current_avatar_url: currentAvatarUrl,
                };

                // 15. Insert student
                const { error: insertError } =
                    await adminClient
                        .from("users")
                        .insert([studentRecord]);

                if (insertError) {
                    if (insertError.code === "23505") {
                        existingMobiles.add(mobile);

                        results.push({
                            ...resultBase,
                            status: "skipped",
                            message:
                                "Mobile number is already registered.",
                        });
                        continue;
                    }

                    throw new Error(insertError.message);
                }

                // 16. Mark mobile as registered
                seenMobiles.add(mobile);
                existingMobiles.add(mobile);

                results.push({
                    ...resultBase,
                    status: "success",
                    message: "Student registered successfully.",
                    temporaryPassword: password,
                });

            } catch (error) {
                console.error(
                    `Student registration failed for row ${i + 4}:`,
                    error
                );

                results.push({
                    ...resultBase,
                    status: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Registration failed.",
                });
            }
        }

        // 17. Registration summary
        const registered = results.filter(
            (result) => result.status === "success"
        ).length;

        const skipped = results.filter(
            (result) => result.status === "skipped"
        ).length;

        const errors = results.filter(
            (result) => result.status === "error"
        ).length;

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: students.length,
                registered,
                skipped,
                errors,
            },
        });

    } catch (error) {
        console.error("Bulk registration error:", error);

        return NextResponse.json(
            {
                error:
                    "Bulk registration failed. Please try again.",
            },
            { status: 500 }
        );
    }
}
