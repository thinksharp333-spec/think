"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, UserCircle, LogIn, LogOut, ArrowRight, Sparkles, BookHeart, GraduationCap, LayoutDashboard } from "lucide-react";
import { BookCard } from "@/components/book-card";
import { useUser } from "@/hooks/useUser";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const { user } = useUser();
  const [visibleCount, setVisibleCount] = useState(12);
  const [paginatedBooks, setPaginatedBooks] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const isMobile = false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex flex-col font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-green-500 to-emerald-600 p-2 rounded-lg text-white shadow-md shadow-green-200">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-800 to-emerald-700">
              ThinkSharp
            </span>
          </div>

          {/* Nav Links - Right Aligned */}
          <nav className="flex items-center gap-2 md:gap-6">
            <Link href="https://www.thinksharpfoundation.org/about-us.php" target="_blank" className="hidden md:block text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">
              About ThinkSharp
            </Link>

            <div className="flex items-center gap-2">
              {user && user.id !== 'local-user' ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-full transition-colors flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <button
                    onClick={async () => {
                      if (supabase) {
                        await supabase.auth.signOut();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-full transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-full shadow-lg shadow-green-200 hover:shadow-green-300 transition-all flex items-center gap-2"
                  >
                    Start Learning <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-32">

          {/* Background Decor */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-green-200 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-100 rounded-full filter blur-3xl opacity-40"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">

            {/* Hero Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white text-green-700 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200 shadow-sm">
                <Sparkles className="w-3 h-3" />
                Empowering Education
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight">
                Learning that <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 filter drop-shadow-sm">comes alive.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-lg leading-relaxed">
                Access thousands of books, interactive lessons, and offline resources designed for students aged 4-17. Education for everyone, everywhere. Delivered by ThinkSharp.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={user && user.id !== 'local-user' ? "/dashboard" : "/login"}
                  className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                  {user && user.id !== 'local-user' ? (
                    <>
                      <LayoutDashboard className="w-5 h-5" />
                      Go to Dashboard
                    </>
                  ) : (
                    <>
                      <UserCircle className="w-5 h-5" />
                      Student Login
                    </>
                  )}
                </Link>
                <button className="px-8 py-4 bg-white text-green-700 font-bold rounded-xl border-2 border-green-100 hover:border-green-300 hover:bg-green-50 transition-all flex items-center justify-center gap-3 shadow-sm">
                  <BookHeart className="w-5 h-5" />
                  Explore Library
                </button>
              </div>

              <div className="flex items-center gap-8 pt-8 opacity-90">
                <div>
                  <p className="text-3xl font-bold text-slate-900">10k+</p>
                  <p className="text-sm text-slate-500 font-medium">Students</p>
                </div>
                <div className="w-px h-10 bg-green-200"></div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">50+</p>
                  <p className="text-sm text-slate-500 font-medium">Partner Schools</p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-emerald-300 rounded-3xl transform rotate-3 scale-105 opacity-30 blur-2xl"></div>
              <div className="relative bg-white/60 backdrop-blur-lg p-2 rounded-3xl shadow-2xl border border-white/50 transform transition-transform hover:scale-[1.01] duration-500">
                <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center relative border border-green-50">
                  {/* Abstract Educational Illustration Placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <GraduationCap className="w-96 h-96 text-green-900" />
                  </div>


                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'}`}>
                    {paginatedBooks?.map((book) => (
                      <BookCard
                        key={book.id}
                        id={book.id!}
                        title={book.title}
                        grade={book.grade}
                        pages={book.pages}
                        pdfUrl={book.pdfUrl}
                        coverUrl={book.coverUrl}
                      />
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => setVisibleCount(prev => prev + 12)}
                        className="bg-white text-gray-700 px-6 py-2 rounded-full shadow-sm border border-gray-100 font-medium hover:bg-gray-50 active:scale-95 transition-all"
                      >
                        Load More Books
                      </button>

                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-green-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-slate-400 font-medium">
            &copy; 2024 ThinkSharp Foundation. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-xs text-slate-400 hover:text-green-600 transition-colors flex items-center gap-1 group font-medium">
              <LogIn className="w-3 h-3 group-hover:text-green-600" />
              Admin Access
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
