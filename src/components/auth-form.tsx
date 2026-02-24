"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Mail, User, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";

interface AuthFormProps {
    mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
    const router = useRouter();
    const [userType, setUserType] = useState<"student" | "admin">("student");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const mergeLocalData = async (userId: string) => {
        const localUser = await db.users.get('local-user');
        if (localUser && localUser.totalPoints > 0) {
            await db.syncQueue.add({
                type: 'UPDATE_POINTS',
                payload: { pointsEarned: localUser.totalPoints },
                createdAt: Date.now()
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!supabase) {
            setError("Supabase is not configured.");
            setLoading(false);
            return;
        }

        try {
            const authEmail = userType === "student"
                ? `${phone}@student.example.com`
                : email;

            if (mode === "signup") {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email: authEmail,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            role: userType
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    await supabase.from("users").upsert({
                        id: data.user.id,
                        name: name,
                        role: userType,
                        total_points: 0
                    });
                    await mergeLocalData(data.user.id);
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email: authEmail,
                    password
                });

                if (signInError) throw signInError;

                if (data.user) {
                    await mergeLocalData(data.user.id);
                }
            }

            router.push("/");
            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setUserType("student")}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${userType === "student" ? "bg-green-50 text-green-700 border-b-2 border-green-500" : "text-gray-500 hover:bg-gray-50"}`}
                >
                    Student Login
                </button>
                <button
                    onClick={() => setUserType("admin")}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${userType === "admin" ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500" : "text-gray-500 hover:bg-gray-50"}`}
                >
                    Admin Login
                </button>
            </div>

            <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {mode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    {userType === "student"
                        ? "Enter your mobile number to continue learning."
                        : "Enter your administrator credentials."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === "signup" && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>
                    )}

                    {userType === "student" ? (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Mobile Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} // Only numbers
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="9876543210"
                                    minLength={10}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="admin@school.org"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
              ${userType === "student" ? "bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-200" : "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-200"}
            `}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                {mode === "login" ? "Sign In" : "Create Account"}
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    {mode === "login" ? (
                        <p>
                            New here?{" "}
                            <Link href="/signup" className="font-semibold text-gray-800 hover:underline">
                                Create an account
                            </Link>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{" "}
                            <Link href="/login" className="font-semibold text-gray-800 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
