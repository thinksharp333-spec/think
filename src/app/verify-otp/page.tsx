"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabase";

export default function VerifyOtpPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "signup"; // signup or reset
    const mobile = searchParams.get("mobile");

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(30);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!mobile) {
            router.push("/signup");
            return;
        }

        const interval = setInterval(() => {
            setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [mobile, router]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullOtp = otp.join("");
        if (fullOtp.length < 6) return;

        setVerifying(true);
        setError("");

        // SIMULATED OTP LOGIC
        setTimeout(async () => {
            if (fullOtp === "123456") { // Hardcoded for demo
                try {
                    // 1. Mark local users as verified to avoid mismatches
                    const allUsers = await db.users.toArray();
                    for (const u of allUsers) {
                        await db.users.update(u.id, {
                            isVerified: true,
                            verifiedMobile: mobile!
                        });
                    }

                    // 2. Sync to Supabase if online
                    if (supabase && mobile) {
                        await supabase
                            .from('users')
                            .update({ is_verified: true, verified_mobile: mobile })
                            .eq('mobile', mobile);
                    }

                    setVerifying(false);
                    setSuccess(true);

                    // Immediate redirect or short delay
                    setTimeout(() => {
                        if (mode === "signup") {
                            router.replace("/dashboard");
                        } else {
                            router.replace(`/reset-password?mobile=${mobile}`);
                        }
                    }, 2000);
                } catch (err) {
                    setError("Database error. Please try again.");
                    setVerifying(false);
                }
            } else {
                setError("Invalid verification code. Use 123456 for demo.");
                setVerifying(false);
            }
        }, 1500);
    };

    const handleResend = () => {
        if (timer > 0) return;
        setTimer(30);
        alert("A new OTP has been sent to " + mobile);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
                <div className="text-center animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Successful!</h2>
                    <p className="text-gray-500">Redirecting you to your {mode === "signup" ? "dashboard" : "password reset"}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center text-black">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                    <Smartphone className="w-8 h-8" />
                </div>

                <h2 className="text-2xl font-bold text-gray-800">Verify your Number</h2>
                <p className="text-gray-500 mt-2">
                    We've sent a 6-digit code to <br />
                    <span className="font-semibold text-gray-900">{mobile}</span>
                </p>

                <div className="flex justify-between gap-2 mt-8 mb-6">
                    {otp.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-12 h-14 border-2 border-gray-100 rounded-xl text-center text-xl font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white bg-gray-50 outline-none transition-all"
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                        />
                    ))}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-medium mb-6 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleVerify}
                    disabled={verifying || otp.some(d => !d)}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-200 hover:shadow-green-300 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-6"
                >
                    {verifying ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                        </>
                    ) : (
                        <>
                            Verify & Continue <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

                <div className="text-sm">
                    <p className="text-gray-500">
                        Didn't receive the code? {" "}
                        {timer > 0 ? (
                            <span className="font-semibold text-gray-700">Resend in {timer}s</span>
                        ) : (
                            <button
                                onClick={handleResend}
                                className="font-bold text-blue-600 hover:underline"
                            >
                                Resend Now
                            </button>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
