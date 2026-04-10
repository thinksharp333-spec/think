"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ArrowLeft, Phone, Calendar, WifiOff, Sparkles, WandSparkles, Footprints } from "lucide-react";
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
        confirmPassword: ""
    });
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
                isVerified: false
            };

            // 1. Save to Cloud (Supabase)
            if (supabase) {
                try {
                    const { error: supabaseError } = await supabase
                        .from('users')
                        .insert([
                            {
                                id: userData.id,
                                name: userData.name,
                                age: userData.age,
                                mobile: userData.mobile,
                                city: userData.city,
                                school: userData.school,
                                school_id: userData.schoolId,
                                grade: userData.grade,
                                role: userData.role,
                                password: userData.password,
                                totalPoints: 0
                            }
                        ]);

                    if (supabaseError) {
                        console.warn("Cloud sync failed:", supabaseError.message);
                        throw new Error("Cloud Registration Failed: " + supabaseError.message);
                    } else {
                        console.log("Supabase insert successful!");
                    }
                } catch (cloudErr: unknown) {
                    console.error("Cloud connection error:", cloudErr);
                    throw new Error(getErrorMessage(cloudErr) || "Cloud connection failed");
                }
            } else {
                console.warn("Supabase not configured.");
                throw new Error("System configuration error: Cloud database unavailable.");
            }

            // 2. Save Local (Dexie) - Keeping for offline cache/session
            await db.users.add(userData);

            // Set as current local user
            await db.users.delete('local-user');
            await db.users.put({
                ...userData,
                id: 'local-user'
            });

            // Set session cookie for middleware
            document.cookie = `user_session=${id}; path=/; max-age=86400`;

            // Redirect to OTP verification
            router.push(`/verify-otp?mobile=${formData.mobile}&mode=signup`);

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
                                Pick Your Hero Profile!
                            </h2>
                            <div className="mt-6 space-y-5">
                                <div className="comic-card bg-[linear-gradient(180deg,#fff2ef_0%,#fff8f0_100%)] p-5">
                                    <p className="text-xl font-extrabold text-[#111111]">Quest Map: Step 2 of 3</p>
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-[#ff4d3d]" />
                                            <p className="mt-2 text-xl font-bold">Sign Up</p>
                                        </div>
                                        <div className="h-[3px] flex-1 bg-[#111111]" />
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-[#ffdf6b]" />
                                            <p className="mt-2 text-xl font-bold">Choose Avatar</p>
                                        </div>
                                        <div className="h-[3px] flex-1 bg-[#111111]" />
                                        <div className="text-center">
                                            <div className="mx-auto h-12 w-12 rounded-full border-[3px] border-[#111111] bg-white" />
                                            <p className="mt-2 text-xl font-bold">Start Reading!</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="comic-card flex flex-col items-center gap-3 bg-[#fff0ec] p-4 text-center">
                                        <Sparkles className="h-8 w-8 text-[#db3125]" />
                                        <p className="text-sm font-black uppercase">Dreamer</p>
                                    </div>
                                    <div className="comic-card flex flex-col items-center gap-3 bg-[#fff7da] p-4 text-center">
                                        <WandSparkles className="h-8 w-8 text-[#db3125]" />
                                        <p className="text-sm font-black uppercase">Wizard</p>
                                    </div>
                                    <div className="comic-card flex flex-col items-center gap-3 bg-[#edf8df] p-4 text-center">
                                        <Footprints className="h-8 w-8 text-[#db3125]" />
                                        <p className="text-sm font-black uppercase">Explorer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="relative hidden h-full min-h-[720px] items-center justify-center lg:flex">
                        <div className="comic-zigzag h-[620px] w-[150px] border-[5px] border-[#111111] bg-[linear-gradient(180deg,#ff5a49_0%,#d92f22_100%)] shadow-[0_16px_35px_rgba(0,0,0,0.18)]" />
                        <div className="comic-burst absolute left-1 top-14 h-20 w-20 bg-[#111111]" />
                        <div className="comic-burst absolute right-2 top-72 h-16 w-16 bg-[#ff4d3d] opacity-90" />
                        <div className="comic-burst absolute left-5 bottom-10 h-20 w-20 bg-[#111111]" />
                    </div>

                    <section className="px-2 lg:px-6">
                        <div className="mx-auto max-w-xl">
                    <form onSubmit={handleSignUp} className="space-y-4">
                        {error && (
                            <div className="comic-card bg-[#fff0ef] p-3 text-center text-sm font-black text-[#db3125]">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-xl font-extrabold text-[#111111]">Your Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111111]" />
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Pick a Username"
                                    className="comic-input pl-12 text-xl font-bold"
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
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={!isOnline || isLoading}
                            className="comic-button-dark mt-6 flex w-full items-center justify-center gap-3 px-8 py-4 text-3xl font-black disabled:cursor-not-allowed disabled:opacity-60"
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
