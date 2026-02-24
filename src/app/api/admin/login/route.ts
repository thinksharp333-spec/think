import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
    const { password } = await request.json();
    const masterPassword = process.env.ADMIN_PASSWORD;

    if (!masterPassword) {
        return NextResponse.json({ message: "Admin password not configured in environmental variables" }, { status: 500 });
    }

    if (password === masterPassword) {
        // Set a secure cookie
        const cookieStore = await cookies();
        cookieStore.set("admin_session", "true", {
            httpOnly: false, // Must be false for AdminLayout document.cookie check
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // 24 hours
            path: "/",
        });

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Invalid master password" }, { status: 401 });
}
