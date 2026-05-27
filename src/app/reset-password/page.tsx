"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, CheckCircle2, Loader2, AlertCircle, Utensils } from "lucide-react";
import { db } from "@/lib/db";
import { Turnstile } from '@marsidev/react-turnstile';

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mobile = searchParams.get("mobile");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [favouriteFood, setFavouriteFood] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string>("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (!favouriteFood) {
            setError("Please enter your favourite food.");
            return;
        }
        if (!turnstileToken) {
            setError("Please complete the security check.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // First call the server to validate food and update cloud DB
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, favouriteFood, newPassword: password, turnstileToken }),
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to reset password.");
            }

            // Then update local offline copy
            const user = await db.users.where({ mobile: mobile || "" }).first();
            if (user) {
                await db.users.update(user.id, { password });
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#fff9ee] flex items-center justify-center p-6 text-black z-10 relative">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(230,51,41,0.06) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
                <div className="card w-full max-w-sm flex flex-col p-8 sm:p-10 text-center relative bg-white border-4 border-[#111] shadow-[0_12px_0_#111] animate-pop-in">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#111] bg-[#e63329] shadow-[0_6px_0_#111] mb-6">
                        <CheckCircle2 className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="comic-title text-3xl md:text-4xl text-[#111] uppercase tracking-wide mb-2">Password Reset!</h2>
                    <p className="font-bold text-[#555] mb-6">Your password has been updated. Get ready to explore!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fff9ee] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
            
            <div className="card w-full max-w-md flex flex-col p-8 sm:p-10 relative bg-white border-4 border-[#111] shadow-[0_12px_0_#111] z-10">
                <div className="text-center mb-8">
                    <h2 className="comic-title text-4xl text-[#e63329] mb-2 tracking-wide uppercase">New Password</h2>
                    <p className="text-[#555] font-bold">Secure your account</p>
                </div>

                <form onSubmit={handleReset} className="w-full space-y-5">
                    {error && (
                        <div className="comic-card bg-[#fff0ef] p-3 text-center text-sm font-black text-[#db3125]">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111]">Favourite Food</label>
                            <div className="relative">
                                <Utensils className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888]" />
                                <input
                                    type="text"
                                    placeholder="Your favourite food"
                                    className="comic-input pl-14 text-lg font-bold"
                                    style={{ paddingLeft: "3.5rem" }}
                                    value={favouriteFood}
                                    onChange={(e) => setFavouriteFood(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111]">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888]" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="comic-input pl-14 text-lg font-bold"
                                    style={{ paddingLeft: "3.5rem" }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111]">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888]" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="comic-input pl-14 text-lg font-bold"
                                    style={{ paddingLeft: "3.5rem" }}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                        <div className="flex justify-center mt-4">
                            <Turnstile
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                onSuccess={(token) => { setTurnstileToken(token); setError(""); }}
                                onError={() => setError("Security check failed. Please try again.")}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !turnstileToken}
                        className="btn-red w-full py-5 mt-4 text-2xl font-black tracking-widest relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        {loading ? <Loader2 className="h-7 w-7 animate-spin mx-auto" /> : "Update Password"}
                    </button>
                    
                    <div className="pt-5 mt-2 text-center border-t-2 border-dashed border-[#111]/10">
                        <button type="button" onClick={() => router.push("/login")} className="text-xs font-black uppercase text-[#555] hover:text-[#e63329] transition-colors">
                            Cancel & Go Back
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordContent />
        </Suspense>
    );
}
