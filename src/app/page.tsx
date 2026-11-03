"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LogIn,
  LogOut,
  Star,
  ArrowRight,
  LayoutDashboard,
  Sparkles,
  Trophy,
  Zap,
  Book,
  Rocket,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getThumbnailUrl } from "@/lib/google-drive";

export default function LandingPage() {
  // Authentication state
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check the custom login cookie and Supabase session.
useEffect(() => {
  const checkAuthentication = () => {
    const sessionCookie = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("user_session="));

    let sessionId = "";

    try {
      sessionId = sessionCookie
        ? decodeURIComponent(
            sessionCookie.substring("user_session=".length)
          )
        : "";
    } catch {
      sessionId = "";
    }

    const hasValidSession =
      Boolean(sessionId) &&
      sessionId !== "local-user" &&
      sessionId !== "local-admin";

    setIsLoggedIn(hasValidSession);
    setAuthChecked(true);
  };

  checkAuthentication();

  window.addEventListener(
    "user-session-changed",
    checkAuthentication
  );

  return () => {
    window.removeEventListener(
      "user-session-changed",
      checkAuthentication
    );
  };
}, []);

  // Logout handler
  // const handleLogout = async () => {
  //   try {
  //     if (supabase) {
  //       const { error } = await supabase.auth.signOut();

  //       if (error) {
  //         console.error("Supabase logout error:", error.message);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Logout error:", error);
  //   } finally {
  //     // Clear the custom cookie created by /api/login.
  //     document.cookie =
  //       "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

  //     setIsLoggedIn(false);
  //     window.location.href = "/";
  //   }
  // };

