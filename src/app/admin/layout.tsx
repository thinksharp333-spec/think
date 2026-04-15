"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    BookOpen,
    LogOut,
    Loader2,
    BarChart3,
    ChevronRight,
} from "lucide-react";

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
            setChecking(false);
            return;
        }

        const cookieStr = document.cookie;
        const adminSession = cookieStr
            .split("; ")
            .find((row) => row.startsWith("admin_session="))
            ?.split("=")[1];

        if (!adminSession || adminSession !== "true") {
            router.replace("/admin/login");
        } else {
            setIsAuthorized(true);
        }
        setChecking(false);
    }, [router, isLoginPage]);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    const handleLogout = () => {
        document.cookie = "admin_session=; path=/; max-age=0";
        router.replace("/admin/login");
    };

    const navItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ];

    return (
        <div className="flex min-h-screen bg-[#f7f8fa]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* Sidebar */}
            <aside className="w-56 bg-white border-r border-zinc-100 min-h-screen flex flex-col shrink-0">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-zinc-900 rounded-lg flex items-center justify-center">
                            <BookOpen className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-zinc-900 leading-none">ThinkSharp</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">Admin Console</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group ${
                                    isActive
                                        ? "bg-zinc-100 text-zinc-900 font-medium"
                                        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{label}</span>
                                {isActive && (
                                    <ChevronRight className="w-3 h-3 ml-auto text-zinc-400" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-zinc-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 rounded-md transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
