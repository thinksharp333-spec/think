"use client";

import Link from "next/link";
import { BookOpen, LogIn, LogOut, Search, Star, ArrowRight, LayoutDashboard, Sparkles, Trophy, Zap } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const { user } = useUser();
  const isLoggedIn = user && user.id !== "local-user";

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
      bg: "bg-[#f0fdf4]",
      accent: "#22c55e",
    },
  ];

  return (
    <div className="page-shell" style={{ background: "var(--cream)" }}>

      {/* ── Sticky Navbar ─────────────────────────────────────────── */}
      <nav className="site-nav">
        <div className="flex items-center justify-between px-5 py-3 md:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e63329] border-2 border-white/20 shadow-lg">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <p className="comic-title text-base text-[#e63329]">Reading</p>
              <p className="comic-title text-base text-white -mt-1">Adventure</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 rounded-full bg-white/15 text-white text-sm font-black uppercase tracking-wide">Home</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 text-sm font-black uppercase tracking-wide transition-all">Books</Link>
            <Link href="/leaderboard" className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 text-sm font-black uppercase tracking-wide transition-all">My Adventure</Link>
            <a href="https://www.thinksharpfoundation.org/about-us.php" target="_blank" className="px-4 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 text-sm font-black uppercase tracking-wide transition-all">About Us</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 md:gap-3">
            <button className="text-white/70 hover:text-white p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-all">
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            {isLoggedIn ? (
              <div className="flex items-center gap-1 md:gap-2">
                <Link href="/dashboard" className="btn-red py-1.5 px-3 md:py-2 md:px-5 text-xs md:text-sm">
                  <LayoutDashboard className="h-4 w-4 md:mr-1 inline-block" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button onClick={async () => { if (supabase) { await supabase.auth.signOut(); window.location.reload(); } }}
                  className="text-white/60 hover:text-white px-2 py-1.5 md:px-3 md:py-2 rounded-full hover:bg-white/10 text-xs md:text-sm font-bold transition-all flex items-center gap-1">
                  <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Out</span>
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-red py-1.5 px-4 md:py-2.5 md:px-6 text-xs md:text-sm">
                <LogIn className="h-4 w-4 md:mr-1 inline-block" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "calc(100vh - 68px)", background: "var(--cream)" }}>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(230,51,41,0.08) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

        <div className="relative flex flex-col lg:flex-row items-stretch h-full">

          {/* LEFT: Hero copy */}
          <div className="flex-1 flex flex-col justify-center px-6 py-16 md:px-14 lg:px-20 xl:px-28">
            <div className="animate-pop-in" style={{ animationDelay: "0ms" }}>
              <span className="chip chip-red mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Story Powered Learning
              </span>
            </div>
            <h1 className="comic-title text-5xl leading-[1] text-[#111111] md:text-7xl xl:text-8xl animate-pop-in" style={{ animationDelay: "80ms" }}>
              Embark on<br />
              <span style={{ color: "var(--red)" }}>Your Reading</span><br />
              Adventure!
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-[#3a3a3a] max-w-lg font-bold animate-pop-in" style={{ animationDelay: "160ms" }}>
              Discover worlds, earn rewards, leave book reviews, and unlock the magic of stories with your school reading club.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-pop-in" style={{ animationDelay: "240ms" }}>
              <Link href={isLoggedIn ? "/dashboard" : "/login"} className="btn-red text-lg px-10 py-5">
                Start Reading <Star className="h-5 w-5 fill-white" />
              </Link>
              <Link href="/leaderboard" className="btn-outline text-base px-8 py-5">
                Reviews <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-10 flex gap-6 flex-wrap animate-pop-in" style={{ animationDelay: "320ms" }}>
              <div className="card-flat px-6 py-4">
                <p className="comic-title text-4xl" style={{ color: "var(--red)" }}>10K+</p>
                <p className="text-xs font-black uppercase tracking-wider text-[#555]">Young Readers</p>
              </div>
              <div className="card-flat px-6 py-4">
                <p className="comic-title text-4xl" style={{ color: "var(--red)" }}>700+</p>
                <p className="text-xs font-black uppercase tracking-wider text-[#555]">Books Available</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Monster mascot + floating cards */}
          <div className="flex-1 flex items-center justify-center relative py-10 lg:py-0 min-h-[440px]">
            {/* Floating card 1 - top left */}
            <div className="hidden lg:block absolute top-12 left-8 card-flat p-4 max-w-[160px] animate-float" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4" style={{ color: "var(--gold)" }} />
                <span className="font-black text-xs uppercase tracking-wide text-[#111]">Top Reader</span>
              </div>
              <p className="font-bold text-xs text-[#555]">Aanya scored 2400 pts this week!</p>
            </div>

            {/* Floating card 2 - bottom right */}
            <div className="hidden lg:block absolute bottom-16 right-6 card-flat p-4 max-w-[170px] animate-float-delay">
              <div className="flex items-center gap-1 mb-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-black text-sm text-[#111]">9.2/10</span>
              </div>
              <p className="font-bold text-xs text-[#555]">"The Glowing Library" — just reviewed!</p>
            </div>

            {/* Floating badge */}
            <div className="hidden sm:flex absolute top-8 right-10 star-burst w-16 h-16 items-center justify-center animate-wiggle" style={{ background: "var(--gold)" }}>
              <span className="text-[#111] font-black text-xs text-center leading-tight">NEW<br/>QUEST</span>
            </div>

            {/* The big monster SVG */}
            <div className="animate-float" style={{ animationDelay: "0.5s" }}>
              <svg width="100%" height="auto" viewBox="0 0 320 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: 320, display: "block", margin: "0 auto" }}>
                {/* Body */}
                <ellipse cx="160" cy="240" rx="105" ry="112" fill="#e63329" stroke="#111" strokeWidth="4"/>
                {/* Belly */}
                <ellipse cx="160" cy="260" rx="62" ry="70" fill="#ff8070"/>
                {/* Head */}
                <ellipse cx="160" cy="120" rx="88" ry="82" fill="#e63329" stroke="#111" strokeWidth="4"/>
                {/* Horn left */}
                <polygon points="100,52 82,8 120,48" fill="#c62020" stroke="#111" strokeWidth="3"/>
                {/* Horn right */}
                <polygon points="220,52 238,8 200,48" fill="#c62020" stroke="#111" strokeWidth="3"/>
                {/* Ears */}
                <ellipse cx="78" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3"/>
                <ellipse cx="242" cy="108" rx="18" ry="22" fill="#c62020" stroke="#111" strokeWidth="3"/>
                {/* Eyes white */}
                <ellipse cx="132" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3"/>
                <ellipse cx="188" cy="112" rx="22" ry="26" fill="white" stroke="#111" strokeWidth="3"/>
                {/* Pupils */}
                <circle cx="136" cy="114" r="11" fill="#111"/>
                <circle cx="192" cy="114" r="11" fill="#111"/>
                {/* Shine */}
                <circle cx="140" cy="109" r="4" fill="white"/>
                <circle cx="196" cy="109" r="4" fill="white"/>
                {/* Smile */}
                <path d="M130 147 Q160 168 190 147" stroke="#111" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
                {/* Teeth */}
                <rect x="148" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2"/>
                <rect x="162" y="148" width="10" height="12" rx="2" fill="white" stroke="#111" strokeWidth="2"/>
                {/* Left arm + hand */}
                <path d="M55 230 Q30 210 42 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <ellipse cx="42" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                {/* Right arm */}
                <path d="M265 230 Q290 210 278 260" stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <ellipse cx="278" cy="268" rx="20" ry="16" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                {/* Book */}
                <rect x="102" y="272" width="116" height="76" rx="8" fill="#fff4ba" stroke="#111" strokeWidth="3.5"/>
                <line x1="160" y1="272" x2="160" y2="348" stroke="#111" strokeWidth="2.5"/>
                {/* Book lines */}
                <line x1="112" y1="290" x2="156" y2="290" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="112" y1="302" x2="156" y2="302" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="112" y1="314" x2="156" y2="314" stroke="#e63329" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="112" y1="326" x2="148" y2="326" stroke="#e63329" strokeWidth="2" strokeLinecap="round"/>
                <line x1="165" y1="290" x2="207" y2="290" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="165" y1="302" x2="207" y2="302" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="165" y1="314" x2="207" y2="314" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round"/>
                {/* Feet */}
                <ellipse cx="120" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                <ellipse cx="200" cy="352" rx="30" ry="18" fill="#e63329" stroke="#111" strokeWidth="3.5"/>
                {/* Floating books around monster */}
                <rect x="20" y="170" width="28" height="36" rx="4" fill="#ff8070" stroke="#111" strokeWidth="2" transform="rotate(-15 34 188)"/>
                <rect x="272" y="150" width="28" height="36" rx="4" fill="#fff4ba" stroke="#111" strokeWidth="2" transform="rotate(12 286 168)"/>
                <rect x="40" y="300" width="22" height="28" rx="3" fill="#fde8e8" stroke="#111" strokeWidth="2" transform="rotate(20 51 314)"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-14 lg:px-20" style={{ background: "#fff" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="chip chip-red mb-4 mx-auto">
              <Zap className="h-3.5 w-3.5" /> How It Works
            </span>
            <h2 className="comic-title text-4xl md:text-6xl text-[#111]">Three Simple Steps</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((item, i) => (
              <div key={i} className={`step-card ${item.bg}`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className="absolute -top-5 -left-3 w-12 h-12 rounded-full border-[3px] border-[#111] flex items-center justify-center font-black text-xl text-white shadow-[0_6px_0_#111]"
                  style={{ background: item.accent }}>
                  {item.step}
                </div>
                <div className="text-6xl mb-5 mt-2">{item.emoji}</div>
                <h3 className="comic-title text-2xl text-[#111] uppercase mb-3">{item.title}</h3>
                <p className="font-bold text-[#3a3a3a] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Book ──────────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-14 lg:px-20" style={{ background: "var(--cream)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <span className="chip chip-red mx-auto">
              <Star className="h-3.5 w-3.5 fill-white" /> Featured Book of the Day
              <Star className="h-3.5 w-3.5 fill-white" />
            </span>
          </div>
          <div className="card p-0 overflow-hidden grid md:grid-cols-[280px_1fr]">
            {/* Book cover */}
            <div className="flex items-center justify-center p-10 md:p-8" style={{ background: "linear-gradient(160deg,#12263a 0%,#25476b 45%,#e84a3a 100%)" }}>
              <div className="text-center">
                <p className="comic-title text-3xl text-[#ffd75b] leading-tight">The Mystery</p>
                <p className="comic-title text-2xl text-[#fff6ed] leading-tight mt-1">of the Glowing Library</p>
                <div className="mt-8 inline-block bg-white/15 rounded-xl px-4 py-2 text-sm font-bold text-white">By Leo Lightwood</div>
              </div>
            </div>
            {/* Book info */}
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-4xl font-extrabold leading-tight text-[#111] md:text-5xl">
                The Mystery of the Glowing Library
              </h2>
              <p className="mt-4 text-lg font-bold leading-relaxed text-[#3a3a3a] max-w-xl">
                A thrilling tale of secret shelves, clever clues, and brave readers who discover friendship in the heart of a magical library.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                {isLoggedIn ? (
                  <button onClick={async () => { if (supabase) { await supabase.auth.signOut(); window.location.reload(); } }}
                    className="btn-outline text-sm px-6 py-4">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                ) : (
                  <>
                    <Link href="/signup" className="btn-outline text-sm px-6 py-4">
                      <ArrowRight className="h-4 w-4" /> Join the Club
                    </Link>
                    <Link href="/login" className="btn-outline text-sm px-6 py-4">
                      <LogIn className="h-4 w-4" /> Login
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="py-6 px-6 md:px-14" style={{ background: "var(--red)", borderTop: "3px solid var(--red-dark)" }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 max-w-6xl mx-auto">
          <div className="flex gap-6 text-sm font-black uppercase tracking-wide text-white/80">
            <Link href="/" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/admin" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-white/70 text-sm font-bold">&copy; 2024 Digi Library. All rights reserved.</p>
          <Link href="/admin" className="chip chip-dark text-xs">
            <LogIn className="h-3 w-3" /> Admin Access
          </Link>
        </div>
      </footer>
    </div>
  );
}
