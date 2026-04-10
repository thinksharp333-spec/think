"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wifi, WifiOff, Phone, Loader2, Rocket, Bot, Sparkles, Footprints, WandSparkles, ChevronRight, BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const { isOnline } = useSync();
    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const emojiPasswordChoices = [
        { icon: Rocket, color: "bg-[#ff4d3d]", label: "Rocket" },
        { icon: Bot, color: "bg-[#ffb13d]", label: "Robot" },
        { icon: Sparkles, color: "bg-[#ffd95c]", label: "Star" },
        { icon: Footprints, color: "bg-[#9ed86d]", label: "Dino" },
        { icon: WandSparkles, color: "bg-[#6fa7ff]", label: "Wizard" },
    ];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mobile.length > 0 && password.length > 0) {
            setLoading(true);
            try {
                let user;
                if (isOnline && supabase) {
                    const { data, error } = await supabase.from('users').select('*').eq('mobile', mobile).eq('password', password).single();
                    if (!error && data) {
                        user = data;
                        // SYNC DOWN: Update local DB with latest cloud data
                        // Map Supabase snake_case columns to local camelCase
                        await db.users.put({
                            id: 'local-user',
                            name: data.name || 'Student',
                            mobile: data.mobile || '',
                            password: data.password,
                            totalPoints: data.totalPoints || data.total_points || 0,
                            booksRead: data.books_read || data.booksRead || 0,
                            isVerified: data.isVerified || data.is_verified,
                            school: data.school,
                            city: data.city,
                            age: data.age,
                            schoolId: data.schoolId || data.school_id,
                        });
                    }
                }
                if (!user) {
                    const localUser = await db.users.where({ mobile: mobile }).first();
                    if (localUser && localUser.password === password) user = localUser;
                }
                if (user) {
                    await db.users.delete('local-user');
                    await db.users.put({
                        id: 'local-user',
                        name: user.name || 'Student',
                        mobile: user.mobile || '',
                        password: user.password,
                        totalPoints: user.totalPoints || user.total_points || 0,
                        booksRead: user.books_read || user.booksRead || 0,
                        isVerified: user.isVerified || user.is_verified,
                        school: user.school,
                        city: user.city,
                        age: user.age,
                        schoolId: user.schoolId || user.school_id,
                    });

                    // Set session cookie for middleware
                    document.cookie = `user_session=${user.id}; path=/; max-age=86400`;
                    router.push("/dashboard");
                } else {
                    alert("Invalid credentials or user not found.");
                }
            } catch (err) {
                console.error("Login error", err);
                alert("Login failed.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleForgotPassword = (e: React.FormEvent) => {
        e.preventDefault();
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
        <div className="login-shell">

            {/* ── LEFT PANEL: Login form ─────────────────────────────── */}
            <div className="login-left relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#e63329]" />
                <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(230,51,41,0.08) 0%, transparent 70%)" }} />
                <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)" }} />

                {/* Back button */}
                <div className="absolute top-6 left-6">
                    <Link href="/" className="btn-outline text-xs py-2 px-4">
                        <ArrowLeft className="h-3.5 w-3.5" /> Home
                    </Link>
                </div>
                {/* Online indicator */}
                <div className="absolute top-6 right-6">
                    <span className={`chip text-xs ${isOnline ? 'bg-[#edf8df]' : 'bg-[#ffece5]'}`}>
                        {isOnline ? <Wifi className="h-3.5 w-3.5 text-green-600" /> : <WifiOff className="h-3.5 w-3.5 text-red-500" />}
                        {isOnline ? "Online" : "Offline"}
                    </span>
                </div>

                <div className="relative flex flex-col items-center w-full max-w-md mx-auto px-4">
                    {/* Mascot character */}
                    <div className="mb-6 animate-float">
                        <svg width="90" height="110" viewBox="0 0 90 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <ellipse cx="45" cy="68" rx="30" ry="32" fill="#e63329" stroke="#111" strokeWidth="3" />
                            <ellipse cx="45" cy="35" rx="24" ry="22" fill="#e63329" stroke="#111" strokeWidth="3" />
                            <polygon points="28,14 22,2 36,12" fill="#c62020" stroke="#111" strokeWidth="2" />
                            <polygon points="62,14 68,2 54,12" fill="#c62020" stroke="#111" strokeWidth="2" />
                            <ellipse cx="36" cy="32" rx="8" ry="9" fill="white" stroke="#111" strokeWidth="2" />
                            <ellipse cx="54" cy="32" rx="8" ry="9" fill="white" stroke="#111" strokeWidth="2" />
                            <circle cx="37" cy="33" r="4" fill="#111" />
                            <circle cx="55" cy="33" r="4" fill="#111" />
                            <circle cx="38.5" cy="31.5" r="1.5" fill="white" />
                            <circle cx="56.5" cy="31.5" r="1.5" fill="white" />
                            <path d="M36 44 Q45 52 54 44" stroke="#111" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                            <rect x="41" y="44" width="5" height="6" rx="1" fill="white" stroke="#111" strokeWidth="1.5" />
                            <rect x="48" y="44" width="5" height="6" rx="1" fill="white" stroke="#111" strokeWidth="1.5" />
                            <path d="M15 70 Q6 62 10 80" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
                            <ellipse cx="10" cy="85" rx="10" ry="8" fill="#e63329" stroke="#111" strokeWidth="2.5" />
                            <path d="M75 70 Q84 62 80 80" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
                            <ellipse cx="80" cy="85" rx="10" ry="8" fill="#e63329" stroke="#111" strokeWidth="2.5" />
                            <rect x="28" y="82" width="34" height="22" rx="4" fill="#fff4ba" stroke="#111" strokeWidth="2.5" />
                            <line x1="45" y1="82" x2="45" y2="104" stroke="#111" strokeWidth="1.5" />
                            <ellipse cx="32" cy="104" rx="10" ry="6" fill="#e63329" stroke="#111" strokeWidth="2.5" />
                            <ellipse cx="58" cy="104" rx="10" ry="6" fill="#e63329" stroke="#111" strokeWidth="2.5" />
                        </svg>
                    </div>

                    <h1 className="comic-title text-4xl text-[#e63329] text-center mb-2">Login to Your Adventure!</h1>
                    <p className="text-[#555] font-bold text-sm text-center mb-8">Welcome back, young reader!</p>

                    {!showForgotPassword ? (
                        <form onSubmit={handleLogin} className="w-full space-y-5">
                            <div className="relative">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#aaa]" />
                                <input type="tel" placeholder="Mobile Number" className="comic-input pl-14 text-lg font-bold"
                                    value={mobile} onChange={(e) => setMobile(e.target.value)} required pattern="[0-9]{10}" />
                            </div>

                            <div>
                                <p className="font-black text-[#111] uppercase tracking-wide text-sm mb-3">Pick Your Emoji Password</p>
                                <div className="flex gap-3 flex-wrap">
                                    {emojiPasswordChoices.map(({ icon: Icon, color, label }, index) => (
                                        <button key={index} type="button" onClick={() => setPassword(String(index + 1))}
                                            className={`${color} h-16 w-16 flex items-center justify-center rounded-2xl border-[3px] border-[#111] shadow-[0_6px_0_#111] transition-all hover:-translate-y-1 active:translate-y-1 ${password === String(index + 1) ? 'ring-4 ring-[#111]' : ''}`}
                                            title={label}>
                                            <Icon className="h-8 w-8 text-[#111]" />
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-3">
                                    <input type="password" placeholder="Or type your password" className="comic-input text-base font-bold"
                                        value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                <button type="button" onClick={() => setShowForgotPassword(true)}
                                    className="mt-2 text-sm font-black uppercase tracking-wide text-[#e63329] hover:underline">
                                    Forgot password?
                                </button>
                            </div>

                            <button type="submit" disabled={loading}
                                className="btn-red w-full py-5 text-3xl font-black tracking-wide">
                                {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : "Go!"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="w-full space-y-5">
                            <p className="font-bold text-[#555] leading-relaxed">Enter your mobile number and we&apos;ll send you back into the story.</p>
                            <div className="relative">
                                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#aaa]" />
                                <input type="tel" placeholder="Registered Mobile Number" className="comic-input pl-14 text-base font-bold"
                                    value={mobile} onChange={(e) => setMobile(e.target.value)} required pattern="[0-9]{10}" />
                            </div>
                            <button type="submit" disabled={loading} className="btn-red w-full py-4 text-xl font-black uppercase">
                                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Send Reset OTP"}
                            </button>
                            <button type="button" onClick={() => setShowForgotPassword(false)} className="btn-outline w-full py-4 text-sm font-black uppercase">
                                Cancel
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: Sign-up teaser ────────────────────────── */}
            <div className="login-right relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(230,51,41,0.15) 0%, transparent 65%)", transform: "translate(30%, -30%)" }} />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 65%)", transform: "translate(-30%, 30%)" }} />

                {/* Lightning divider effect */}
                <div className="absolute top-1/2 -left-[1px] -translate-y-1/2 z-10">
                    <div className="divider-zigzag w-8 h-32 opacity-80" />
                </div>

                <div className="relative max-w-md mx-auto px-4 w-full">
                    {/* Step tracker */}
                    <div className="card-flat bg-white/10 border-white/20 p-5 mb-8">
                        <p className="font-black text-white text-center text-sm uppercase tracking-widest mb-4">Quest Map: Step 1 of 3</p>
                        <div className="flex items-center">
                            <div className="text-center flex-1">
                                <div className="w-10 h-10 rounded-full border-[3px] border-white bg-[#e63329] mx-auto animate-pulse-ring" />
                                <p className="mt-2 text-sm font-black text-white">Sign Up</p>
                            </div>
                            <div className="flex-1 h-[3px] bg-white/30 mx-2" />
                            <div className="text-center flex-1">
                                <div className="w-10 h-10 rounded-full border-[3px] border-white/40 bg-white/10 mx-auto" />
                                <p className="mt-2 text-sm font-bold text-white/60">Choose Avatar</p>
                            </div>
                            <div className="flex-1 h-[3px] bg-white/30 mx-2" />
                            <div className="text-center flex-1">
                                <div className="w-10 h-10 rounded-full border-[3px] border-white/40 bg-white/10 mx-auto" />
                                <p className="mt-2 text-sm font-bold text-white/60">Start Reading!</p>
                            </div>
                        </div>
                    </div>

                    <h2 className="comic-title text-4xl text-white leading-tight mb-8">
                        Join the Reading Club &amp; Start Your Quest!
                    </h2>

                    <div className="space-y-4">
                        <input className="comic-input bg-white/10 border-white/30 text-white placeholder:text-white/40 text-lg font-bold" placeholder="Pick a Username" readOnly />
                        <input className="comic-input bg-white/10 border-white/30 text-white placeholder:text-white/40 text-lg font-bold" placeholder="Your Age" readOnly />
                        <div>
                            <p className="font-black text-white uppercase tracking-wide text-sm mb-2">Choose Your Buddy</p>
                            <div className="comic-input bg-white/10 border-white/30 flex items-center justify-between text-white/50 font-bold">
                                <span>Choose Your Buddy</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-9 w-9 rounded-full border-2 border-white/30 bg-white/20" />
                                    <div className="h-9 w-9 rounded-full border-2 border-white/30 bg-[#f3aa8f]/60" />
                                    <div className="h-9 w-9 rounded-full border-2 border-white/30 bg-[#b79dfd]/60" />
                                    <ChevronRight className="h-5 w-5 rotate-90 text-white/50" />
                                </div>
                            </div>
                        </div>
                        <Link href="/signup" className="btn-dark w-full py-5 text-3xl font-black text-center block">
                            Go!
                        </Link>
                    </div>

                    {/* Bottom badge */}
                    <div className="mt-10 flex items-center gap-3 justify-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#e63329] border-2 border-white/20">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="comic-title text-white text-sm">Reading Adventure</p>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wide">1000+ quests waiting</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
