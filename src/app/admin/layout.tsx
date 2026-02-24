"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BookOpen, LogOut, Loader2 } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        if (isLoginPage) {
            console.log("[AdminLayout] On login page, skipping check.");
            setChecking(false);
            return;
        }

        // Double check session in client side
        const cookieStr = document.cookie;
        const adminSession = cookieStr
            .split("; ")
            .find((row) => row.startsWith("admin_session="))
            ?.split("=")[1];

        console.log("[AdminLayout] Cookie check:", {
            hasCookie: !!adminSession,
            val: adminSession,
            allCookies: cookieStr
        });

        if (!adminSession || adminSession !== "true") {
            console.log("[AdminLayout] Not authorized, redirecting...");
            router.replace("/admin/login");
        } else {
            console.log("[AdminLayout] Authorized.");
            setIsAuthorized(true);
        }
        setChecking(false);
    }, [router, isLoginPage]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // If it's the login page, just render it without the sidebar layout
    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!isAuthorized) return null;

    return (
        <div className="flex min-h-screen bg-gray-100">
            <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col">
                <h1 className="text-xl font-bold mb-8 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6" />
                    Admin Panel
                </h1>

                <nav className="flex-1 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                        <BookOpen className="w-5 h-5" />
                        <span>Dashboard</span>
                    </Link>
                </nav>

                <Link href="/" className="mt-auto flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span>Exit to App</span>
                </Link>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
