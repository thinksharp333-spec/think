// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";

// export async function POST(request: Request) {
//     const { password } = await request.json();
//     const masterPassword = process.env.ADMIN_PASSWORD;

//     if (!masterPassword) {
//         return NextResponse.json({ message: "Admin password not configured in environmental variables" }, { status: 500 });
//     }

//     if (password === masterPassword) {
//         // Set a secure cookie
//         const cookieStore = await cookies();
//         cookieStore.set("admin_session", "true", {
//             httpOnly: false, // Must be false for AdminLayout document.cookie check
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             maxAge: 60 * 60 * 24, // 24 hours
//             path: "/",
//         });

//         return NextResponse.json({ success: true });
//     }

//     return NextResponse.json({ message: "Invalid master password" }, { status: 401 });
// }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const masterPassword = process.env.ADMIN_PASSWORD;

        if (!masterPassword || !process.env.ADMIN_SESSION_SECRET) {
            return NextResponse.json(
                { message: "Admin authentication is not configured." },
                { status: 500 }
            );
        }

        if (password !== masterPassword) {
            return NextResponse.json(
                { message: "Invalid master password" },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();

        // Server-verified cookie for protected API routes
        cookieStore.set("admin_session_secure", createAdminToken(), {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        });

        // Keep the existing UI cookie so your current AdminLayout
        // document.cookie check continues to work.
        cookieStore.set("admin_session", "true", {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24,
            path: "/",
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { message: "Unable to log in." },
            { status: 500 }
        );
    }
}