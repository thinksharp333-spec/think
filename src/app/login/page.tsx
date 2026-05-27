"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Loader2, Sparkles } from "lucide-react";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';

export default function LoginPage() {
    const router = useRouter();
    const { isOnline } = useSync();
    const { user } = useUser();

    // Already Logged In Guard
    useEffect(() => {
        if (user && user.id !== 'local-user' && user.id !== 'local-admin') {
            router.push('/dashboard');
        }
    }, [user, router]);

    const [mobile, setMobile] = useState("");
    const [password, setPassword] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>("");
    const [pendingLogin, setPendingLogin] = useState(false);
    const turnstileRef = useRef<TurnstileInstance>(null);



    // Core login logic — called once we have a valid turnstile token (or offline)
    const doLogin = async (token: string) => {
        setLoading(true);
        try {
            let user;
            let serverError = "";
            if (isOnline) {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile, password, turnstileToken: token }),
                });
                if (res.ok) {
                    const { user: data } = await res.json();
                    // Hash password locally for offline login — server never returns the hash
                    const offlinePasswordHash = await bcrypt.hash(password, 8);
                    // SYNC DOWN: save all cloud fields so dashboard, avatars, and role work offline
                    await db.users.put({
                        id: data.id,
                        name: data.name || 'Student',
                        mobile: data.mobile || '',
                        password: offlinePasswordHash,
                        role: data.role,
                        grade: data.grade,
                        totalPoints: data.total_points ?? data.totalPoints ?? 0,
                        booksRead: data.books_read ?? data.booksRead ?? 0,
                        isVerified: data.is_verified ?? data.isVerified ?? false,
                        school: data.school,
                        city: data.city,
                        age: data.age,
                        schoolId: data.school_id || data.schoolId,
                        favouriteFood: data.favourite_food || data.favouriteFood,
                        avatarBaseId: data.avatar_base_id || data.avatarBaseId,
                        currentAvatarUrl: data.current_avatar_url || data.currentAvatarUrl,
                        currentAvatarStage: data.current_avatar_stage ?? data.currentAvatarStage ?? 0,
                        totalBooksRead: data.total_books_read ?? data.totalBooksRead ?? 0,
                        streak: data.streak ?? 0,
                        lastPointsDate: data.last_points_date || data.lastPointsDate,
                    });
                    user = { ...data, password: offlinePasswordHash };
                } else {
                    const errData = await res.json().catch(() => ({}));
                    serverError = errData.error || "Login failed.";
                }
            }
            if (!user) {
                // Offline fallback: compare entered password against locally stored bcrypt hash
                const localUser = await db.users.where({ mobile: mobile }).first();
                if (localUser && localUser.password) {
                    const match = await bcrypt.compare(password, localUser.password);
                    if (match) {
                        user = localUser;
                        serverError = "";
                    } else if (!isOnline) {
                        serverError = "Incorrect password.";
                    }
                } else if (!isOnline) {
                    serverError = "User not found.";
                }
            }
            if (user) {
                // Clean up guest record and set session cookie for middleware
                await db.users.delete('local-user');
                document.cookie = `user_session=${user.id}; path=/; max-age=86400`;
                router.push("/dashboard");
            } else {
                alert(serverError || "Invalid credentials or user not found.");
                turnstileRef.current?.reset();
                setTurnstileToken("");
            }
        } catch (err) {
            console.error("Login error", err);
            alert("Login failed.");
            turnstileRef.current?.reset();
            setTurnstileToken("");
        } finally {
            setLoading(false);
        }
    };

    // true only when the site key is actually present in the build
    const hasTurnstile = isOnline && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    // When Turnstile resolves after a pending submit, proceed automatically
    useEffect(() => {
        if (pendingLogin && turnstileToken) {
            setPendingLogin(false);
            doLogin(turnstileToken);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingLogin, turnstileToken]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mobile || !password) return;

        if (hasTurnstile && !turnstileToken) {
            // Turnstile is configured but hasn't resolved yet — trigger it and wait
            turnstileRef.current?.execute();
            setPendingLogin(true);
            setLoading(true);
            return;
        }
        // No Turnstile configured (keys not set) OR token already present — login directly
        await doLogin(turnstileToken);
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mobile) {
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                router.push(`/reset-password?mobile=${mobile}`);
            }, 400);
        } else {
            alert("Please enter your mobile number first.");
        }
    };

    return (
        <div className="min-h-screen bg-[#fff9ee] flex flex-col lg:flex-row relative overflow-hidden">
            
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(230,51,41,0.06) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 60%)", transform: "translate(20%, 30%)" }} />

            {/* Back button */}
            <div className="absolute top-6 left-6 z-20">
                <Link href="/" className="btn-outline text-xs py-2 px-4 shadow-[0_3px_0_#111] bg-white">
                    <ArrowLeft className="h-3.5 w-3.5" /> Home
                </Link>
            </div>

            {/* LEFT COLUMN: VISUALS (Hidden on mobile) */}
            <div className="flex-1 hidden lg:flex flex-col flex-wrap items-center justify-center p-12 relative z-10 pt-20">
                <div className="w-full max-w-lg text-center mb-10">
                    <div className="animate-pop-in" style={{ animationDelay: "0ms" }}>
                        <span className="chip chip-gold mb-6 shadow-[0_3px_0_#111]">
                            <Sparkles className="h-3.5 w-3.5 text-[#e63329]" /> Welcome Explorer
                        </span>
                    </div>
                    <h1 className="comic-title text-6xl text-[#111] leading-[1.1] animate-pop-in" style={{ animationDelay: "150ms" }}>
                        Ready for your<br/>
                        <span className="text-[#e63329]">Next Adventure?</span>
                    </h1>
                </div>

                {/* Monster Mascot Illustration */}
                <div className="relative animate-float" style={{ animationDelay: "300ms", transform: "scale(1.15)" }}>
                    <svg width="320" height="380" viewBox="0 0 320 380" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="160" cy="240" rx="105" ry="112" fill="#e63329" stroke="#111" strokeWidth="4"/>
                        <ellipse cx="160" cy="260" rx="62" ry="70" fill="#ff8070"/>
                        <ellipse cx="160" cy="120" rx="88" ry="82" fill="#e63329" stroke="#111" strokeWidth="4"/>
                        <polygon points="100,52 82,8 120,48" fill="#c62020" stroke="#111" strokeWidth="3"/>
                        <polygon points="220,52 238,8 200,48" fill="#c62020" stroke="#111" strokeWidth="3"/>
                        <ellipse cx="78" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3"/>
                        <ellipse cx="242" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3"/>
                        <ellipse cx="132" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3"/>
                        <ellipse cx="188" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3"/>
                        <circle cx="136" cy="114" r="11" fill="#111"/>
                        <circle cx="192" cy="114" r="11" fill="#111"/>
                        <circle cx="140" cy="109" r="4" fill="white"/>
                        <circle cx="196" cy="109" r="4" fill="white"/>
                        <path d="M130 147 Q160 168 190 147" stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                        <rect x="148" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2"/>
                        <rect x="162" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2"/>
                        <path d="M55 230 Q30 210 42 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none"/>
                        <ellipse cx="42" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                        <path d="M265 230 Q290 210 278 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none"/>
                        <ellipse cx="278" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                        <rect x="102" y="272" width="116" height="76" rx="8" fill="#fff4ba" stroke="#111" strokeWidth="3.5"/>
                        <line x1="160" y1="272" x2="160" y2="348" stroke="#111" strokeWidth="2.5"/>
                        <line x1="112" y1="290" x2="156" y2="290" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="112" y1="302" x2="156" y2="302" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="112" y1="314" x2="156" y2="314" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="112" y1="326" x2="148" y2="326" stroke="#e63329" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="165" y1="290" x2="207" y2="290" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="165" y1="302" x2="207" y2="302" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                        <line x1="165" y1="314" x2="207" y2="314" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                        <ellipse cx="120" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                        <ellipse cx="200" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                        <rect x="20" y="170" width="28" height="36" rx="4" fill="#ff8070" stroke="#111" strokeWidth="2" transform="rotate(-15 34 188)"/>
                        <rect x="272" y="150" width="28" height="36" rx="4" fill="#fff4ba" stroke="#111" strokeWidth="2" transform="rotate(12 286 168)"/>
                        <rect x="40" y="300" width="22" height="28" rx="3" fill="#fde8e8" stroke="#111" strokeWidth="2" transform="rotate(20 51 314)"/>
                    </svg>
                </div>
            </div>

            {/* RIGHT COLUMN: LOGIN FORM */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
                <div className="w-full max-w-sm">
                    {/* The Card */}
                    <div className="card w-full flex flex-col p-8 sm:p-10 relative bg-white border-4 border-[#111] shadow-[0_12px_0_#111]">
                        
                        <div className="text-center mb-8">
                            <h2 className="comic-title text-4xl text-[#e63329] mb-2 tracking-wide uppercase">Login!</h2>
                            <p className="text-[#555] font-bold">Pick up where you left off</p>
                        </div>

                        {!showForgotPassword ? (
                            <form onSubmit={handleLogin} className="w-full space-y-5">
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-black uppercase tracking-wider text-[#111]">Mobile Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#888]" />
                                            <input type="tel" placeholder="10-digit mobile number" className="comic-input pl-14 text-lg font-bold"
                                                style={{ paddingLeft: "3.5rem" }}
                                                value={mobile} onChange={(e) => setMobile(e.target.value)} required pattern="[0-9]{10}" />
                                        </div>
                                    </div>

                                    <div>
                                        <input type="password" placeholder="Password" className="comic-input text-lg font-bold"
                                            style={{ paddingLeft: "1.2rem" }}
                                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        <div className="flex justify-end mt-2">
                                            <button type="button" onClick={() => setShowForgotPassword(true)}
                                                className="text-xs font-black uppercase tracking-wide text-[#f59e0b] hover:text-[#e63329] hover:underline transition-colors">
                                                Forgot password?
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {isOnline && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                                    <div className="flex flex-col items-center mt-2 gap-1">
                                        <Turnstile
                                            ref={turnstileRef}
                                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                                            options={{ execution: "execute", theme: "light" }}
                                            onSuccess={(token) => setTurnstileToken(token)}
                                            onExpire={() => { setTurnstileToken(""); turnstileRef.current?.reset(); }}
                                            onError={() => {
                                                setPendingLogin(false);
                                                setLoading(false);
                                                alert("Security check failed. Please try again.");
                                            }}
                                        />
                                        {pendingLogin && !turnstileToken && (
                                            <p className="text-xs text-[#888] font-bold animate-pulse">
                                                🔒 Running security check…
                                            </p>
                                        )}
                                        {turnstileToken && (
                                            <p className="text-xs text-green-600 font-bold">
                                                ✓ Security check passed
                                            </p>
                                        )}
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="btn-red w-full py-5 mt-2 text-2xl font-black tracking-widest relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                                    {loading ? <Loader2 className="h-7 w-7 animate-spin mx-auto" /> : "Go!"}
                                </button>

                                <div className="pt-5 mt-2 text-center border-t-2 border-dashed border-[#111]/10">
                                    <p className="text-[#555] font-bold text-sm">
                                        Don&apos;t have an account?{' '}
                                        <Link href="/signup" className="text-[#e63329] font-black uppercase hover:underline inline-block mt-1">
                                            Register Here!
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="w-full space-y-5">
                                <p className="font-bold text-[#555] leading-relaxed text-center">
                                    Enter your mobile number and we&apos;ll send you back into the story.
                                </p>
                                <div className="relative pt-2">
                                    <Phone className="absolute left-5 top-1/2 -translate-y-[calc(50%-4px)] h-5 w-5 text-[#888]" />
                                    <input type="tel" placeholder="Registered Mobile" className="comic-input pl-14 text-base font-bold"
                                        style={{ paddingLeft: "3.5rem" }}
                                        value={mobile} onChange={(e) => setMobile(e.target.value)} required pattern="[0-9]{10}" />
                                </div>
                                <div className="pt-4 space-y-3">
                                    <button type="submit" disabled={loading} className="btn-red w-full py-4 text-lg font-black uppercase">
                                        {loading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : "Reset Password"}
                                    </button>
                                    <button type="button" onClick={() => setShowForgotPassword(false)} className="btn-outline w-full py-4 text-sm font-black uppercase">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
            
        </div>
    );
}
