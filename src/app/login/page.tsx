"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, User, Lock, ArrowRight, ArrowLeft, Wifi, WifiOff, Phone, Loader2 } from "lucide-react";
import { db } from "@/lib/db";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const { isOnline } = useSync();
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetSubmitted, setResetSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Toggle Forgot Password View
    const toggleForgotPassword = () => {
        setShowForgotPassword(!showForgotPassword);
        setResetSubmitted(false);
        setResetEmail("");
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (mobile.length > 0 && password.length > 0) {

            try {
                let user;

                if (isOnline && supabase) {
                    // Online: Check Supabase first
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('mobile', mobile) // Query by mobile number
                        .eq('password', password)
                        .single();

                    if (error || !data) {
                        console.log("Cloud login failed, trying local...");
                    } else {
                        user = data;
                        // SYNC DOWN: Update local DB with latest cloud data
                        await db.users.put({
                            ...data,
                            id: data.id
                        });
                    }
                }

                if (!user) {
                    // Offline or Cloud failed: Check Local Dexie
                    const localUser = await db.users.where({ mobile: mobile }).first();
                    if (localUser && localUser.password === password) {
                        user = localUser;
                    }
                }

                if (user) {
                    // Set as current local user session
                    await db.users.delete('local-user');
                    await db.users.put({
                        ...user,
                        id: 'local-user'
                    });

                    // Set session cookie for middleware
                    document.cookie = `user_session=${user.id}; path=/; max-age=86400`;

                    // Always go to dashboard after successful login
                    router.push("/dashboard");
                } else {
                    alert("Invalid credentials or user not found.");
                }

            } catch (err) {
                console.error("Login error", err);
                alert("Login failed.");
            }
        }
    };

    const handleForgotPassword = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate sending Reset OTP
        if (mobile) {
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                router.push(`/verify-otp?mobile=${mobile}&mode=reset`);
            }, 800);
        } else {
            alert("Please enter your mobile number first.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col items-center justify-center p-4">

            {/* Back to Home Link */}
            <div className="absolute top-6 left-6">
                <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors font-medium text-sm group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Home
                </Link>
            </div>

            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all">

                {/* Header Section */}
                <div className="bg-green-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-green-700 opacity-20 transform -skew-y-6 origin-top-left"></div>

                    <div className="relative z-10">
                        <div className="absolute top-0 right-0 p-2">
                            {isOnline ? <Wifi className="w-5 h-5 text-green-200" /> : <WifiOff className="w-5 h-5 text-red-200" />}
                        </div>
                        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
                            <BookOpen className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-wide">
                            {showForgotPassword ? "Reset Password" : "Welcome Back!"}
                        </h2>
                        <p className="text-green-100 text-sm mt-2 opacity-90">
                            {showForgotPassword ? "Recover access to your account" : "Sign in to continue learning"}
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    {!showForgotPassword ? (
                        /* LOGIN FORM */
                        <form onSubmit={handleLogin} className="space-y-6 text-black">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                                        <input
                                            type="tel"
                                            placeholder="Enter your Mobile Number"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                            value={mobile}
                                            onChange={(e) => setMobile(e.target.value)}
                                            required
                                            pattern="[0-9]{10}"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-semibold text-gray-700">Password</label>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="text-right mt-2">
                                        <button
                                            type="button"
                                            onClick={toggleForgotPassword}
                                            className="text-xs text-green-600 hover:text-green-700 font-bold hover:underline"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                Login to Dashboard <ArrowRight className="w-4 h-4" />
                            </button>

                            <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
                                Don't have an account? <Link href="/signup" className="text-green-600 font-bold hover:underline">Create Account</Link>
                            </div>
                        </form>
                    ) : (
                        /* FORGOT PASSWORD FORM */
                        <form onSubmit={handleForgotPassword} className="space-y-6 text-black animate-in fade-in slide-in-from-right-4 duration-300">
                            <p className="text-sm text-gray-500">
                                Please confirm your registered mobile number to receive a verification code.
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Registered Mobile</label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-green-500 transition-colors" />
                                    <input
                                        type="tel"
                                        placeholder="Enter your Mobile Number"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white"
                                        value={mobile}
                                        onChange={(e) => setMobile(e.target.value)}
                                        required
                                        pattern="[0-9]{10}"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset OTP"}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleForgotPassword}
                                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-all text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer Note */}
            <p className="mt-8 text-xs text-gray-400 font-medium">
                &copy; 2024 ThinkSharp Foundation
            </p>

        </div>
    );
}
