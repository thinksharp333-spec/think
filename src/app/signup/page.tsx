"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ArrowLeft, Phone, Calendar, WifiOff, CheckCircle2, Utensils } from "lucide-react";
import { AVATARS, getAvatarUrl } from "@/lib/avatar";
import { AvatarStageImage } from "@/components/avatar-stage-image";
import { db } from "@/lib/db";

import { useSync } from "@/hooks/useSync";
import { supabase } from "@/lib/supabase";
import { SchoolSelector } from "@/components/school-selector";

export default function SignUpPage() {
    const router = useRouter();
    const { isOnline } = useSync();

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        age: "",
        mobile: "",
        city: "",
        school: "",
        schoolId: "",
        grade: "",
        customSchool: "",
        password: "",
        confirmPassword: "",
        favouriteFood: ""
    });
    const [selectedAvatarId, setSelectedAvatarId] = useState<string>("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSchoolSelect = (schoolId: string, schoolName: string, district: string, taluka: string) => {
        void taluka;
        setFormData(prev => ({ ...prev, schoolId, school: schoolName, city: district }));
    };

    const getErrorMessage = (err: unknown) => {
        if (err instanceof Error) return err.message;
        return "Failed to create account. Please try again.";
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!isOnline) {
            setError("You must be online to create a new account.");
            return;
        }

        if (!selectedAvatarId) {
            setError("Please choose your avatar character.");
            return;
        }

        if (!formData.schoolId) {
            setError("Please select your school.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            // ID Generation (using a consistent format, or could rely on Supabase auth.users if using Auth)
            // For now, continuing with the custom ID pattern as per request context
            const id = `student-${Date.now()}`;

            const finalSchoolName = formData.schoolId === "other" ? formData.customSchool : formData.school;

            const initialAvatarUrl = getAvatarUrl(selectedAvatarId, 0);

            const userData = {
                id,
                name: formData.name,
                age: Number(formData.age),
                mobile: formData.mobile,
                city: formData.city,
                school: finalSchoolName,
                schoolId: formData.schoolId,
                grade: formData.grade,
                role: 'student',
                password: formData.password,
                totalPoints: 0,
                isVerified: true,
                favouriteFood: formData.favouriteFood,
                // Avatar system
                avatarBaseId:       selectedAvatarId,
                currentAvatarStage: 0,
                currentAvatarUrl:   initialAvatarUrl,
                totalBooksRead:     0,
            };

            // 1. Save to Cloud via server-side API (bypasses RLS)
            const signupRes = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            if (!signupRes.ok) {
                const { error: signupErr } = await signupRes.json();
                throw new Error(signupErr || 'Cloud Registration Failed');
            }

            // 2. Save Local (Dexie) - Keeping for offline cache/session
            await db.users.put(userData);

            // Set as current local user
            await db.users.delete('local-user');
            await db.users.put(userData);

            // Set session cookie for middleware
            document.cookie = `user_session=${id}; path=/; max-age=86400`;

            // Redirect to dashboard (OTP bypassed)
            router.push(`/dashboard`);

        } catch (err: unknown) {
            console.error("Signup failed", err);
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen overflow-hidden bg-[#fffaf1] px-4 py-5 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between">
                    <Link href="/" className="comic-chip inline-flex items-center gap-2 px-4 py-2 text-sm font-black uppercase tracking-wide text-[#111111]">
                        <ArrowLeft className="h-4 w-4" />
                        Back Home
                    </Link>
                    {!isOnline && (
                        <div className="comic-chip inline-flex items-center gap-2 bg-[#ffefef] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#db3125]">
                            <WifiOff className="h-4 w-4" />
                            Connect to sign up
                        </div>
                    )}
                </div>

                <h1 className="comic-title text-center text-4xl leading-none text-[#db3125] md:text-7xl">
                    Join the Reading Club
                </h1>

                <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_170px_1fr]">
                    <section className="px-2 lg:px-6">
                        <div className="mx-auto max-w-md">
                            <h2 className="text-4xl font-extrabold leading-tight text-[#111111] md:text-5xl">
                                Pick Your Avatar
                            </h2>
                            <div className="mt-6 space-y-5">
                                {/* ── Quest Map step tracker ── */}
                                <div className="comic-card bg-[linear-gradient(180deg,#fff2ef_0%,#fff8f0_100%)] p-5">
                                    <p className="text-xl font-extrabold text-[#111111]">Quest Map: Step 2 of 3</p>
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-[#ff4d3d]" />
                                            <p className="mt-2 text-xl font-bold">Sign Up</p>
                                        </div>
                                        <ArrowRight className="h-8 w-8 text-[#111111] opacity-70" strokeWidth={3} />
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-[#ffdf6b]" />
                                            <p className="mt-2 text-xl font-bold">Choose Avatar</p>
                                        </div>
                                        <ArrowRight className="h-8 w-8 text-[#111111] opacity-70" strokeWidth={3} />
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-white" />
                                            <p className="mt-2 text-xl font-bold">Start Reading!</p>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Avatar Picker ── */}
                                <p className="text-sm font-black uppercase tracking-widest text-[#db3125]">
                                    Choose your companion — it evolves as you read!
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {AVATARS.map((avatar) => {
                                        const isSelected = selectedAvatarId === avatar.id;
                                        return (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                onClick={() => setSelectedAvatarId(avatar.id)}
                                                className="comic-card relative overflow-hidden flex flex-col text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                style={{
                                                    border: isSelected ? `3px solid ${avatar.color}` : '3px solid #111',
                                                    boxShadow: isSelected ? `0 6px 0 ${avatar.color}` : '0 4px 0 #111',
                                                    padding: 0,
                                                }}
                                            >
                                                {/* Selected checkmark */}
                                                {isSelected && (
                                                    <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-[2px] border-[#111] shadow"
                                                        style={{ background: avatar.color }}>
                                                        <CheckCircle2 className="h-4 w-4 text-white" />
                                                    </span>
                                                )}

                                                {/* Evolution sheet banner — full 3-stage panorama */}
                                                <div
                                                    className="w-full"
                                                    style={{
                                                        height: 90,
                                                        backgroundImage: `url(${avatar.sheetUrl})`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundColor: avatar.bgColor,
                                                    }}
                                                />

                                                {/* Label row */}
                                                <div className="flex items-center gap-2 px-3 py-2"
                                                    style={{ backgroundColor: isSelected ? avatar.bgColor : '#fafafa' }}>
                                                    {/* Stage 0 avatar thumbnail */}
                                                    <AvatarStageImage
                                                        avatarBaseId={avatar.id}
                                                        stage={0}
                                                        size={36}
                                                        style={{ border: `2px solid ${avatar.color}` }}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black uppercase leading-none"
                                                            style={{ color: isSelected ? avatar.color : '#111' }}>
                                                            {avatar.name}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] font-bold text-[#777] leading-tight truncate">
                                                            {avatar.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* ── Evolution path for selected avatar ── */}
                                {selectedAvatarId && (() => {
                                    const av = AVATARS.find(a => a.id === selectedAvatarId)!;
                                    const milestones = ['Start', '50 books', '120 books', '200 books'];
                                    return (
                                        <div className="comic-card overflow-hidden" style={{ border: `3px solid ${av.color}` }}>
                                            <div className="px-4 py-2" style={{ backgroundColor: av.color }}>
                                                <p className="text-xs font-black uppercase tracking-widest text-white">
                                                    {av.name} Evolution Path
                                                </p>
                                            </div>
                                            <div className="flex items-stretch divide-x-[2px] divide-[#eee]"
                                                style={{ backgroundColor: av.bgColor }}>
                                                {av.stageNames.map((stageName, i) => (
                                                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5 px-1 py-3">
                                                        <AvatarStageImage
                                                            avatarBaseId={av.id}
                                                            stage={i}
                                                            size={44}
                                                            style={{
                                                                border: `2px solid ${i === 0 ? av.color : '#ddd'}`,
                                                                opacity: i === 0 ? 1 : 0.75,
                                                            }}
                                                        />
                                                        <p className="text-[9px] font-black text-center leading-tight"
                                                            style={{ color: i === 0 ? av.color : '#555' }}>
                                                            {stageName}
                                                        </p>
                                                        <p className="text-[8px] text-[#999] font-bold">{milestones[i]}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </section>

                    <div className="relative hidden h-full min-h-[720px] flex-col items-center justify-center gap-[60px] lg:flex animate-float z-0" style={{ animationDuration: '4s' }}>
                        {/* Connecting dashed line in bg */}
                        <div className="absolute top-[15%] bottom-[15%] left-1/2 w-[4px] -ml-[2px] border-r-4 border-dashed border-[#ffdf6b] opacity-60 z-[-1]" />
                        
                        {/* Floating Red Book */}
                        <div className="relative ml-8">
                            <svg width="80" height="90" viewBox="0 0 80 90" fill="none" className="rotate-[-8deg] drop-shadow-[0_8px_0_#111]">
                                <rect x="10" y="10" width="60" height="74" rx="6" fill="#e63329" stroke="#111" strokeWidth="4"/>
                                <path d="M 25 10 L 25 84" stroke="#111" strokeWidth="4"/>
                                <circle cx="45" cy="45" r="14" fill="#fff" stroke="#111" strokeWidth="3" />
                                <path d="M 40 40 L 50 50 M 50 40 L 40 50" stroke="#111" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <svg width="30" height="30" viewBox="0 0 100 100" fill="none" className="absolute -top-6 -left-6 rotate-[15deg]">
                                <path d="M50 0 L58 42 L100 50 L58 58 L50 100 L42 58 L0 50 L42 42 Z" fill="#fff" stroke="#111" strokeWidth="6" strokeLinejoin="round"/>
                            </svg>
                        </div>

                        {/* Giant Spinny Starburst */}
                        <div className="relative -ml-4 z-10">
                            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" className="drop-shadow-[0_6px_0_#111]" style={{ animation: 'spin 12s linear infinite' }}>
                                <path d="M50 0 L64 36 L100 50 L64 64 L50 100 L36 64 L0 50 L36 36 Z" fill="#ffdf6b" stroke="#111" strokeWidth="5" strokeLinejoin="round"/>
                            </svg>
                        </div>

                        {/* Floating Yellow Book */}
                        <div className="relative ml-6">
                            <svg width="80" height="90" viewBox="0 0 80 90" fill="none" className="rotate-[12deg] drop-shadow-[0_8px_0_#111]">
                                <rect x="10" y="10" width="60" height="74" rx="6" fill="#ffdf6b" stroke="#111" strokeWidth="4"/>
                                <path d="M 25 10 L 25 84" stroke="#111" strokeWidth="4"/>
                                <line x1="38" y1="30" x2="62" y2="30" stroke="#111" strokeWidth="4" strokeLinecap="round"/>
                                <line x1="38" y1="45" x2="55" y2="45" stroke="#111" strokeWidth="4" strokeLinecap="round"/>
                                <line x1="38" y1="60" x2="58" y2="60" stroke="#111" strokeWidth="4" strokeLinecap="round"/>
                            </svg>
                        </div>
                        
                        {/* Four-point Sparkle Bottom */}
                        <div className="relative -ml-8">
                            <svg width="50" height="50" viewBox="0 0 100 100" fill="none" className="rotate-[30deg] drop-shadow-[0_4px_0_#111]">
                                <path d="M50 10 Q50 50 90 50 Q50 50 50 90 Q50 50 10 50 Q50 50 50 10 Z" fill="#ff4d3d" stroke="#111" strokeWidth="4" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    <section className="px-2 lg:px-6">
                        <div className="mx-auto max-w-xl">
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111111]">Your Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Pick a Username"
                                    className="comic-input pl-12 text-xl font-bold"
                                    style={{ paddingLeft: "3rem" }}
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="mb-2 block text-xl font-extrabold text-[#111111]">Age</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                    <input
                                        type="number"
                                        name="age"
                                        placeholder="Your Age"
                                        className="comic-input pl-12 text-xl font-bold"
                                        style={{ paddingLeft: "3rem" }}
                                        value={formData.age}
                                        onChange={handleChange}
                                        required
                                        min="4"
                                        max="18"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-xl font-extrabold text-[#111111]">Grade</label>
                                <select
                                    name="grade"
                                    className="comic-input comic-select px-4 text-xl font-bold"
                                    value={formData.grade}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                                    required
                                >
                                    <option value="">Select</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => (
                                        <option key={g} value={g}>Class {g}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xl font-extrabold text-[#111111]">Mobile</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                    <input
                                        type="tel"
                                        name="mobile"
                                        placeholder="Mobile"
                                        className="comic-input pl-12 text-lg font-bold"
                                        style={{ paddingLeft: "3rem" }}
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        required
                                        pattern="[0-9]{10}"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <SchoolSelector
                                onSelect={handleSchoolSelect}
                                selectedSchoolId={formData.schoolId}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111111]">Favourite Food</label>
                            <div className="relative">
                                <Utensils className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                <input
                                    type="text"
                                    name="favouriteFood"
                                    placeholder="e.g. Pav Bhaji, Puranpoli"
                                    className="comic-input pl-12 text-lg font-bold"
                                    style={{ paddingLeft: "3rem" }}
                                    value={formData.favouriteFood}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <p className="mt-2 text-xs font-bold text-[#db3125]">
                                <CheckCircle2 className="inline-block h-3 w-3 mr-1" />
                                Remember this! You will need it if you forget your password.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-xl font-extrabold text-[#111111]">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Create a password"
                                        className="comic-input pl-12 text-lg font-bold"
                                        style={{ paddingLeft: "3rem" }}
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-2 block text-xl font-extrabold text-[#111111]">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Confirm password"
                                        className="comic-input pl-12 text-lg font-bold"
                                        style={{ paddingLeft: "3rem" }}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="comic-card bg-[#fff0ef] p-3 text-center text-sm font-black text-[#db3125] mt-2 animate-pop-in">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!isOnline || isLoading}
                            className="btn-dark mt-6 flex w-full items-center justify-center gap-3 px-8 py-4 text-3xl font-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? "Creating Account..." : (!isOnline ? "Offline - Connect to Sign Up" : "Create Account")}
                            {!isLoading && isOnline && <ArrowRight className="h-6 w-6" />}
                        </button>

                        <div className="pt-4 text-center text-base font-bold text-[#5f5852]">
                            Already have an account? <Link href="/login" className="font-black uppercase text-[#db3125] hover:underline">Sign In</Link>
                        </div>
                    </form>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