const handleLogout = async () => {
    try {
        // Clear the student session cookie
        document.cookie =
            "user_session=; path=/; max-age=0; SameSite=Lax";

        // Update navbar immediately
        setIsLoggedIn(false);

        // Notify other components
        window.dispatchEvent(new Event("user-session-changed"));

        // Clear Supabase Auth session
        if (supabase) {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("Supabase logout error:", error.message);
            }
        }

        // Save toast message before redirect
        sessionStorage.setItem(
            "logoutToast",
            "Logged out successfully!"
        );

        // Redirect to Login page
        window.location.replace("/login");

    } catch (error) {
        console.error("Logout failed:", error);
    }
};


  const howItWorks = [
    {
      step: "1",
      emoji: "🧑‍🚀",
      title: "Create Your Character",
      text: "Pick your reader identity, join your school, and begin your quest.",
      bg: "bg-[#fff2ef]",
      accent: "#ff4d3d",
    },
    {
      step: "2",
      emoji: "📚",
      title: "Read & Earn Rewards",
      text: "Finish books, leave reviews, and collect points like badges.",
      bg: "bg-[#fff9ee]",
      accent: "#f59e0b",
    },
    {
      step: "3",
      emoji: "🏰",
      title: "Unlock New Worlds",
      text: "Climb the rankings and discover fresh stories every week.",
      bg: "bg-green-50",
      accent: "#22c55e",
    },
  ];

  const mediaReviews = [
    {
      source: "The Hindu",
      text: "App helps bridge urban-rural educational divide in Maharashtra",
      link: "https://share.google/tKiwqa4aASjvUZqPY",
      bg: "bg-red-50",
      accent: "#e63329",
    },
    {
      source: "Forbes India",
      text: "How this NGO brought the joy of learning to thousands of underprivileged children pan-India during the pandemic",
      link: "https://share.google/OAiVG0Uuh7ZAWf1lZ",
      bg: "bg-blue-50",
      accent: "#3b82f6",
    },
  ];

  const [topReader, setTopReader] = useState({
    name: "Reader",
    points: 0,
  });

  const [topBook, setTopBook] = useState({
    title: "Story",
    info: "9.5/10 — Top rated!",
  });

  const [counts, setCounts] = useState({
    readers: "10K+",
    books: "700+",
  });

  const [featuredBook, setFeaturedBook] = useState<any>(null);

  // Fetch homepage statistics and featured book.
  useEffect(() => {
    let active = true;

    async function fetchStats() {
      if (!supabase) return;

      try {
        const { data: u } = await supabase
          .from("users")
          .select("name, totalPoints")
          .order("totalPoints", { ascending: false })
          .limit(1)
          .single();

        if (!active) return;

        if (u) {
          setTopReader({
            name: u.name,
            points: u.totalPoints,
          });
        }

        const { data: bSorted } = await supabase
          .from("books")
          .select("title, avg_rating")
          .order("avg_rating", { ascending: false })
          .limit(1)
          .single();

        if (!active) return;

        if (bSorted) {
          setTopBook({
            title: bSorted.title,
            info: bSorted.avg_rating
              ? `${bSorted.avg_rating}/10 — highest rated!`
              : "Top rated entry!",
          });
        }

        const { count: userCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        const { count: bookCount } = await supabase
          .from("books")
          .select("*", { count: "exact", head: true });

        if (!active) return;

        setCounts({
          readers: userCount !== null ? `${userCount}` : "10K+",
          books: bookCount !== null ? `${bookCount}` : "700+",
        });

        // Daily featured book logic.
        const { data: allBooks } = await supabase
          .from("books")
          .select('title, "fileId", subject, "coverUrl", level');

        if (!active) return;

        if (allBooks && allBooks.length > 0) {
          const dayOfYear = Math.floor(
            new Date().getTime() / (1000 * 60 * 60 * 24)
          );

          const index = dayOfYear % allBooks.length;
          const selected = allBooks[index];

          setFeaturedBook({
            title: selected.title,
            author: selected.subject || "ThinkSharp",
            info: `Level: ${selected.level || "Standard"} — A wonderful story for young readers.`,
            cover:
              selected.coverUrl ||
              (selected.fileId
                ? getThumbnailUrl(selected.fileId)
                : ""),
          });
        }
      } catch (error) {
        console.error("Failed to fetch homepage statistics:", error);
      }
    }

    fetchStats();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-shell" style={{ background: "var(--cream)" }}>

      {/* ── Sticky Navbar ─────────────────────────────────────────── */}
      <nav className="site-nav">
        <div className="flex items-center justify-between px-3 py-2 md:px-10 md:py-3 min-h-[60px] md:min-h-[70px]">

          {/* Logo */}
          <div className="flex justify-start flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 group relative">
              <div className="relative h-10 md:h-14 flex-shrink-0">
                <img
                  src="/digi-library-logo.png"
                  alt="DigiLibrary Logo"
                  className="h-full w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          <div className="flex-1" />

          {/* Navigation links and actions */}
          <div className="flex items-center justify-end gap-2 md:gap-6 flex-shrink-0">

            <div className="hidden lg:flex items-center gap-4">
              <a
                href="https://www.thinksharpfoundation.org/about-us.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white text-sm font-black uppercase tracking-wide transition-all"
              >
                About Us
              </a>
            </div>

            {/* Wait until authentication is checked. */}
            {!authChecked ? (
              <div
                className="w-24 h-10"
                aria-label="Checking login status"
              />
            ) : isLoggedIn ? (
              <div className="flex items-center gap-2">

                <Link
                  href="/dashboard"
                  className="btn-red py-1.5 px-3 md:py-2 md:px-5 text-xs md:text-sm"
                >
                  <LayoutDashboard className="h-4 w-4 md:mr-1 inline-block" />
                  <span className="hidden sm:inline">
                    Dashboard
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-white/60 hover:text-white px-2 py-1.5 md:px-3 md:py-2 rounded-full hover:bg-white/10 text-xs md:text-sm font-bold transition-all flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Logout
                  </span>
                </button>

              </div>
            ) : (
              <Link
                href="/login"
                className="btn-red py-1.5 px-3 md:py-2.5 md:px-6 text-xs md:text-sm whitespace-nowrap shadow-[0_4px_0_#991b1b] flex items-center gap-1"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Login
                </span>
              </Link>
            )}

          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{
          minHeight: "calc(100vh - 68px)",
          background: "var(--cream)",
        }}
      >
        {/* Background blobs */}
        <div
          className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(230,51,41,0.08) 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />

        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
            transform: "translate(-30%, 30%)",
          }}
        />

        <div className="relative flex flex-col lg:flex-row items-stretch h-full">

          {/* LEFT: Hero copy */}
          <div className="flex-1 flex flex-col justify-center px-3 py-16 md:px-10">

            <div
              className="animate-pop-in flex flex-col items-start"
              style={{ animationDelay: "0ms" }}
            >
              <div className="flex items-center gap-2 mb-6 md:mb-8 -mt-6 md:-mt-12">
                <span className="text-[11px] md:text-xs font-bold uppercase tracking-widest text-[#555]">
                  An initiative by
                </span>

                <img
                  src="/logo.png"
                  alt="ThinkSharp Foundation"
                  className="h-7 md:h-8 w-auto"
                />
              </div>

              <span className="chip chip-red mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Story Powered Learning
              </span>
            </div>

            <h1
              className="comic-title text-4xl leading-[1] text-[#111111] md:text-6xl xl:text-7xl animate-pop-in"
              style={{ animationDelay: "80ms" }}
            >
              Embark on<br />
              <span style={{ color: "var(--red)" }}>
                Your Reading
              </span>
              <br />
              Adventure!
            </h1>

            <div
              className="mt-10 flex flex-wrap gap-4 animate-pop-in"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href={
                  !authChecked
                    ? "/login"
                    : isLoggedIn
                      ? "/dashboard"
                      : "/signup"
                }
                className="btn-red text-lg px-10 py-5"
              >
                {!authChecked
                  ? "Login"
                  : isLoggedIn
                    ? "Continue Reading"
                    : "Login/Register"}

                <Star className="h-5 w-5 fill-white" />
              </Link>

              <Link
                href="#reviews"
                className="btn-outline text-base px-8 py-5"
              >
                Reviews
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Stats row */}
            <div
              className="mt-10 flex gap-6 flex-wrap animate-pop-in"
              style={{ animationDelay: "320ms" }}
            >
              <div className="card-flat px-6 py-4">
                <p
                  className="comic-title text-4xl"
                  style={{ color: "var(--red)" }}
                >
                  {counts.readers}
                </p>

                <p className="text-xs font-black uppercase tracking-wider text-[#555]">
                  Young Readers
                </p>
              </div>

              <div className="card-flat px-6 py-4">
                <p
                  className="comic-title text-4xl"
                  style={{ color: "var(--red)" }}
                >
                  {counts.books}
                </p>

                <p className="text-xs font-black uppercase tracking-wider text-[#555]">
                  Books Available
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Monster mascot + floating cards */}
          <div className="flex-1 flex items-center justify-center relative py-10 lg:py-0 min-h-[440px]">

            {/* Floating card 1 */}
            <div
              className="hidden lg:block absolute top-12 left-8 card-flat p-4 max-w-[160px] animate-float"
              style={{ animationDelay: "0s" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy
                  className="h-4 w-4"
                  style={{ color: "var(--gold)" }}
                />

                <span className="font-black text-xs uppercase tracking-wide text-[#111]">
                  Top Reader
                </span>
              </div>

              <p className="font-bold text-xs text-[#555]">
                {topReader.name} scored {topReader.points} pts!
              </p>
            </div>

            {/* Floating card 2 */}
            <div className="hidden lg:block absolute bottom-44 right-10 card-flat p-4 max-w-[170px] animate-float-delay">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-black text-sm text-[#111]">
                  {topBook.title}
                </span>
              </div>

              <p className="font-bold text-xs text-[#555]">
                {topBook.info}
              </p>
            </div>

            {/* Floating Rocket */}
            <div
              className="hidden lg:block absolute top-[25%] left-[5%] animate-float"
              style={{ animationDelay: "1.2s" }}
            >
              <Rocket className="h-10 w-10 text-[#f59e0b] fill-[#f59e0b]/20 rotate-[15deg]" />
            </div>

            {/* Floating Book Icon */}
            <div className="hidden sm:flex absolute top-20 right-10 w-16 h-16 items-center justify-center animate-wiggle">
              <Book className="h-8 w-8 text-[#111]" />
            </div>

            {/* Monster SVG */}
            <div
              className="animate-float -mt-16 md:-mt-24 lg:-mt-32 xl:-mt-40"
              style={{ animationDelay: "0.5s" }}
            >
              <svg
                width="100%"
                viewBox="0 0 320 380"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  maxWidth: 320,
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }}
              >
                <ellipse cx="160" cy="240" rx="105" ry="112" fill="#e63329" stroke="#111" strokeWidth="4" />
                <ellipse cx="160" cy="260" rx="62" ry="70" fill="#ff8070" />
                <ellipse cx="160" cy="120" rx="88" ry="82" fill="#e63329" stroke="#111" strokeWidth="4" />

                <polygon points="100,52 82,8 120,48" fill="#c62020" stroke="#111" strokeWidth="3" />
                <polygon points="220,52 238,8 200,48" fill="#c62020" stroke="#111" strokeWidth="3" />

                <ellipse cx="78" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3" />
                <ellipse cx="242" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3" />

                <ellipse cx="132" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3" />
                <ellipse cx="188" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3" />

                <circle cx="136" cy="114" r="11" fill="#111" />
                <circle cx="192" cy="114" r="11" fill="#111" />

                <circle cx="140" cy="109" r="4" fill="white" />
                <circle cx="196" cy="109" r="4" fill="white" />

                <path d="M130 147 Q160 168 190 147" stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none" />

                <rect x="148" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2" />
                <rect x="162" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2" />

                <path d="M55 230 Q30 210 42 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
                <ellipse cx="42" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5" />

                <path d="M265 230 Q290 210 278 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none" />
                <ellipse cx="278" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5" />

                <rect x="102" y="272" width="116" height="76" rx="8" fill="#fff4ba" stroke="#111" strokeWidth="3.5" />
                <line x1="160" y1="272" x2="160" y2="348" stroke="#111" strokeWidth="2.5" />

                <line x1="112" y1="290" x2="156" y2="290" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="112" y1="302" x2="156" y2="302" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="112" y1="314" x2="156" y2="314" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="112" y1="326" x2="148" y2="326" stroke="#e63329" strokeWidth="2" strokeLinecap="round" />

                <line x1="165" y1="290" x2="207" y2="290" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="165" y1="302" x2="207" y2="302" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="165" y1="314" x2="207" y2="314" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />

                <ellipse cx="120" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5" />
                <ellipse cx="200" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5" />

                <rect x="20" y="170" width="28" height="36" rx="4" fill="#ff8070" stroke="#111" strokeWidth="2" transform="rotate(-15 34 188)" />
                <rect x="272" y="150" width="28" height="36" rx="4" fill="#fff4ba" stroke="#111" strokeWidth="2" transform="rotate(12 286 168)" />
                <rect x="40" y="300" width="22" height="28" rx="3" fill="#fde8e8" stroke="#111" strokeWidth="2" transform="rotate(20 51 314)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-14 lg:px-20" style={{ background: "#fff" }}>
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <span className="chip chip-red mb-4 mx-auto">
              <Zap className="h-3.5 w-3.5" />
              How It Works
            </span>

            <h2 className="comic-title text-3xl md:text-5xl text-[#111]">
              Three Simple Steps
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div
                key={i}
                className={`step-card ${item.bg}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className="absolute -top-5 -left-3 w-12 h-12 rounded-full border-[3px] border-[#111] flex items-center justify-center font-black text-xl text-white shadow-[0_6px_0_#111]"
                  style={{ background: item.accent }}
                >
                  {item.step}
                </div>

                <div className="text-6xl mb-5 mt-2">
                  {item.emoji}
                </div>

                <h3 className="comic-title text-2xl text-[#111] uppercase mb-3">
                  {item.title}
                </h3>

                <p className="font-bold text-[#3a3a3a] leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Media Reviews ────────────────────────────────────────── */}
      <section
        id="reviews"
        className="py-20 px-6 md:px-14 lg:px-20"
        style={{ background: "var(--cream)" }}
      >
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-14">
            <span className="chip chip-red mb-4 mx-auto">
              <Sparkles className="h-3.5 w-3.5" />
              Reviews
            </span>

            <h2 className="comic-title text-3xl md:text-5xl text-[#111]">
              Voices of Users
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {mediaReviews.map((item, i) => (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                key={i}
                className={`step-card ${item.bg} flex flex-col justify-center hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer border-2 border-transparent hover:border-[#111]`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="font-bold text-[#3a3a3a] leading-relaxed italic mb-4 text-lg">
                  &quot;{item.text}&quot;
                </p>

                <div className="mt-auto pt-4 flex items-center justify-between">
                  <p className="comic-title text-lg text-[#111] uppercase tracking-wide">
                    — {item.source}
                  </p>

                  <ArrowRight className="h-5 w-5 text-[#111] opacity-50" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Book ────────────────────────────────────────── */}
      {featuredBook && (
        <section
          className="py-20 px-6 md:px-14 lg:px-20"
          style={{ background: "var(--cream)" }}
        >
          <div className="max-w-6xl mx-auto">

            <div className="text-center mb-10">
              <span className="chip chip-red mx-auto">
                <Star className="h-3.5 w-3.5 fill-white" />
                Featured Book of the Day
                <Star className="h-3.5 w-3.5 fill-white" />
              </span>
            </div>

            <div className="card p-0 overflow-hidden grid md:grid-cols-[280px_1fr]">

              {/* Book cover */}
              <div
                className="flex items-center justify-center p-10 md:p-8 relative"
                style={{
                  background:
                    "linear-gradient(160deg,#12263a 0%,#25476b 45%,#e84a3a 100%)",
                }}
              >
                {featuredBook.cover ? (
                  <img
                    src={featuredBook.cover}
                    alt={featuredBook.title}
                    className="max-h-[220px] shadow-2xl rounded-lg"
                  />
                ) : (
                  <div className="text-center">
                    <p className="comic-title text-3xl text-[#ffd75b] leading-tight text-balance">
                      {featuredBook.title}
                    </p>

                    <div className="mt-8 inline-block bg-white/15 rounded-xl px-4 py-2 text-sm font-bold text-white">
                      By {featuredBook.author}
                    </div>
                  </div>
                )}
              </div>

              {/* Book info */}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h2 className="text-4xl font-extrabold leading-tight text-[#111] md:text-5xl">
                  {featuredBook.title}
                </h2>

                <p className="mt-4 text-lg font-bold leading-relaxed text-[#3a3a3a] max-w-xl">
                  {featuredBook.info}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    href={
                      !authChecked
                        ? "/login"
                        : isLoggedIn
                          ? "/dashboard"
                          : "/signup"
                    }
                    className="btn-red text-sm px-8 py-4"
                  >
                    Read This Book
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="py-5 px-6 md:px-14 lg:px-20"
        style={{
          background: "var(--red)",
          borderTop: "2px solid var(--red-dark)",
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">

          {/* LEFT: Contact Us */}
          <div className="text-white text-left space-y-2 flex-1">
            <h4 className="comic-title text-base uppercase tracking-wider">
              Contact Us
            </h4>

            <div className="text-white/80 font-bold text-[11px] space-y-1.5">
              <p>
                <span className="text-white text-[9px] uppercase tracking-widest">
                  Mumbai
                </span>{" "}
                — Flat no 1401, BLD NO 4B, Dreams Complex, LBS Road, Bhandup West, Mumbai 400 078.
              </p>

              <p>
                <span className="text-white text-[9px] uppercase tracking-widest">
                  Pune
                </span>{" "}
                — CIII Center, S.M Joshi College Campus, Hadapsar, Pune 411 028.
              </p>

              <p>
                +91 9892742011 &nbsp;|&nbsp;
                info@thinksharpfoundation.org &nbsp;|&nbsp;

                <a
                  href="https://www.thinksharpfoundation.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-white/30 hover:text-white"
                >
                  www.thinksharpfoundation.org
                </a>
              </p>
            </div>
          </div>

          {/* MIDDLE: Developers */}
          <div className="text-left space-y-2 flex-1 md:ml-12">
            <h4 className="comic-title text-base text-white uppercase tracking-wider">
              Developers
            </h4>

            <div className="flex flex-col gap-y-1.5 text-white">

              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider opacity-90">
                Puneet Rathi

                <a
                  href="https://www.linkedin.com/in/puneet-rathi-513465286/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Linkedin size={14} />
                </a>

                <a
                  href="https://www.instagram.com/rathipuneet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Instagram size={14} />
                </a>
              </span>

              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider opacity-90">
                Shreehari Soni

                <a
                  href="https://www.linkedin.com/in/shreeharisoni/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Linkedin size={14} />
                </a>
              </span>

              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider opacity-90">
                Utsavi Bagri

                <a
                  href="https://www.linkedin.com/in/utsavi-bagri-6a3530284/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Linkedin size={14} />
                </a>

                <a
                  href="https://www.instagram.com/utsavi_bagri?igsh=MzRhaWszNXhzcXVv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Instagram size={14} />
                </a>
              </span>

            </div>
          </div>

          {/* RIGHT: Connect */}
          <div className="text-left space-y-2">
            <h4 className="comic-title text-base text-white uppercase tracking-wider">
              Connect
            </h4>

            <div className="flex gap-2">

              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-white/10 rounded flex items-center justify-center hover:bg-white/25 transition-all"
              >
                <Facebook className="h-3.5 w-3.5 text-white" />
              </a>

              <a
                href="https://x.com/thinksharpfound"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-white/10 rounded flex items-center justify-center hover:bg-white/25 transition-all"
              >
                <Twitter className="h-3.5 w-3.5 text-white" />
              </a>

              <a
                href="https://www.instagram.com/thinksharp_foundation/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-white/10 rounded flex items-center justify-center hover:bg-white/25 transition-all"
              >
                <Instagram className="h-3.5 w-3.5 text-white" />
              </a>

              <a
                href="https://www.linkedin.com/company/thinksharp-foundation/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-white/10 rounded flex items-center justify-center hover:bg-white/25 transition-all"
              >
                <Linkedin className="h-3.5 w-3.5 text-white" />
              </a>

              <a
                href="https://www.youtube.com/channel/UC-4cDXLuwAThHXhNOazv5KA"
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-white/10 rounded flex items-center justify-center hover:bg-white/25 transition-all"
              >
                <Youtube className="h-3.5 w-3.5 text-white" />
              </a>

            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="max-w-6xl mx-auto mt-4 pt-2 border-t border-white/10 flex justify-between items-center">

          <p className="text-white/50 font-black text-[9px] uppercase tracking-[0.2em]">
            A ThinkSharp Foundation Initiative
          </p>

          <Link
            href="/admin"
            className="text-white/40 hover:text-white text-[9px] font-black uppercase tracking-widest border border-white/20 px-2 py-1 rounded transition-all"
          >
            Admin Access
          </Link>

        </div>
      </footer>
    </div>
  );
}
